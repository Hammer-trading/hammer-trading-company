// Advanced 3D Card Component with Framer Motion and Glassmorphism
"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Card3DProps {
  children: ReactNode;
  className?: string;
  glareEnabled?: boolean;
  rotateIntensity?: number;
  scaleOnHover?: boolean;
}

export function Card3D({ 
  children, 
  className, 
  glareEnabled = true,
  rotateIntensity = 15,
  scaleOnHover = true 
}: Card3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15 });
  
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [rotateIntensity, -rotateIntensity]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-rotateIntensity, rotateIntensity]);
  const scale = useTransform(mouseX, [-0.5, 0.5], scaleOnHover ? [1, 1.05] : [1, 1]);
  const opacity = useTransform(mouseX, [-0.5, 0.5], glareEnabled ? [0.7, 1] : [1, 1]);
  
  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const centerX = rect.left + width / 2;
    const centerY = rect.top + height / 2;
    const mouseXPos = event.clientX - centerX;
    const mouseYPos = event.clientY - centerY;
    const normalizedX = mouseXPos / (width / 2);
    const normalizedY = mouseYPos / (height / 2);
    x.set(normalizedX);
    y.set(normalizedY);
  }
  
  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }
  
  return (
    <motion.div
      ref={ref}
      className={cn("relative preserve-3d", className)}
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative h-full w-full overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 shadow-xl"
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: "preserve-3d"
        }}
      >
        {glareEnabled && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-white/40 via-transparent to-transparent"
            style={{ opacity }}
          />
        )}
        <div className="relative z-0 h-full">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Animated Section Component with Scroll-triggered Animations
interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  animation?: "fade-up" | "fade-in" | "scale-up" | "slide-left" | "slide-right";
  delay?: number;
  threshold?: number;
}

export function AnimatedSection({
  children,
  className,
  animation = "fade-up",
  delay = 0,
  threshold = 0.1
}: AnimatedSectionProps) {
  const variants = {
    hidden: {
      opacity: 0,
      y: animation === "fade-up" ? 60 : 0,
      x: animation === "slide-left" ? -60 : animation === "slide-right" ? 60 : 0,
      scale: animation === "scale-up" ? 0.9 : 1
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        delay,
        ease: [0.25, 0.1, 0.25, 1]
      }
    }
  };
  
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

// Glassmorphic Card Component
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "light" | "dark" | "color";
  intensity?: "soft" | "medium" | "strong";
}

export function GlassCard({ 
  children, 
  className, 
  variant = "light",
  intensity = "medium"
}: GlassCardProps) {
  const variants = {
    light: {
      soft: "bg-white/40 backdrop-blur-md border-white/30",
      medium: "bg-white/60 backdrop-blur-lg border-white/40",
      strong: "bg-white/80 backdrop-blur-xl border-white/50"
    },
    dark: {
      soft: "bg-slate-900/40 backdrop-blur-md border-slate-700/30",
      medium: "bg-slate-900/60 backdrop-blur-lg border-slate-700/40",
      strong: "bg-slate-900/80 backdrop-blur-xl border-slate-700/50"
    },
    color: {
      soft: "bg-brand/20 backdrop-blur-md border-brand/30",
      medium: "bg-brand/30 backdrop-blur-lg border-brand/40",
      strong: "bg-brand/40 backdrop-blur-xl border-brand/50"
    }
  };
  
  return (
    <div className={cn(
      "rounded-2xl border shadow-lg",
      variants[variant][intensity],
      className
    )}>
      {children}
    </div>
  );
}

// Floating Animation Component
export function FloatingElement({ 
  children, 
  className,
  duration = 3,
  amplitude = 10
}: { 
  children: ReactNode; 
  className?: string;
  duration?: number;
  amplitude?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -amplitude, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {children}
    </motion.div>
  );
}

// Gradient Orb Background Component
export function GradientOrb({ 
  className,
  color = "#d51f2c",
  size = 300,
  blur = 100
}: { 
  className?: string;
  color?: string;
  size?: number;
  blur?: number;
}) {
  return (
    <motion.div
      className={cn("absolute rounded-full pointer-events-none", className)}
      style={{
        width: size,
        height: size,
        background: color,
        filter: `blur(${blur}px)`,
        opacity: 0.3
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3]
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
}
