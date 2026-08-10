"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Layers3, ShoppingCart, Star, Zap } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
import type { ProductCardSummary } from "@/lib/catalog";
import { resolveStoreImage } from "@/lib/store-image";
import { money } from "@/lib/utils";
import { WishlistButton } from "@/components/wishlist-button";

export function ProductCard({ product, index = 0, desktopColumns = 4 }: { product: ProductCardSummary; index?: number; desktopColumns?: number }) {
  const cart = useCart();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const discount = product.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0;
  const lowStock = product.lowStockThreshold ?? 5;
  const hasSelectableVariants = product.variantCount > 1 || product.variants.some((variant) => Object.keys(variant.options).length > 0);
  const variantPreview = product.variants.filter((variant) => variant.isActive).slice(0, 3);
  const galleryImages = useMemo(() => Array.from(new Set([product.image, ...product.galleryImages].map(resolveStoreImage))).slice(0, 4), [product.galleryImages, product.image]);
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const availableImages = useMemo(() => galleryImages.filter((image) => !failedImages.includes(image)), [failedImages, galleryImages]);
  const [hovered, setHovered] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const currentImage = availableImages.length ? availableImages[imageIndex % availableImages.length] : "/brand/workshop-hero.webp";
  const imageSizes = desktopColumns >= 5
    ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
    : desktopColumns === 4
      ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      : desktopColumns === 3
        ? "(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
        : "(max-width: 768px) 100vw, 50vw";

  useEffect(() => {
    if (!hovered || reduceMotion || availableImages.length < 2) {
      setImageIndex(0);
      return;
    }
    setImageIndex(1);
    const timer = window.setInterval(() => {
      setImageIndex((current) => (current + 1) % availableImages.length);
    }, 1350);
    return () => window.clearInterval(timer);
  }, [availableImages.length, hovered, reduceMotion]);

  function buyNow() {
    cart.add(product.id);
    router.push("/checkout");
  }

  function moveCard(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || reduceMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cardRef.current.style.setProperty("--card-rx", `${(-y * 5.5).toFixed(2)}deg`);
    cardRef.current.style.setProperty("--card-ry", `${(x * 6.5).toFixed(2)}deg`);
    cardRef.current.style.setProperty("--card-light-x", `${((x + 0.5) * 100).toFixed(0)}%`);
    cardRef.current.style.setProperty("--card-light-y", `${((y + 0.5) * 100).toFixed(0)}%`);
  }

  function resetCard() {
    setHovered(false);
    cardRef.current?.style.setProperty("--card-rx", "0deg");
    cardRef.current?.style.setProperty("--card-ry", "0deg");
  }

  return (
    <article
      ref={cardRef}
      style={{ transitionDelay: `${Math.min((index % 5) * 20, 80)}ms` }}
      className="store-product-card group relative flex h-full min-w-0 flex-col text-slate-950 dark:text-slate-50"
      aria-labelledby={`product-title-${product.id}`}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(true); }}
      onPointerMove={moveCard}
      onPointerLeave={resetCard}
    >
      <span className="store-product-depth-edge" aria-hidden="true" />
      <span className="store-product-light" aria-hidden="true" />
      <div className="relative">
        <Link href={`/products/${product.slug}`} className="store-product-media relative block aspect-square overflow-hidden rounded-lg bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/40 dark:bg-slate-900" aria-label={`View ${product.name}`}>
          <Image src="/brand/htc-logo.png" alt="" fill className="object-contain p-10 opacity-[0.08]" sizes="180px" />
          <AnimatePresence initial={false} mode="sync">
            <motion.div key={currentImage} className="absolute inset-0" initial={reduceMotion ? false : { opacity: 0, scale: 1.035, x: 7 }} animate={{ opacity: 1, scale: hovered ? 1.035 : 1, x: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.992, x: -7 }} transition={{ duration: reduceMotion ? 0 : 0.42, ease: [0.22, 1, 0.36, 1] }}>
              <Image
                src={currentImage}
                alt={imageIndex === 0 ? product.name : ""}
                fill
                unoptimized={currentImage.startsWith("/api/product-images/") || currentImage.startsWith("data:")}
                onLoad={() => setLoadedImages((current) => current.includes(currentImage) ? current : [...current, currentImage])}
                onError={() => { if (currentImage !== "/brand/workshop-hero.webp") setFailedImages((current) => current.includes(currentImage) ? current : [...current, currentImage]); }}
                className={`object-cover transition-opacity duration-300 ${loadedImages.includes(currentImage) ? "opacity-100" : "opacity-0"}`}
                sizes={imageSizes}
              />
            </motion.div>
          </AnimatePresence>
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {discount > 0 ? <span className="store-product-badge store-product-badge-discount absolute left-3 top-3 z-10 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-black text-white shadow-sm" aria-label={`${discount}% discount`}>-{discount}%</span> : null}
          {product.isBestSeller ? <span className="store-product-badge store-product-badge-best absolute right-3 top-3 z-10 rounded-full bg-slate-950/88 px-2.5 py-1 text-[10px] font-black uppercase text-white" aria-label="Best seller">Best seller</span> : null}
          {hasSelectableVariants ? <span className="store-product-options-badge absolute bottom-3 left-3 z-10 inline-flex items-center gap-1 rounded-md bg-white/92 px-2 py-1 text-[10px] font-black text-slate-900 shadow-sm" aria-label={`${product.variantCount} variants available`}><Layers3 size={12} aria-hidden="true" /> {product.variantCount} options</span> : null}
          {availableImages.length > 1 ? <span className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-full bg-slate-950/55 px-2 py-1 backdrop-blur-sm" aria-label={`${availableImages.length} product images available`}>{availableImages.map((image, dotIndex) => <span key={image} className={`block size-1.5 rounded-full ${dotIndex === imageIndex % availableImages.length ? "bg-white" : "bg-white/35"}`} aria-hidden="true" />)}</span> : null}
        </Link>

        <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 transition duration-200 md:translate-x-2 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100 md:group-focus-within:translate-x-0 md:group-focus-within:opacity-100">
          <WishlistButton productId={product.id} productName={product.name} className="store-product-float-action grid size-11 place-items-center rounded-full bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50" />
          {hasSelectableVariants ? (
            <Link href={`/products/${product.slug}`} className="store-product-float-action grid size-11 place-items-center rounded-full bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600" aria-label={`Select options for ${product.name}`} title="Select options"><ShoppingCart size={18} aria-hidden="true" /></Link>
          ) : (
            <button type="button" onClick={() => cart.add(product.id)} disabled={product.stock <= 0} className="store-product-float-action grid size-11 place-items-center rounded-full bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Add ${product.name} to cart`} title="Add to cart"><ShoppingCart size={18} aria-hidden="true" /></button>
          )}
          <Link href={`/products/${product.slug}`} className="store-product-float-action grid size-11 place-items-center rounded-full bg-white text-slate-950 shadow-[0_8px_24px_rgba(15,23,42,0.18)] transition duration-200 hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600" aria-label={`View ${product.name} details`} title="View product"><Eye size={18} aria-hidden="true" /></Link>
        </div>
      </div>

      <div className="store-product-body flex flex-1 flex-col px-0.5 pb-1 pt-4">
        <div className="flex min-w-0 items-center justify-between gap-3 text-[10px] font-black uppercase">
          <span className="truncate text-red-700 dark:text-red-400">{product.category}</span>
          <span className={product.stock <= 0 ? "text-red-600" : product.stock <= lowStock ? "text-orange-600" : "text-emerald-700 dark:text-emerald-400"}>{product.stock <= 0 ? "Out of stock" : product.stock <= lowStock ? `${product.stock} left` : "In stock"}</span>
        </div>
        <Link href={`/products/${product.slug}`} id={`product-title-${product.id}`} className="mt-2 min-h-11 line-clamp-2 text-sm font-bold leading-[1.35] text-slate-950 transition-colors hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:text-white dark:hover:text-red-400 sm:text-[15px]">{product.name}</Link>

        <div className="mt-2 flex min-h-6 items-center gap-1.5 overflow-hidden" aria-label="Product variants">
          {hasSelectableVariants ? variantPreview.map((variant) => <span key={variant.id} className="store-product-variant-chip max-w-24 truncate rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{variant.title}</span>) : <span className="text-[10px] font-bold uppercase text-slate-400">{product.brand}</span>}
          {product.variantCount > variantPreview.length ? <span className="text-[10px] font-black text-slate-400">+{product.variantCount - variantPreview.length}</span> : null}
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
          <strong className="store-product-price text-lg font-black text-red-700 dark:text-red-400" aria-label={`Price: ${money(product.price)}`}>{money(product.price)}</strong>
          {product.compareAtPrice ? <span className="pb-0.5 text-xs text-slate-400 line-through" aria-label={`Was ${money(product.compareAtPrice)}`}>{money(product.compareAtPrice)}</span> : null}
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500" aria-label={`Rating: ${product.reviewCount ? `${product.rating} out of 5 stars based on ${product.reviewCount} reviews` : "No reviews yet"}`}><Star size={13} className="text-amber-500" fill={product.reviewCount ? "currentColor" : "none"} aria-hidden="true" /><span>{product.reviewCount ? `${product.rating} (${product.reviewCount})` : "New arrival"}</span></div>

        <div className="store-product-actions mt-auto grid grid-cols-1 gap-2 pt-4 sm:grid-cols-[1fr_auto_auto]">
          {hasSelectableVariants ? (
            <Link href={`/products/${product.slug}`} className="store-product-primary-action inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-red-700 px-3 text-xs font-black text-white transition duration-200 hover:-translate-y-0.5 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30"><ShoppingCart size={16} aria-hidden="true" /> <span className="truncate">Select options</span></Link>
          ) : (
            <button type="button" onClick={() => cart.add(product.id)} disabled={product.stock <= 0} className="store-product-primary-action inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg bg-red-700 px-3 text-xs font-black text-white transition duration-200 hover:-translate-y-0.5 hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 disabled:cursor-not-allowed disabled:opacity-50"><ShoppingCart size={16} aria-hidden="true" /> Add to cart</button>
          )}
          <button type="button" onClick={buyNow} disabled={product.stock <= 0 || hasSelectableVariants} className="hidden size-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-950 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:grid" aria-label={`Buy ${product.name} now`} title={hasSelectableVariants ? "Select a variant first" : "Buy now"}><Zap size={17} aria-hidden="true" /></button>
          <Link href={`/products/${product.slug}`} className="hidden size-11 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-red-700 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:grid" aria-label={`View ${product.name} details`} title="View product"><Eye size={17} aria-hidden="true" /></Link>
        </div>
      </div>
    </article>
  );
}
