let databaseOfflineUntil = 0;

export function localFallbackEnabled() {
  return process.env.NODE_ENV !== "production"
    && (process.env.ENABLE_LOCAL_FALLBACK_DATA === "true" || process.env.FORCE_FALLBACK_DATA === "true");
}

export function assertLocalFallbackEnabled() {
  if (!localFallbackEnabled()) {
    throw new Error("Local fallback data is disabled. Connect PostgreSQL and retry.");
  }
}

export function markDatabaseOffline(durationMs = 15000) {
  databaseOfflineUntil = Date.now() + durationMs;
}

export function isDatabaseTemporarilyOffline() {
  return localFallbackEnabled() && (process.env.FORCE_FALLBACK_DATA === "true" || Date.now() < databaseOfflineUntil);
}

function databaseTimeout<T>(operation: () => Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Database request timed out.")), timeoutMs);
      })
    ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export function isTransientDatabaseError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : String(error);
  return ["P1001", "P1002", "P1008", "P1017", "40001", "40P01", "57P01", "ECONNRESET", "ETIMEDOUT"].includes(code)
    || /timed out|timeout|connection (?:closed|reset|refused)|can't reach database|server closed the connection|terminating connection/i.test(message);
}

function databaseFailure(error: unknown) {
  if (!localFallbackEnabled()) throw error;
  markDatabaseOffline();
  return null;
}

export async function tryDatabase<T>(operation: () => Promise<T>, timeoutMs = 800) {
  if (isDatabaseTemporarilyOffline()) return null;
  try {
    return await databaseTimeout(operation, timeoutMs);
  } catch (error) {
    return databaseFailure(error);
  }
}

export async function tryDatabaseRead<T>(operation: () => Promise<T>, timeoutMs = 5_000, maxAttempts = 2) {
  if (isDatabaseTemporarilyOffline()) return null;
  let lastError: unknown;

  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
    try {
      return await databaseTimeout(operation, timeoutMs);
    } catch (error) {
      lastError = error;
      if (!isTransientDatabaseError(error) || attempt >= maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
    }
  }

  if (isTransientDatabaseError(lastError)) {
    if (localFallbackEnabled()) markDatabaseOffline();
    return null;
  }
  return databaseFailure(lastError);
}
