'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Github } from 'lucide-react';
import { Card3D, AnimatedSection } from './ui/advanced-cards';

interface MediaItem {
  id: string;
  type: 'video' | 'image';
  url: string; // GitHub Raw URL
  title: string;
  description?: string;
  caption?: string;
}

interface GitHubMediaShowcaseProps {
  items: MediaItem[];
  themeColor?: string;
  autoPlay?: boolean;
}

export const GitHubMediaShowcase = ({ 
  items, 
  themeColor = '#6366f1',
  autoPlay = true 
}: GitHubMediaShowcaseProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({ target: containerRef });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);

  // Helper to convert GitHub blob URL to raw URL if needed
  const getRawUrl = (url: string) => {
    if (url.includes('github.com') && url.includes('/blob/')) {
      return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <div ref={containerRef} className="relative w-full min-h-screen bg-black overflow-hidden">
      {/* Dynamic Background with Parallax */}
      <motion.div 
        style={{ scale, y }}
        className="absolute inset-0 z-0"
      >
        <AnimatePresence mode="wait">
          {items[activeIndex].type === 'video' ? (
            <motion.video
              key={items[activeIndex].id}
              src={getRawUrl(items[activeIndex].url)}
              className="w-full h-full object-cover opacity-40"
              autoPlay={isPlaying}
              muted={isMuted}
              loop
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            />
          ) : (
            <motion.img
              key={items[activeIndex].id}
              src={getRawUrl(items[activeIndex].url)}
              className="w-full h-full object-cover opacity-30"
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.3 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 1.5 }}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </motion.div>

      {/* Main Content Area */}
      <div className="relative z-10 container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-screen">
        
        {/* Header Controls */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-6 right-6 flex gap-3 z-50"
        >
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-all"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white transition-all"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </motion.div>

        {/* 3D Featured Card */}
        <AnimatedSection animation="scale-up" className="w-full max-w-5xl mb-12">
          <Card3D className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden group">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Media Display */}
              <div className="relative h-[400px] md:h-[600px] overflow-hidden bg-gray-900">
                <AnimatePresence mode="wait">
                  {items[activeIndex].type === 'video' ? (
                    <motion.video
                      key={`vid-${items[activeIndex].id}`}
                      src={getRawUrl(items[activeIndex].url)}
                      className="w-full h-full object-cover"
                      autoPlay={isPlaying}
                      muted={isMuted}
                      loop
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  ) : (
                    <motion.img
                      key={`img-${items[activeIndex].id}`}
                      src={getRawUrl(items[activeIndex].url)}
                      className="w-full h-full object-cover"
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </AnimatePresence>
                
                {/* GitHub Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white font-medium">
                  <Github size={14} />
                  <span>Hosted on GitHub</span>
                </div>
              </div>

              {/* Info Panel */}
              <div className="p-8 md:p-12 flex flex-col justify-center relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <h1 className="text-9xl font-bold text-white select-none">0{activeIndex + 1}</h1>
                </div>
                
                <motion.div
                  key={activeIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                    {items[activeIndex].title}
                  </h2>
                  <p className="text-gray-300 text-lg mb-8 leading-relaxed">
                    {items[activeIndex].description}
                  </p>
                  
                  {items[activeIndex].caption && (
                    <div className="flex items-center gap-3 text-sm text-gray-400 border-t border-white/10 pt-6">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }} />
                      <span>{items[activeIndex].caption}</span>
                    </div>
                  )}
                </motion.div>

                {/* Navigation */}
                <div className="flex items-center gap-4 mt-12">
                  <button 
                    onClick={handlePrev}
                    className="flex-1 py-4 rounded-xl border border-white/20 text-white hover:bg-white/10 transition-all font-medium"
                  >
                    Previous
                  </button>
                  <button 
                    onClick={handleNext}
                    className="flex-1 py-4 rounded-xl text-black font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                    style={{ backgroundColor: themeColor }}
                  >
                    Next Project
                  </button>
                </div>
              </div>
            </div>
          </Card3D>
        </AnimatedSection>

        {/* Thumbnail Strip */}
        <div className="flex gap-4 overflow-x-auto pb-4 w-full max-w-4xl no-scrollbar">
          {items.map((item, index) => (
            <motion.button
              key={item.id}
              onClick={() => setActiveIndex(index)}
              className={`relative flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                activeIndex === index ? 'border-white scale-105' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              whileHover={{ scale: 1.1 }}
            >
              {item.type === 'video' ? (
                <video src={getRawUrl(item.url)} className="w-full h-full object-cover" muted />
              ) : (
                <img src={getRawUrl(item.url)} className="w-full h-full object-cover" alt={item.title} />
              )}
              <div className="absolute inset-0 bg-black/20" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
