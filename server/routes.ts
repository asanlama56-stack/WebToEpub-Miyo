import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { analyzeUrl, downloadChaptersParallel } from "./scraper";
import { generateOutput } from "./generator";
import { analyzeUrlSchema, startDownloadSchema, type BookMetadata, type DownloadStatusType } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { getImageCache } from "./pipeline/imagePipeline";
import { createImageJob, getImageJob } from "./jobs/imageJobs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyB4ilhZI-C6_J6-AADS0VONispc8IhTXls";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent";

const activeDownloads = new Map<string, { abort: boolean }>();
const generatedFiles = new Map<string, { buffer: Buffer; filename: string; mimeType: string }>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));

  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const parsed = analyzeUrlSchema.parse(req.body);
      const { url } = parsed;

      const job = await storage.createJob(url);
      await storage.updateJob(job.id, { status: "analyzing", progress: 0 });

      try {
        await storage.updateAnalysisProgress(job.id, 20);
        const { metadata, chapters } = await analyzeUrl(url);

        // Create image job for background validation
        const imageJob = createImageJob(metadata?.coverUrl);

        await storage.updateAnalysisProgress(job.id, 80);
        await storage.updateJobChapters(job.id, chapters);
        
        const updatedJob = await storage.updateJob(job.id, {
          metadata: metadata ? { ...metadata, imageJobId: imageJob.id } : undefined,
          status: "pending",
          selectedChapterIds: chapters.map((ch) => ch.id),
          progress: 100,
        });

        res.json({
          success: true,
          job: updatedJob,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Analysis failed";
        await storage.updateJob(job.id, {
          status: "error",
          error: errorMessage,
          progress: 0,
        });

        res.json({
          success: false,
          message: errorMessage,
          job: await storage.getJob(job.id),
        });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        const readable = fromZodError(error);
        res.status(400).json({ success: false, message: readable.message });
      } else {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ success: false, message });
      }
    }
  });

  app.post("/api/download", async (req: Request, res: Response) => {
    try {
      const parsed = startDownloadSchema.parse(req.body);
      const { jobId, selectedChapterIds, outputFormat, settings } = parsed;

      const job = await storage.getJob(jobId);
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }

      if (selectedChapterIds.length > 2000) {
        return res.status(400).json({ 
          success: false, 
          message: "Download limited to 2000 chapters maximum. This limit ensures stability on mobile devices. Please select fewer chapters." 
        });
      }

      if (req.body.metadata) {
        const metadataUpdates = req.body.metadata as Partial<BookMetadata>;
        await storage.updateJob(jobId, {
          metadata: { ...job.metadata!, ...metadataUpdates },
        });
      }

      await storage.updateJob(jobId, {
        selectedChapterIds,
        outputFormat,
        status: "downloading",
        progress: 0,
      });

      const downloadControl = { abort: false };
      activeDownloads.set(jobId, downloadControl);

      const chaptersToDownload = job.chapters.filter((ch) =>
        selectedChapterIds.includes(ch.id)
      );

      const concurrency = settings?.concurrentDownloads || 3;
      const delay = settings?.delayBetweenRequests || 500;
      const startTime = Date.now();
      let completedCount = 0;

      downloadChaptersParallel(
        chaptersToDownload,
        concurrency,
        delay,
        async (chapterId, status, content, wordCount, error) => {
          if (downloadControl.abort) return;

          const chapterStatus: DownloadStatusType = status === "downloading"
            ? "downloading"
            : status === "complete"
            ? "complete"
            : "error";

          await storage.updateChapterStatus(jobId, chapterId, chapterStatus, content, error);

          if (status === "complete" || status === "error") {
            completedCount++;
            const progress = (completedCount / chaptersToDownload.length) * 100;
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = completedCount / elapsed;
            const remaining = chaptersToDownload.length - completedCount;
            const eta = speed > 0 ? remaining / speed : 0;

            await storage.updateJob(jobId, {
              progress,
              downloadSpeed: Math.round(speed * 1000),
              eta: Math.round(eta),
            });
          }

          if (completedCount === chaptersToDownload.length) {
            await processAndGenerate(jobId, outputFormat);
          }
        }
      );

      res.json({ success: true, jobId });
    } catch (error) {
      if (error instanceof ZodError) {
        const readable = fromZodError(error);
        res.status(400).json({ success: false, message: readable.message });
      } else {
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ success: false, message });
      }
    }
  });

  async function processAndGenerate(jobId: string, outputFormat: "epub" | "pdf" | "html") {
    try {
      await storage.updateJob(jobId, { status: "processing" });

      const job = await storage.getJob(jobId);
      if (!job || !job.metadata) {
        throw new Error("Job or metadata not found");
      }

      const chaptersWithContent = job.chapters.filter(
        (ch) => job.selectedChapterIds.includes(ch.id) && ch.content
      );

      if (chaptersWithContent.length === 0) {
        throw new Error("No chapters with content available");
      }

      const result = await generateOutput(job.metadata, chaptersWithContent, outputFormat);

      generatedFiles.set(jobId, result);

      await storage.updateJob(jobId, {
        status: "complete",
        progress: 100,
        completedAt: Date.now(),
        outputPath: `/api/download-file/${jobId}`,
      });

      activeDownloads.delete(jobId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Generation failed";
      await storage.updateJob(jobId, {
        status: "error",
        error: errorMessage,
      });
      activeDownloads.delete(jobId);
    }
  }

  app.get("/api/jobs", async (_req: Request, res: Response) => {
    try {
      const jobs = await storage.getAllJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.get("/api/jobs/:id", async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  app.post("/api/jobs/:id/cancel", async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const control = activeDownloads.get(jobId);
      if (control) {
        control.abort = true;
        activeDownloads.delete(jobId);
      }

      await storage.updateJob(jobId, { status: "error", error: "Cancelled by user" });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to cancel job" });
    }
  });

  app.post("/api/jobs/clear-completed", async (_req: Request, res: Response) => {
    try {
      const jobs = await storage.getAllJobs();
      for (const job of jobs) {
        if (job.status === "complete" || job.status === "error") {
          generatedFiles.delete(job.id);
        }
      }
      await storage.clearCompletedJobs();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to clear jobs" });
    }
  });

  app.get("/api/download-file/:id", async (req: Request, res: Response) => {
    try {
      const jobId = req.params.id;
      const file = generatedFiles.get(jobId);

      if (!file) {
        return res.status(404).json({ error: "File not found or expired" });
      }

      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
      res.setHeader("Content-Length", file.buffer.length);
      res.send(file.buffer);
    } catch (error) {
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  const imageLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

  app.get("/api/image/:id", imageLimiter, (req: Request, res: Response) => {
    const id = req.params.id;
    const imageCache = getImageCache();
    const entry = imageCache.get<{ buffer: Buffer; mime: string }>(id);
    
    if (!entry) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.setHeader("Content-Type", entry.mime);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(entry.buffer);
  });

  app.get("/api/jobs/:id/image-status", (req: Request, res: Response) => {
    const imageJob = getImageJob(req.params.id);
    if (!imageJob) {
      return res.status(404).json({ error: "Image job not found" });
    }

    res.json({
      state: imageJob.state,
      finalUrl: imageJob.finalUrl,
      error: imageJob.error,
      logs: imageJob.logs,
      bytesDownloaded: imageJob.bytesDownloaded,
      dataUrlLength: imageJob.dataUrlLength,
      mimeType: imageJob.mimeType
    });
  });

  app.get("/api/debug/image-pipeline/:id", (req: Request, res: Response) => {
    const imageJob = getImageJob(req.params.id);
    if (!imageJob) {
      return res.status(404).json({ error: "Image job not found" });
    }
    res.json(imageJob);
  });

  // Proxy cached image endpoint
  app.get("/api/image/:id", (req: Request, res: Response) => {
    const imageCache = getImageCache();
    const proxyId = req.params.id;
    const entry = imageCache.get<{ buffer: Buffer; mime: string }>(proxyId);
    if (!entry) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.setHeader("Content-Type", entry.mime);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(entry.buffer);
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: "Message required" });
      }

      console.log("[CHAT] Received message:", message);

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      });

      console.log("[CHAT] Gemini response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CHAT] Gemini error:", errorText);
        return res.status(response.status).json({ error: "Gemini API error", details: errorText });
      }

      const data = await response.json();
      console.log("[CHAT] Gemini data:", JSON.stringify(data).substring(0, 200));
      
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from AI";
      res.json({ reply });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chat error";
      console.error("[CHAT] Error:", message);
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
