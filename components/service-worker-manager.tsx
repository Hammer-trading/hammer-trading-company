"use client";

import { useEffect } from "react";

export function ServiceWorkerManager() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;

    const register = async () => {
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.filter((key) => key.startsWith("hammer-trading-company-")).map((key) => caches.delete(key)));
        }
        if (cancelled) return;
        const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
        if (!cancelled) await registration.update();
      } catch {
        // The storefront remains fully usable when PWA registration is unavailable.
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}
