import "server-only";

const allowedImageTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export function decodeDataImage(value: string) {
  if (value.length > 5_000_000) return null;
  const match = value.match(/^data:([^;,]+)(;base64)?,(.*)$/);
  if (!match) return null;
  const contentType = match[1].toLowerCase();
  if (!allowedImageTypes.has(contentType)) return null;
  try {
    const payload = match[3] || "";
    const body = match[2] ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload));
    if (!body.length || body.length > 4_000_000) return null;
    return { body, contentType };
  } catch {
    return null;
  }
}

export const storedImageHeaders = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  "X-Content-Type-Options": "nosniff"
} as const;
