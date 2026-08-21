"use client";

import { useEffect, useState } from "react";

export type DeviceTier = "high" | "medium" | "low" | "none";

export type DeviceProfile = {
  tier: DeviceTier;
  isTouch: boolean;
  isDesktop: boolean;
  webglSupported: boolean;
  saveData: boolean;
};

function detectWebGL(): boolean {
  try {
    if (typeof window === "undefined" || !window.WebGLRenderingContext) return false;
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function detect(): DeviceProfile {
  const navigatorWithHints = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const memory = navigatorWithHints.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const saveData = Boolean(navigatorWithHints.connection?.saveData);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const width = window.innerWidth;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const isDesktop = !isTouch && window.matchMedia("(pointer: fine)").matches;
  const webglSupported = detectWebGL();

  let tier: DeviceTier;
  if (!webglSupported || reducedMotion || saveData || document.hidden) {
    tier = "none";
  } else if (isDesktop && memory >= 4 && cores >= 4 && width >= 1024) {
    tier = "high";
  } else if (memory >= 4 && cores >= 4) {
    tier = "medium";
  } else if (memory >= 2) {
    tier = "medium";
  } else {
    tier = "low";
  }

  return { tier, isTouch, isDesktop, webglSupported, saveData };
}

/**
 * Detects the device's 3D capability tier so components can render the
 * right quality level on every device:
 * - high   → full WebGL (desktop: shadows/auto-rotate allowed, dpr up to 2)
 * - medium → WebGL on touch devices (flagship phones/tablets): dpr 1, light scene
 * - low    → minimal WebGL for budget phones: lowest dpr, demand-only frames
 * - none   → no WebGL / reduced-motion / data-saver: static fallback only
 */
export function useDeviceTier(): DeviceProfile {
  const [profile, setProfile] = useState<DeviceProfile>(() => {
    if (typeof window === "undefined") {
      return { tier: "high", isTouch: false, isDesktop: true, webglSupported: true, saveData: false };
    }
    return detect();
  });

  useEffect(() => {
    const sync = () => setProfile(detect());
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("visibilitychange", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("visibilitychange", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return profile;
}
