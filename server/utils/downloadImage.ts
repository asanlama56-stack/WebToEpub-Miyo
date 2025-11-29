import axios from "axios";
import { fileTypeFromBuffer } from "file-type";
import { dlog } from "./logger";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function downloadImageRobust(url: string) {
  const maxAttempts = 4;
  let attempt = 0;
  let lastErr: any = null;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      dlog("download:start", `Attempt ${attempt} - GET ${url}`);
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 20000,
        maxRedirects: 6,
        validateStatus: (s) => s >= 200 && s < 400,
        headers: {
          "User-Agent": "WebToBook/1.0 (+https://myapp.example)",
          Accept: "image/*,*/*;q=0.8",
        },
      });

      const buffer: Buffer = Buffer.from(res.data);
      const receivedBytes = buffer.length;
      const headerLength = res.headers["content-length"]
        ? parseInt(res.headers["content-length"], 10)
        : null;

      dlog("download:got", "HTTP status and bytes", {
        status: res.status,
        headerContentLength: headerLength,
        receivedBytes,
      });

      if (headerLength && Math.abs(headerLength - receivedBytes) > 1024) {
        dlog("download:warning", "Content-Length mismatch", {
          headerLength,
          receivedBytes,
        });
      }

      const ft = await fileTypeFromBuffer(buffer);
      const mime = ft?.mime || res.headers["content-type"] || "application/octet-stream";
      dlog("download:filetype", "Detected MIME", { mime, ext: ft?.ext || null });

      if (!mime.startsWith("image/")) {
        throw new Error(`Not an image: detected mime=${mime}`);
      }

      return {
        buffer,
        mime,
        bytes: receivedBytes,
        ext: ft?.ext || mime.split("/")[1],
      };
    } catch (err) {
      lastErr = err;
      dlog("download:error", `Attempt ${attempt} failed`, {
        err: String(err),
      });
      const backoff = 200 * Math.pow(2, attempt);
      await sleep(backoff);
      continue;
    }
  }
  dlog("download:fail", "All attempts failed", {
    lastErr: String(lastErr),
  });
  throw lastErr;
}
