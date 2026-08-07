"use client";

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Card3D, AnimatedSection, GlassCard, FloatingElement, GradientOrb } from "./advanced-cards";
import { DynamicMedia } from "../storefront/dynamic-media";

export interface MediaItem {
  id: string;
  src: string;
  alt: string;
  title?: string;
  description?: string;
  type: "image" | "video";
  category?: string;
}

interface MediaGalleryProps {
  items: MediaItem[];
  className?: string;
  layout?: "grid" | "masonry" | "carousel" | "showcase";
  columns?: number;
  gap?: number;
  showTitles?: boolean;
  enableZoom?: boolean;
  autoplay?: boolean;
  autoplayInterval?: number;
}

export function MediaGallery({
  items,
  className,
  layout = "grid",
  columns = 3,
  gap = 4,
  showTitles = true,
  enableZoom = true,
  autoplay = false,
  autoplayInterval = 5000,
}: MediaGalleryProps) {
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (autoplay && items.length > 1) {
      const interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % items.length);
      }, autoplayInterval);
      return () => clearInterval(interval);
    }
  }, [autoplay, autoplayInterval, items.length]);

  const layouts = {
    grid: (
      <div 
        className={cn("grid gap-4", className)}
        style={{ 
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: `${gap * 0.25}rem`
        }}
      >
        {items.map((item, index) => (
          <AnimatedSection key={item.id} delay={index * 0.1}>
            <MediaCard
              item={item}
              onClick={() => setSelectedItem(item)}
              showTitle={showTitles}
              enableZoom={enableZoom}
            />
          </AnimatedSection>
        ))}
      </div>
    ),
    masonry: (
      <div className={cn("columns-1 gap-4 sm:columns-2 lg:columns-3", className)}>
        {items.map((item, index) => (
          <div key={item.id} className="mb-4 break-inside-avoid">
            <AnimatedSection delay={index * 0.1}>
              <MediaCard
                item={item}
                onClick={() => setSelectedItem(item)}
                showTitle={showTitles}
                enableZoom={enableZoom}
              />
            </AnimatedSection>
          </div>
        ))}
      </div>
    ),
    carousel: (
      <div className={cn("relative overflow-hidden rounded-2xl", className)}>
        <motion.div
          className="flex"
          animate={{ x: `-${activeIndex * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {items.map((item) => (
            <div key={item.id} className="min-w-full h-[500px]">
              <MediaCard
                item={item}
                onClick={() => setSelectedItem(item)}
                showTitle={showTitles}
                enableZoom={enableZoom}
                className="h-full"
              />
            </div>
          ))}
        </motion.div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === activeIndex ? "bg-white w-6" : "bg-white/50"
              )}
            />
          ))}
        </div>
      </div>
    ),
    showcase: (
      <div className={cn("space-y-8", className)}>
        <div className="relative h-[600px] rounded-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={items[activeIndex]?.id}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0"
            >
              <DynamicMedia
                src={items[activeIndex]?.src}
                alt={items[activeIndex]?.alt || ""}
                className="object-cover"
                priority
              />
              {showTitles && items[activeIndex]?.title && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-8 pt-32">
                  <h3 className="text-3xl font-bold text-white">{items[activeIndex]?.title}</h3>
                  {items[activeIndex]?.description && (
                    <p className="mt-2 text-white/80">{items[activeIndex]?.description}</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden transition-all",
                index === activeIndex ? "ring-2 ring-brand ring-offset-2" : "opacity-60 hover:opacity-100"
              )}
            >
              <DynamicMedia
                src={item.src}
                alt={item.alt}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    ),
  };

  return (
    <>
      {layouts[layout]}
      
      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl max-h-[90vh] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute -top-12 right-0 text-white/80 hover:text-white text-2xl"
              >
                ✕
              </button>
              <div className="relative w-full h-full">
                <DynamicMedia
                  src={selectedItem.src}
                  alt={selectedItem.alt}
                  className="rounded-lg"
                  controls={selectedItem.type === "video"}
                  priority
                />
                {selectedItem.title && (
                  <div className="mt-4 text-center">
                    <h3 className="text-2xl font-bold text-white">{selectedItem.title}</h3>
                    {selectedItem.description && (
                      <p className="mt-2 text-white/70">{selectedItem.description}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface MediaCardProps {
  item: MediaItem;
  onClick?: () => void;
  showTitle?: boolean;
  enableZoom?: boolean;
  className?: string;
}

function MediaCard({ item, onClick, showTitle = true, enableZoom = true, className }: MediaCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15 });
  
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-10, 10]);
  const scale = useTransform(mouseX, [-0.5, 0.5], enableZoom ? [1, 1.05] : [1, 1]);
  const brightness = useTransform(mouseX, [-0.5, 0.5], enableZoom ? [0.9, 1.1] : [1, 1]);

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
      className={cn("group relative cursor-pointer", className)}
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 shadow-lg"
        style={{
          rotateX,
          rotateY,
          scale,
          filter: `brightness(${brightness})`,
          transformStyle: "preserve-3d"
        }}
      >
        <div className="aspect-[4/3] relative">
          <DynamicMedia
            src={item.src}
            alt={item.alt}
            className="transition-transform duration-500 group-hover:scale-110"
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Play button for videos */}
          {item.type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center border-2 border-white/50">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
          
          {/* Category badge */}
          {item.category && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-brand text-white text-xs font-semibold uppercase tracking-wide">
              {item.category}
            </div>
          )}
        </div>
        
        {/* Title section */}
        {showTitle && (item.title || item.description) && (
          <motion.div
            className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
          >
            {item.title && (
              <h3 className="text-lg font-bold text-white drop-shadow-lg">{item.title}</h3>
            )}
            {item.description && (
              <p className="text-sm text-white/90 line-clamp-2 mt-1">{item.description}</p>
            )}
          </motion.div>
        )}
        
        {/* Hover glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
        </div>
      </motion.div>
    </motion.div>
  );
}

// Hero Media Section with Parallax
interface MediaHeroProps {
  backgroundImage: string;
  title: string;
  subtitle?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  parallaxIntensity?: number;
}

export function MediaHero({
  backgroundImage,
  title,
  subtitle,
  overlayColor = "#000000",
  overlayOpacity = 0.5,
  parallaxIntensity = 0.3,
}: MediaHeroProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const y = useTransform(scrollY, [0, 500], [0, parallaxIntensity * 500]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative h-[80vh] min-h-[600px] overflow-hidden">
      {/* Background with parallax */}
      <motion.div
        className="absolute inset-0"
        style={{ y }}
      >
        <Image
          src={backgroundImage}
          alt=""
          fill
          priority
          className="object-cover"
        />
      </motion.div>
      
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: overlayColor,
          opacity: overlayOpacity
        }}
      />
      
      {/* Content */}
      <motion.div
        className="relative z-10 h-full flex items-center justify-center text-center px-4"
        style={{ opacity }}
      >
        <div className="max-w-4xl mx-auto">
          <FloatingElement duration={4} amplitude={15}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white uppercase leading-[0.85] drop-shadow-2xl">
              {title}
            </h1>
          </FloatingElement>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-6 text-xl md:text-2xl text-white/90 max-w-2xl mx-auto"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </motion.div>
      
      {/* Gradient orbs */}
      <GradientOrb color="#d51f2c" size={400} blur={150} className="-bottom-20 -left-20" />
      <GradientOrb color="#1a56db" size={300} blur={120} className="-top-20 -right-20" />
    </section>
  );
}

// Gallery Grid with Filters
interface FilteredGalleryProps extends MediaGalleryProps {
  categories: string[];
  onFilterChange?: (category: string) => void;
}

export function FilteredGallery({
  items,
  categories,
  onFilterChange,
  ...galleryProps
}: FilteredGalleryProps) {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredItems = activeCategory === "all"
    ? items
    : items.filter(item => item.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Filter buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={() => {
            setActiveCategory("all");
            onFilterChange?.("all");
          }}
          className={cn(
            "px-6 py-2 rounded-full font-medium transition-all",
            activeCategory === "all"
              ? "bg-brand text-white shadow-lg shadow-brand/30"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => {
              setActiveCategory(category);
              onFilterChange?.(category);
            }}
            className={cn(
              "px-6 py-2 rounded-full font-medium capitalize transition-all",
              activeCategory === category
                ? "bg-brand text-white shadow-lg shadow-brand/30"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {category}
          </button>
        ))}
      </div>
      
      {/* Gallery */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <MediaGallery items={filteredItems} {...galleryProps} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Re-export MediaItem type is already exported above
