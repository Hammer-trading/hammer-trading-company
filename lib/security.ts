import { getAppUrl } from "@/lib/app-url";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export function sameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const requestOrigin = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const appOrigin = getAppUrl(requestOrigin);
  const vercelOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  return [requestOrigin, forwardedOrigin, appOrigin, vercelOrigin].filter(Boolean).includes(origin);
}

export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  if (attempts.size > 10_000) {
    for (const [attemptKey, value] of attempts) {
      if (value.resetAt < now) attempts.delete(attemptKey);
    }
  }
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}
