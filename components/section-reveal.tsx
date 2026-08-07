"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.994 },
  show: { opacity: 1, y: 0, scale: 1 }
};

const staggerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.03
    }
  }
};

const slowStaggerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.11,
      delayChildren: 0.08
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1 }
};

const topFlowItemVariants: Variants = {
  hidden: { opacity: 0, y: -34, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1 }
};

export function SectionReveal({ children, className = "", delay = 0, id }: { children: ReactNode; className?: string; delay?: number; id?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      id={id}
      className={cn("content-auto-section", className)}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={{ once: true, margin: "-48px 0px" }}
      variants={revealVariants}
      transition={{ duration: reduceMotion ? 0 : 0.46, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}

export function StaggerReveal({ children, className = "", slow = false }: { children: ReactNode; className?: string; slow?: boolean }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn("content-auto-section", className)}
      initial={reduceMotion ? false : "hidden"}
      whileInView={reduceMotion ? undefined : "show"}
      viewport={{ once: true, margin: "-48px 0px" }}
      variants={slow ? slowStaggerVariants : staggerVariants}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
  from = "bottom",
  slow = false
}: {
  children: ReactNode;
  className?: string;
  from?: "top" | "bottom";
  slow?: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={from === "top" ? topFlowItemVariants : itemVariants}
      transition={{ duration: reduceMotion ? 0 : slow ? 0.68 : 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
