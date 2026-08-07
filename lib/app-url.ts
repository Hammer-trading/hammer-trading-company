export function normalizeAppUrl(value?: string | null) {
  const raw = value?.trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
  if (!raw) return null;

  const candidate = /^https?:\/\//i.test(raw)
    ? raw
    : raw === "localhost" || raw.startsWith("localhost:")
      ? `http://${raw}`
      : raw.includes(".")
        ? `https://${raw}`
        : null;

  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function getAppUrl(fallback = "http://localhost:3000") {
  const candidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
    fallback
  ];

  for (const candidate of candidates) {
    const normalized = normalizeAppUrl(candidate);
    if (normalized) return normalized;
  }

  return "http://localhost:3000";
}
