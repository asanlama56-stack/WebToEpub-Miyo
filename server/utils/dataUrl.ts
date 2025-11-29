import { dlog } from "./logger";

export function safeDataUrlForBuffer(
  buffer: Buffer,
  mime: string,
  sizeLimitBytes = 1.5 * 1024 * 1024
) {
  const bytes = buffer.length;
  dlog("dataurl:start", "Creating data URL", {
    mime,
    bytes,
    sizeLimitBytes,
  });

  if (bytes === 0) {
    dlog("dataurl:error", "Buffer empty");
    return null;
  }

  if (bytes > sizeLimitBytes) {
    dlog("dataurl:decline", "Buffer too large for data URL, will fallback to proxy", {
      bytes,
    });
    return null;
  }

  const base64 = buffer.toString("base64");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64.slice(-4)) && base64.length % 4 !== 0) {
    dlog("dataurl:error", "Base64 looks malformed (sanity check).");
    return null;
  }

  const dataUrl = `data:${mime};base64,${base64}`;
  dlog("dataurl:ok", "Data URL created", { finalLength: dataUrl.length });
  return dataUrl;
}
