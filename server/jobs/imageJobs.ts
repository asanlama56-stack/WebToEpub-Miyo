import { randomUUID } from "crypto";

export type ImageState = "pending" | "loading" | "success" | "failed";

export interface ImageJob {
  id: string;
  detectedUrl?: string;
  finalUrl?: string;
  state: ImageState;
  error?: string;
  bytesDownloaded?: number;
  mimeType?: string;
  dataUrlLength?: number;
  logs: string[];
}

const imageJobs = new Map<string, ImageJob>();

export function createImageJob(detectedUrl: string | undefined): ImageJob {
  const job: ImageJob = {
    id: randomUUID(),
    detectedUrl,
    state: detectedUrl ? "pending" : "failed",
    logs: []
  };
  imageJobs.set(job.id, job);
  return job;
}

export function getImageJob(id: string) {
  return imageJobs.get(id);
}

export function updateImageJob(id: string, updates: Partial<ImageJob>) {
  const job = imageJobs.get(id);
  if (!job) return;
  Object.assign(job, updates);
}
