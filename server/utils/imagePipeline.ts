import NodeCache from "node-cache";
import { createImageJob, updateImageJob, getImageJob } from "../jobs/imageJobs";
import { downloadImageBuffer } from "./downloadImage";
import { makeSafeDataUrl } from "./dataUrl";
import { dlog } from "./logger";

const imageCache = new NodeCache({ stdTTL: 60*60, checkperiod: 120 });

export async function startImageJob(detectedUrl?: string) {
  const job = createImageJob(detectedUrl);
  if (!detectedUrl) {
    updateImageJob(job.id, { state: "failed", error: "No detected URL" });
    return job;
  }

  (async () => {
    try {
      updateImageJob(job.id, { state: "loading", logs: [...(job.logs||[]), "loading"] });
      dlog("job:start", "job started", { jobId: job.id, detectedUrl });

    const res = await downloadImageRobust(detectedUrl);
    dlog("pipeline:downloaded", "Downloaded image", {
      bytes: res.bytes,
      mime: res.mime,
    });

    const dataUrl = safeDataUrlForBuffer(res.buffer, res.mime);
    if (dataUrl) {
      dlog("pipeline:done", "Returning data URL");
      return { type: "data", url: dataUrl, mime: res.mime, bytes: res.bytes };
    }

    const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    imageCache.set(id, { buffer: res.buffer, mime: res.mime });
    dlog("pipeline:proxy", "Stored image in cache for proxy", {
      id,
      bytes: res.bytes,
    });

    return { type: "proxy", url: `/api/image/${id}`, mime: res.mime, bytes: res.bytes };
  } catch (err) {
    dlog("pipeline:error", "Pipeline failed - will fallback to original url", {
      err: String(err),
    });
    return { type: "original", url: detectedUrl, error: String(err) };
  }
}

export function getImageCache() {
  return imageCache;
}
