"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { HeroSlide } from "@/lib/storefront-banners";

type PageHeroSliderProps = {
  slides: HeroSlide[];
  fallback: { eyebrow: string; title: string; description: string };
};

export function PageHeroSlider({ slides, fallback }: PageHeroSliderProps) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const active = slides[index];

  useEffect(() => {
    if (reducedMotion || slides.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length]);

  return <header className="relative isolate min-h-[24rem] overflow-hidden bg-[#20252b] text-white sm:min-h-[30rem]">
    {active ? <AnimatePresence mode="sync">
      <motion.div key={active.id} className="absolute inset-0" initial={{ opacity: 0, scale: 1.035 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}>
        <picture><source media="(max-width: 640px)" srcSet={active.mobileImage || active.image}/><Image src={active.image} alt="" fill priority={index === 0} className="object-cover" sizes="100vw"/></picture>
      </motion.div>
    </AnimatePresence> : null}
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,15,18,.91)_0%,rgba(12,15,18,.62)_48%,rgba(12,15,18,.2)_100%)]"/>
    <div className="relative mx-auto flex min-h-[24rem] max-w-[90rem] items-end px-4 pb-12 pt-28 sm:min-h-[30rem] sm:px-6 sm:pb-16 lg:px-10">
      <motion.div key={active?.id || fallback.title} initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.48, delay: reducedMotion ? 0 : 0.08 }} className="max-w-4xl">
        <p className="showroom-eyebrow text-red-300">{fallback.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl font-display text-5xl font-black uppercase leading-[.88] sm:text-7xl">{active?.title || fallback.title}</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">{active?.subtitle || fallback.description}</p>
        {active?.href ? <Link href={active.href} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-md bg-red-700 px-5 text-sm font-black transition hover:-translate-y-0.5 hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">Explore <ArrowRight size={17}/></Link> : null}
      </motion.div>
    </div>
    {slides.length > 1 ? <div className="absolute bottom-5 right-4 flex gap-2 sm:right-6 lg:right-10">{slides.map((slide, slideIndex) => <button key={slide.id} type="button" onClick={() => setIndex(slideIndex)} aria-label={`Show slide ${slideIndex + 1}`} aria-current={slideIndex === index} className="h-3 w-8 p-0"><span className={`block h-1.5 w-full origin-left rounded-full transition duration-300 ${slideIndex === index ? "scale-x-100 bg-red-500" : "scale-x-50 bg-white/45 hover:bg-white"}`}/></button>)}</div> : null}
  </header>;
}
