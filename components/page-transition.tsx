"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useSpatialStorefront } from "@/components/storefront/use-spatial-storefront";

export function PageTransition({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const spatialTheme = useSpatialStorefront();
  const initial = spatialTheme === "foundry3d"
    ? { opacity: 0, y: 18, scale: 0.994 }
    : spatialTheme === "axonometric"
      ? { opacity: 0, x: 16, scale: 0.996 }
      : spatialTheme === "prism3d"
        ? { opacity: 0, y: 24, scale: 1 }
        : { opacity: 0, y: 10, scale: 0.998 };

  return (
      <motion.div
        key={pathname}
        className={`premium-motion-surface interface-page-transition ${spatialTheme || "standard"} relative z-10 pt-[96px] xl:pt-[140px]`}
        initial={reduceMotion ? false : initial}
        animate={reduceMotion ? undefined : { opacity: 1, x: 0, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : spatialTheme ? 0.48 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[45] h-0.5 origin-left bg-gradient-to-r from-red-700 via-orange-500 to-slate-950"
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={reduceMotion ? undefined : { scaleX: 1 }}
          transition={{ duration: reduceMotion ? 0 : 0.38, ease: "easeOut" }}
        />
        {children}
      </motion.div>
  );
}
