export type ClientSession = {
  id: string;
  role: string;
  isAdmin: boolean;
};

const AUTH_CHANGED_EVENT = "hammer:auth-changed";

export function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function onAuthChanged(listener: () => void) {
  window.addEventListener(AUTH_CHANGED_EVENT, listener);
  return () => window.removeEventListener(AUTH_CHANGED_EVENT, listener);
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function waitForSession(
  predicate: (session: ClientSession | null) => boolean,
  timeoutMs = 8_000
) {
  const deadline = Date.now() + timeoutMs;
  do {
    try {
      const response = await fetchWithTimeout("/api/auth/session", { cache: "no-store" }, 4_000);
      if (response.ok) {
        const payload = await response.json() as { user?: ClientSession | null };
        const session = payload.user || null;
        if (predicate(session)) return session;
      }
    } catch {
      // Brief database or network delays are retried until the deadline.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 180));
  } while (Date.now() < deadline);
  return null;
}

export async function waitForSignedOut(timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  do {
    try {
      const response = await fetchWithTimeout("/api/auth/session", { cache: "no-store" }, 4_000);
      if (response.ok) {
        const payload = await response.json() as { user?: ClientSession | null };
        if (!payload.user) return true;
      }
    } catch {
      // Brief database or network delays are retried until the deadline.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 180));
  } while (Date.now() < deadline);
  return false;
}
