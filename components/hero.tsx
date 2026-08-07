"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, Pause, Play, ScanLine, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { useSpatialStorefront } from "@/components/storefront/use-spatial-storefront";
import type { HeroSlide } from "@/lib/storefront-banners";
import { money } from "@/lib/utils";

type HeroProduct = {
  name: string;
  slug: string;
  image: string;
  price: number;
  brand: string;
  variantCount: number;
};

const defaultSubtitle = "Professional tools, exact variants, transparent stock, wholesale pricing, and verified delivery in one dependable store.";
const defaultTitle = "Built for real work.";
const ThreeHeroStage = dynamic(() => import("@/components/storefront/three-hero-stage").then((module) => module.ThreeHeroStage), { ssr: false });

function displayHeroTitle(value: string | null | undefined) {
  const title = value?.trim() || "";
  const looksLikeFileName = /^(?:img|dsc|image|photo|screenshot|whatsapp[\s_-]*image)[\s_-]*\d*(?:\.[a-z0-9]{2,5})?$/i.test(title);
  return !title || looksLikeFileName ? defaultTitle : title;
}

export function Hero({ product, slides = [] }: { product?: HeroProduct; slides?: HeroSlide[] }) {
  const reduceMotion = useReducedMotion();
  const spatialTheme = useSpatialStorefront();
  const [canRenderWebgl, setCanRenderWebgl] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const visualSlides = useMemo<HeroSlide[]>(() => slides.length ? slides : [{
    id: "hero-fallback",
    title: defaultTitle,
    subtitle: defaultSubtitle,
    image: product?.image || "/brand/workshop-hero.webp",
    mobileImage: null,
    href: "/products",
    sortOrder: 0
  }], [product?.image, slides]);
  const activeSlide = visualSlides[activeIndex] || visualSlides[0];
  const hasCarousel = visualSlides.length > 1;

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const navigatorWithHints = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    const hasEnoughMemory = (navigatorWithHints.deviceMemory ?? 8) >= 4;
    const hasEnoughCores = (navigator.hardwareConcurrency ?? 8) >= 4;
    const dataSaverDisabled = !navigatorWithHints.connection?.saveData;
    const sync = () => setCanRenderWebgl(query.matches && hasEnoughMemory && hasEnoughCores && dataSaverDisabled && !document.hidden);
    sync();
    query.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      query.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (activeIndex < visualSlides.length) return;
    setActiveIndex(0);
  }, [activeIndex, visualSlides.length]);

  useEffect(() => {
    if (!hasCarousel || reduceMotion || userPaused || hoverPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visualSlides.length);
    }, 6200);
    return () => window.clearInterval(timer);
  }, [hasCarousel, hoverPaused, reduceMotion, userPaused, visualSlides.length]);

  function changeSlide(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + visualSlides.length) % visualSlides.length);
  }

  const imageIsProxy = activeSlide.image.startsWith("/api/banner-images/");
  const mobileImageIsProxy = Boolean(activeSlide.mobileImage?.startsWith("/api/banner-images/"));

  return (
    <section className={`store-hero-shell bg-[var(--bg)] px-2.5 py-3 sm:px-5 sm:py-5 lg:px-8 ${spatialTheme ? "is-spatial" : ""}`}>
      <div
        className={`store-hero relative isolate mx-auto min-h-[24rem] max-w-[90rem] overflow-hidden rounded-lg bg-slate-900 text-white sm:min-h-[31rem] md:min-h-[33rem] lg:min-h-[35rem] ${spatialTheme ? "store-hero-spatial" : ""}`}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
      >
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={activeSlide.id}
            className="absolute inset-0 z-0"
            initial={reduceMotion ? false : { opacity: 0, scale: 1.035, x: activeIndex % 2 === 0 ? 16 : -16 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.018, x: activeIndex % 2 === 0 ? -8 : 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.72, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image src={activeSlide.image} alt="" fill priority={activeIndex === 0} unoptimized={imageIsProxy} className={activeSlide.mobileImage ? "hidden object-cover md:block" : "object-cover"} sizes="100vw" />
            {activeSlide.mobileImage ? <Image src={activeSlide.mobileImage} alt="" fill unoptimized={mobileImageIsProxy} className="object-cover md:hidden" sizes="100vw" /> : null}
          </motion.div>
        </AnimatePresence>

        <div className="store-hero-scrim pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
        <div className="store-hero-texture pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
        {spatialTheme && canRenderWebgl ? <ThreeHeroStage theme={spatialTheme} /> : null}
        {spatialTheme ? <div className="store-spatial-hud" aria-hidden="true"><span>HTC / CATALOGUE</span><span>LIVE INVENTORY</span><i /></div> : null}

        <motion.div className="pointer-events-none absolute right-3 top-3 z-[2] h-12 w-28 sm:right-7 sm:top-6 sm:h-24 sm:w-52 lg:h-28 lg:w-60" initial={reduceMotion ? false : { opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : 0.2 }}>
          <Image src="/brand/htc-logo.png" alt="" fill priority className="object-contain object-right drop-shadow-[0_10px_22px_rgba(0,0,0,0.35)]" sizes="240px" />
        </motion.div>

        <div className="store-hero-copy-frame relative z-[2] flex min-h-[24rem] items-center px-5 pb-16 pt-14 sm:min-h-[31rem] sm:px-10 sm:py-20 md:min-h-[33rem] lg:min-h-[35rem] lg:px-16">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${activeSlide.id}-copy`} className="max-w-3xl" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }} transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}>
              <p className="store-hero-kicker inline-flex items-center gap-2 text-[10px] font-black uppercase text-red-200 sm:text-xs"><span className="h-0.5 w-8 bg-red-500" /> Hammer Trading Company</p>
              <h1 className="store-hero-title mt-3 max-w-3xl break-words font-display text-[2.55rem] font-black leading-[0.9] sm:mt-4 sm:text-6xl lg:text-7xl">{displayHeroTitle(activeSlide.title)}</h1>
              <p className="store-hero-copy mt-4 line-clamp-2 max-w-lg text-sm leading-6 text-slate-200 sm:mt-5 sm:line-clamp-none sm:text-base sm:leading-7">{activeSlide.subtitle || defaultSubtitle}</p>
              <div className="mt-5 flex flex-wrap gap-3 sm:mt-7">
                <LinkButton href={activeSlide.href || "/products"} variant="accent" className="min-h-11 gap-2 px-5 sm:min-h-12 sm:px-6">Shop collection <ArrowRight size={17} /></LinkButton>
                <LinkButton href="/categories" variant="ghost" className="hidden min-h-12 border-0 bg-white/12 px-6 text-white ring-1 ring-white/20 hover:bg-white/18 hover:text-white hover:ring-white/30 sm:inline-flex">Browse departments</LinkButton>
              </div>
              <div className="store-hero-trust mt-7 hidden flex-wrap gap-x-5 gap-y-2 text-[10px] font-black uppercase text-slate-200 sm:flex sm:text-xs">
                <span className="inline-flex items-center gap-2"><BadgeCheck size={15} className="text-red-400" /> Genuine stock</span>
                <span className="inline-flex items-center gap-2"><Truck size={15} className="text-red-400" /> Nationwide delivery</span>
                <span className="inline-flex items-center gap-2"><ScanLine size={15} className="text-red-400" /> Verified handover</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {product ? (
          <Link href={`/products/${product.slug}`} className="store-hero-feature absolute bottom-5 right-20 z-[2] hidden max-w-xs rounded-lg bg-slate-950/70 px-4 py-3 text-left shadow-lg ring-1 ring-white/15 transition-transform duration-200 hover:-translate-y-0.5 lg:block">
            <span className="text-[10px] font-black uppercase text-red-300">Featured / {product.brand}</span>
            <strong className="mt-1 block truncate text-sm">{product.name}</strong>
            <span className="mt-1 block text-xs text-slate-300">{money(product.price)}{product.variantCount ? ` / ${product.variantCount} options` : ""}</span>
          </Link>
        ) : null}

        {hasCarousel ? (
          <>
            <button type="button" onClick={() => changeSlide(-1)} aria-label="Previous hero slide" className="absolute bottom-5 left-5 z-[3] hidden size-10 place-items-center rounded-lg bg-white/12 text-white ring-1 ring-white/20 transition duration-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white sm:bottom-auto sm:top-1/2 sm:grid sm:-translate-y-1/2"><ChevronLeft size={19} /></button>
            <div className="absolute bottom-3 left-1/2 z-[3] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur-sm sm:bottom-5 sm:gap-2 sm:px-3 sm:py-2" aria-label="Hero slide controls">
              {visualSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className="group relative h-5 w-5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-6 sm:w-7"
                  aria-label={`Show hero slide ${index + 1}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                >
                  <span
                    className={`absolute inset-x-0 top-1/2 h-1.5 origin-left -translate-y-1/2 rounded-full bg-white transition-transform duration-300 ${index === activeIndex ? "scale-x-100" : "scale-x-[0.22] opacity-50 group-hover:opacity-80"}`}
                  />
                </button>
              ))}
              <button type="button" onClick={() => setUserPaused((value) => !value)} className="ml-1 grid size-6 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white" aria-label={userPaused ? "Play hero slides" : "Pause hero slides"}>{userPaused ? <Play size={13} /> : <Pause size={13} />}</button>
            </div>
            <button type="button" onClick={() => changeSlide(1)} aria-label="Next hero slide" className="absolute bottom-5 right-5 z-[3] hidden size-10 place-items-center rounded-lg bg-white/12 text-white ring-1 ring-white/20 transition duration-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white sm:bottom-auto sm:top-1/2 sm:grid sm:-translate-y-1/2"><ChevronRight size={19} /></button>
            <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/15" aria-hidden="true"><motion.span key={`${activeSlide.id}-progress`} className="block h-full origin-left bg-red-500" initial={{ scaleX: 0 }} animate={{ scaleX: userPaused || hoverPaused || reduceMotion ? 0 : 1 }} transition={{ duration: userPaused || hoverPaused || reduceMotion ? 0 : 6.2, ease: "linear" }} /></div>
          </>
        ) : null}
      </div>
    </section>
  );
}
