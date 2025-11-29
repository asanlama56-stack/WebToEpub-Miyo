import { dlog } from "./logger";
import { downloadImageRobust } from "./downloadImage";
import { safeDataUrlForBuffer } from "./dataUrl";
import NodeCache from "node-cache";

const imageCache = new NodeCache({ stdTTL: 60 * 60 });

export async function produceCoverForMetadata(detectedUrl: string) {
  try {
    dlog("pipeline:start", "Starting cover pipeline", { detectedUrl });

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
