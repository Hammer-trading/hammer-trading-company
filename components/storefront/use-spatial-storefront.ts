"use client";

import { useEffect, useState } from "react";

export const SPATIAL_STOREFRONT_THEMES = ["foundry3d", "axonometric", "prism3d"] as const;

export type SpatialStorefrontTheme = (typeof SPATIAL_STOREFRONT_THEMES)[number];

function readSpatialTheme(): SpatialStorefrontTheme | null {
  if (typeof document === "undefined") return null;
  const value = document.documentElement.dataset.storeDesign;
  return SPATIAL_STOREFRONT_THEMES.includes(value as SpatialStorefrontTheme)
    ? value as SpatialStorefrontTheme
    : null;
}

export function useSpatialStorefront() {
  const [theme, setTheme] = useState<SpatialStorefrontTheme | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const sync = () => setTheme(readSpatialTheme());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(html, { attributes: true, attributeFilter: ["data-store-design"] });
    window.addEventListener("hammer:store-design", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("hammer:store-design", sync);
    };
  }, []);

  return theme;
}
