"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { MediaGallery, FilteredGallery, MediaHero } from "./media-gallery";
import type { MediaItem } from "./media-gallery";

interface ThemePreset {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    cardBg: string;
    textPrimary: string;
    textSecondary: string;
  };
  borderRadius: string;
  shadowIntensity: "soft" | "medium" | "strong";
  animationSpeed: "slow" | "normal" | "fast";
}

const themePresets: ThemePreset[] = [
  {
    id: "industrial",
    name: "Industrial",
    colors: {
      primary: "#d51f2c",
      secondary: "#1a1a1a",
      accent: "#f59e0b",
      background: "#0a0a0a",
      cardBg: "#1a1a1a",
      textPrimary: "#ffffff",
      textSecondary: "#a0a0a0",
    },
    borderRadius: "rounded-lg",
    shadowIntensity: "strong",
    animationSpeed: "normal",
  },
  {
    id: "minimal",
    name: "Minimal White",
    colors: {
      primary: "#000000",
      secondary: "#737373",
      accent: "#2563eb",
      background: "#ffffff",
      cardBg: "#fafafa",
      textPrimary: "#171717",
      textSecondary: "#525252",
    },
    borderRadius: "rounded-xl",
    shadowIntensity: "soft",
    animationSpeed: "slow",
  },
  {
    id: "ocean",
    name: "Ocean Depth",
    colors: {
      primary: "#0ea5e9",
      secondary: "#0c4a6e",
      accent: "#f472b6",
      background: "#082f49",
      cardBg: "#0e7490",
      textPrimary: "#f0f9ff",
      textSecondary: "#bae6fd",
    },
    borderRadius: "rounded-2xl",
    shadowIntensity: "medium",
    animationSpeed: "slow",
  },
  {
    id: "sunset",
    name: "Sunset Glow",
    colors: {
      primary: "#f97316",
      secondary: "#7c2d12",
      accent: "#eab308",
      background: "#1c1917",
      cardBg: "#292524",
      textPrimary: "#fef3c7",
      textSecondary: "#fde68a",
    },
    borderRadius: "rounded-full",
    shadowIntensity: "medium",
    animationSpeed: "normal",
  },
  {
    id: "forest",
    name: "Forest Green",
    colors: {
      primary: "#22c55e",
      secondary: "#14532d",
      accent: "#a3e635",
      background: "#052e16",
      cardBg: "#166534",
      textPrimary: "#f0fdf4",
      textSecondary: "#bbf7d0",
    },
    borderRadius: "rounded-lg",
    shadowIntensity: "soft",
    animationSpeed: "slow",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    colors: {
      primary: "#ec4899",
      secondary: "#7c3aed",
      accent: "#06b6d4",
      background: "#0f0f1a",
      cardBg: "#1a1a2e",
      textPrimary: "#ffffff",
      textSecondary: "#c4b5fd",
    },
    borderRadius: "rounded-none",
    shadowIntensity: "strong",
    animationSpeed: "fast",
  },
];

interface MediaThemeStudioProps {
  initialItems?: MediaItem[];
  showAdminControls?: boolean;
  onThemeChange?: (theme: ThemePreset) => void;
}

export function MediaThemeStudio({ 
  initialItems = [], 
  showAdminControls = true,
  onThemeChange 
}: MediaThemeStudioProps) {
  const [activeTheme, setActiveTheme] = useState<ThemePreset>(themePresets[0]);
  const [activeLayout, setActiveLayout] = useState<"grid" | "masonry" | "carousel" | "showcase">("masonry");
  const [columns, setColumns] = useState(3);
  const [showFilters, setShowFilters] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Sample media items if none provided
  const sampleItems: MediaItem[] = useMemo(() => initialItems.length > 0 ? initialItems : [
    {
      id: "1",
      src: "/brand/workshop-hero.webp",
      alt: "Workshop scene",
      title: "Workshop Setup",
      description: "Professional hardware installation workspace",
      type: "image",
      category: "workspace",
    },
    {
      id: "2",
      src: "/brand/htc-logo.png",
      alt: "HTC Logo",
      title: "Brand Identity",
      description: "Hammer Trading Company branding",
      type: "image",
      category: "branding",
    },
  ], [initialItems]);

  useEffect(() => {
    const uniqueCategories = Array.from(new Set(sampleItems.map(item => item.category).filter(Boolean))) as string[];
    setCategories(uniqueCategories);
  }, [sampleItems]);

  useEffect(() => {
    onThemeChange?.(activeTheme);
  }, [activeTheme, onThemeChange]);

  const getAnimationDuration = () => {
    switch (activeTheme.animationSpeed) {
      case "slow": return 0.8;
      case "fast": return 0.3;
      default: return 0.5;
    }
  };

  return (
    <div 
      className="min-h-screen transition-colors duration-500"
      style={{ 
        backgroundColor: activeTheme.colors.background,
        color: activeTheme.colors.textPrimary
      }}
    >
      {/* Admin Controls Panel */}
      {showAdminControls && (
        <motion.div 
          className="fixed top-4 right-4 z-40"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-sm font-medium text-white">Theme Studio</span>
            </div>

            {/* Theme Selector */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <label className="text-xs text-white/70 uppercase tracking-wide">Theme</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {themePresets.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setActiveTheme(theme)}
                      className={cn(
                        "p-2 rounded-lg text-xs font-medium transition-all",
                        activeTheme.id === theme.id
                          ? "bg-white text-black shadow-lg"
                          : "bg-white/10 text-white hover:bg-white/20"
                      )}
                      style={{
                        background: activeTheme.id === theme.id 
                          ? "#ffffff" 
                          : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`
                      }}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Selector */}
              <div>
                <label className="text-xs text-white/70 uppercase tracking-wide">Layout</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["grid", "masonry", "carousel", "showcase"] as const).map((layout) => (
                    <button
                      key={layout}
                      onClick={() => setActiveLayout(layout)}
                      className={cn(
                        "p-2 rounded-lg text-xs font-medium capitalize transition-all",
                        activeLayout === layout
                          ? "bg-brand text-white"
                          : "bg-white/10 text-white hover:bg-white/20"
                      )}
                    >
                      {layout}
                    </button>
                  ))}
                </div>
              </div>

              {/* Columns Slider */}
              {activeLayout === "grid" && (
                <div>
                  <label className="text-xs text-white/70 uppercase tracking-wide">
                    Columns: {columns}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={columns}
                    onChange={(e) => setColumns(Number(e.target.value))}
                    className="w-full mt-2"
                  />
                </div>
              )}

              {/* Toggle Filters */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/70 uppercase tracking-wide">Filters</label>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors",
                    showFilters ? "bg-brand" : "bg-white/20"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full bg-white shadow-md transition-transform",
                      showFilters ? "translate-x-6" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {/* Preview Mode */}
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={cn(
                  "w-full py-2 rounded-lg text-xs font-medium transition-all",
                  isPreviewMode
                    ? "bg-green-500 text-white"
                    : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                {isPreviewMode ? "Exit Preview" : "Preview Mode"}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hero Section */}
      <MediaHero
        backgroundImage="/brand/workshop-hero.webp"
        title="Media Gallery"
        subtitle="Explore our collection of projects and installations"
        overlayColor={activeTheme.colors.secondary}
        overlayOpacity={0.7}
      />

      {/* Main Gallery Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {showFilters && categories.length > 0 ? (
              <motion.div
                key="filtered"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: getAnimationDuration() }}
              >
                <FilteredGallery
                  items={sampleItems}
                  categories={categories}
                  layout={activeLayout}
                  columns={columns}
                  showTitles={true}
                  enableZoom={true}
                />
              </motion.div>
            ) : (
              <motion.div
                key="unfiltered"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: getAnimationDuration() }}
              >
                <MediaGallery
                  items={sampleItems}
                  layout={activeLayout}
                  columns={columns}
                  showTitles={true}
                  enableZoom={true}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Theme Info Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-white/60">
            Active Theme: <span className="font-semibold text-white">{activeTheme.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div 
              className="w-8 h-8 rounded-full shadow-lg"
              style={{ backgroundColor: activeTheme.colors.primary }}
            />
            <div 
              className="w-8 h-8 rounded-full shadow-lg"
              style={{ backgroundColor: activeTheme.colors.secondary }}
            />
            <div 
              className="w-8 h-8 rounded-full shadow-lg"
              style={{ backgroundColor: activeTheme.colors.accent }}
            />
          </div>
        </div>
      </footer>

      {/* Preview Mode Overlay */}
      <AnimatePresence>
        {isPreviewMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none"
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium">
              Preview Mode - Controls Hidden
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export types and presets for external use
export type { ThemePreset, MediaItem };
export { themePresets };
