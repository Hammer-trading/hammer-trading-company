"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";

export function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const smallScreen = window.matchMedia("(max-width: 767px)");
    const isAdmin = pathname?.startsWith("/admin");

    if (isAdmin || smallScreen.matches) return;
    if (reduceMotion.matches) return;

    let active = true;
    let lenis: Lenis | undefined;

    void import("lenis").then(({ default: LenisConstructor }) => {
      if (!active) return;
      lenis = new LenisConstructor({
        anchors: { offset: window.innerWidth >= 1280 ? -152 : -108, duration: 0.42 },
        autoRaf: true,
        duration: 0.48,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        smoothWheel: true,
        syncTouch: false,
        touchMultiplier: 1,
        wheelMultiplier: 1.02,
        stopInertiaOnNavigate: true,
        prevent: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return Boolean(
            node.closest(
              "input, textarea, select, [role='dialog'], [data-lenis-prevent], [class*='overflow-y-auto'], [class*='overflow-auto']"
            )
          );
        }
      });
      lenis.scrollTo(0, { immediate: true });
    });

    return () => {
      active = false;
      lenis?.destroy();
    };
  }, [pathname]);

  return <>{children}</>;
}
