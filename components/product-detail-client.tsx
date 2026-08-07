"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ProductMeta, StatusPill } from "@/components/storefront/showroom-primitives";
import { Check, PackageCheck, RotateCcw, ShieldCheck, Star, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductQuoteForm } from "@/components/product-quote-form";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import type { CatalogProduct, CatalogProductVariant } from "@/lib/catalog";
import { resolveStoreImage } from "@/lib/store-image";
import { money } from "@/lib/utils";

const ProductModelViewer = dynamic(() => import("@/components/storefront/product-model-viewer"), {
  ssr: false,
  loading: () => <div className="grid aspect-square place-items-center bg-slate-950 text-sm font-bold text-slate-400">Preparing 3D viewer...</div>
});

function fallbackVariant(product: CatalogProduct): CatalogProductVariant {
  return {
    id: `${product.id}:default`,
    title: "Default",
    sku: product.sku,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    stock: product.stock,
    imageUrl: resolveStoreImage(product.image),
    options: {},
    isDefault: true,
    isActive: true
  };
}

function optionText(options: Record<string, string>) {
  return Object.entries(options).map(([key, value]) => `${key}: ${value}`).join(" / ");
}

function colorValue(options: Record<string, string>) {
  const entry = Object.entries(options).find(([key]) => key.toLowerCase() === "color" || key.toLowerCase() === "colour");
  return entry?.[1];
}

function colorStyle(value?: string) {
  const key = (value || "").trim().toLowerCase();
  const colors: Record<string, string> = {
    black: "#111827",
    white: "#ffffff",
    red: "#dc2626",
    blue: "#2563eb",
    green: "#16a34a",
    yellow: "#facc15",
    orange: "#f97316",
    grey: "#64748b",
    gray: "#64748b",
    silver: "#cbd5e1",
    gold: "#f59e0b",
    golden: "#f59e0b",
    brown: "#92400e"
  };
  return colors[key] || value || "#e2e8f0";
}

function optionGroups(variants: CatalogProductVariant[]) {
  const groups = new Map<string, string[]>();
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.options)) {
      if (!value) continue;
      const current = groups.get(key) || [];
      if (!current.includes(value)) groups.set(key, [...current, value]);
    }
  }
  return Array.from(groups.entries()).map(([name, values]) => ({ name, values }));
}

function optionEntries(options: Record<string, string>) {
  return Object.entries(options).filter(([, value]) => value.trim());
}

export function ProductDetailClient({ product }: { product: CatalogProduct }) {
  const cart = useCart();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const variants = useMemo(() => {
    const rows = product.variants.length ? product.variants : [fallbackVariant(product)];
    return rows.map((variant) => ({
      ...variant,
      imageUrl: variant.imageUrl ? resolveStoreImage(variant.imageUrl) : variant.imageUrl
    }));
  }, [product]);
  const defaultVariant = variants.find((variant) => variant.isDefault) || variants[0];
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant.id);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || defaultVariant;
  const selectedModelUrl = selectedVariant.modelUrl || product.modelUrl;
  const gallery = useMemo(() => {
    const rows = [
      ...product.images.map((image) => ({ url: resolveStoreImage(image.url), alt: image.alt || product.name })),
      ...variants.filter((variant) => variant.imageUrl).map((variant) => ({ url: resolveStoreImage(variant.imageUrl), alt: `${product.name} ${variant.title}` }))
    ];
    return rows.filter((image, index) => image.url && rows.findIndex((item) => item.url === image.url) === index);
  }, [product.images, product.name, variants]);
  const [selectedImage, setSelectedImage] = useState(resolveStoreImage(selectedVariant.imageUrl || gallery[0]?.url || product.image));

  function selectVariant(variant: CatalogProductVariant) {
    setSelectedVariantId(variant.id);
    if (variant.imageUrl) setSelectedImage(resolveStoreImage(variant.imageUrl));
  }

  const hasOptions = variants.length > 1 || Object.keys(selectedVariant.options).length > 0;
  const selectedOptions = optionText(selectedVariant.options);
  const inStock = selectedVariant.stock > 0;
  const groups = useMemo(() => optionGroups(variants), [variants]);

  function selectOption(name: string, value: string) {
    const next = variants.find((variant) => {
      if (variant.options[name] !== value) return false;
      return Object.entries(selectedVariant.options).every(([key, selectedValue]) => key === name || !variant.options[key] || variant.options[key] === selectedValue);
    }) || variants.find((variant) => variant.options[name] === value);
    if (next) selectVariant(next);
  }

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] xl:gap-16">
        <section className="min-w-0 space-y-3">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 shadow-[0_20px_60px_rgba(15,18,20,0.1)] dark:bg-slate-900">
          {selectedModelUrl ? (
            <ProductModelViewer modelUrl={selectedModelUrl} posterUrl={resolveStoreImage(selectedVariant.imageUrl || product.modelPosterUrl || selectedImage)} productName={product.name} />
          ) : (
            <AnimatePresence initial={false} mode="sync">
              <motion.div
                key={selectedImage}
                className="absolute inset-0"
                initial={reduceMotion ? false : { opacity: 0, x: 12, scale: 1.012 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10, scale: 1.006 }}
                transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image src={selectedImage} alt={product.name} fill className="object-cover transition-transform duration-500 hover:scale-[1.025]" sizes="(max-width: 1024px) 100vw, 54vw" priority unoptimized={selectedImage.startsWith("data:") || selectedImage.startsWith("/api/product-images/")} />
              </motion.div>
            </AnimatePresence>
          )}
          {selectedVariant.compareAtPrice ? <span className="absolute left-4 top-4 rounded-full bg-red-700 px-3 py-1 text-sm font-black text-white">Discount</span> : null}
        </div>
        {gallery.length > 1 ? (
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
            {gallery.slice(0, 6).map((image) => (
              <button
                key={image.url}
                type="button"
                onClick={() => setSelectedImage(image.url)}
                className={`relative aspect-square overflow-hidden rounded-lg bg-white transition duration-200 hover:-translate-y-0.5 dark:bg-slate-900 ${selectedImage === image.url ? "ring-2 ring-red-600 ring-offset-2 ring-offset-[var(--bg)]" : "opacity-70 hover:opacity-100"}`}
                aria-label={`Show ${image.alt}`}
              >
                <Image src={image.url} alt={image.alt} fill className="object-cover" sizes="130px" unoptimized={image.url.startsWith("data:")} />
              </button>
            ))}
          </div>
        ) : null}
        </section>

        <section className="h-fit min-w-0 lg:sticky lg:top-[156px]">
        <ProductMeta brand={product.brand} category={product.category} sku={selectedVariant.sku} />
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[.85]">{product.name}</h1>
        <div className="mt-4 flex items-center gap-2 text-amber-500">
          <Star size={18} fill="currentColor" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">{product.rating} reviews</span>
        </div>
        <p className="mt-5 text-lg leading-8 text-slate-700 dark:text-slate-300">{product.shortDescription}</p>

        <AnimatePresence initial={false} mode="wait">
          <motion.div key={selectedVariant.id} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}>
            <div className="mt-6 flex flex-wrap items-end gap-3">
              <strong className="font-mono text-3xl">{money(selectedVariant.price)}</strong>
              {selectedVariant.compareAtPrice ? <span className="text-slate-500 line-through">{money(selectedVariant.compareAtPrice)}</span> : null}
              <StatusPill tone={inStock ? "success" : "warning"}>{inStock ? `${selectedVariant.stock} in stock` : "Out of stock"}</StatusPill>
            </div>
            <div className="mt-4 rounded-lg bg-[var(--surface)] p-3 text-sm shadow-sm ring-1 ring-[var(--line)]">
              <p className="font-mono text-slate-500">SKU: <span className="font-bold text-[var(--ink)]">{selectedVariant.sku}</span></p>
              {selectedOptions ? <p className="mt-1 font-semibold text-[var(--muted)]">{selectedOptions}</p> : null}
            </div>
          </motion.div>
        </AnimatePresence>

        {hasOptions ? (
          <div className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Select variant</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  {variants.length} option{variants.length === 1 ? "" : "s"} available for this product.
                </p>
              </div>
              {selectedOptions ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-950/30 dark:text-red-200">{selectedOptions}</span> : null}
            </div>
            {groups.length ? (
              <div className="mt-3 space-y-4 rounded-lg bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--line)]">
                {groups.map((group) => (
                  <div key={group.name}>
                    <p className="text-xs font-black uppercase text-slate-500">{group.name}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.values.map((value) => {
                        const active = selectedVariant.options[group.name] === value;
                        const isColor = group.name.toLowerCase() === "color" || group.name.toLowerCase() === "colour";
                        return (
                          <button
                            key={`${group.name}-${value}`}
                            type="button"
                            onClick={() => selectOption(group.name, value)}
                            aria-pressed={active}
                            className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ring-1 transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-600 ${active ? "bg-red-50 text-red-700 ring-red-600 shadow-sm dark:bg-red-950/20" : "bg-[var(--surface)] text-[var(--ink)] ring-[var(--line)] hover:ring-slate-400"}`}
                          >
                            {isColor ? <span className="size-5 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: colorStyle(value) }} /> : null}
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {variants.map((variant) => {
                const color = colorValue(variant.options);
                const entries = optionEntries(variant.options);
                const selected = variant.id === selectedVariant.id;
                const available = variant.isActive && variant.stock > 0;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => selectVariant(variant)}
                    disabled={!variant.isActive}
                    aria-pressed={selected}
                    className={`group rounded-lg p-3 text-left ring-1 transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-600 disabled:cursor-not-allowed disabled:opacity-50 ${selected ? "bg-red-50 ring-red-600 shadow-md dark:bg-red-950/20" : "bg-[var(--surface)] ring-[var(--line)] hover:ring-slate-400"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{variant.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{variant.sku}</p>
                      </div>
                      {selected ? <span className="grid size-7 place-items-center rounded-full bg-red-700 text-white"><Check size={15} /></span> : null}
                    </div>
                    {entries.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {entries.map(([name, value]) => {
                          const isColor = name.toLowerCase() === "color" || name.toLowerCase() === "colour";
                          return (
                            <span key={`${variant.id}-${name}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              {isColor ? <span className="size-3.5 rounded-full border border-slate-300" style={{ backgroundColor: colorStyle(value) }} /> : null}
                              {name}: {value}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="font-bold">{money(variant.price)}</span>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-black ${available ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200"}`}>
                        {available ? `${variant.stock} in stock` : "Out of stock"}
                      </span>
                      {color ? <span className="size-6 rounded-full border border-slate-300 shadow-inner" style={{ backgroundColor: colorStyle(color) }} title={color} /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <AddToCartButton productId={product.id} variantId={selectedVariant.id.endsWith(":default") ? null : selectedVariant.id} disabled={!inStock} />
          <Button type="button" variant="primary" onClick={() => {
            cart.add(product.id, 1, selectedVariant.id.endsWith(":default") ? null : selectedVariant.id);
            router.push("/checkout");
          }} disabled={!inStock}>Buy now</Button>
        </div>
        <ProductQuoteForm
          product={{ ...product, sku: selectedVariant.sku, price: selectedVariant.price }}
          variantId={selectedVariant.id.endsWith(":default") ? null : selectedVariant.id}
        />
        <div className="mt-6 rounded-lg bg-[var(--surface)] p-4 shadow-sm ring-1 ring-[var(--line)]">
          <div className="flex items-center gap-2 font-bold"><Truck size={19} /> Delivery</div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">City-wise, area-wise, weight-based, heavy-item, same-day, pickup, and free-threshold rules are editable in admin.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { Icon: ShieldCheck, title: "Secure checkout", body: "Protected order and customer details." },
            { Icon: PackageCheck, title: "Verified receipt", body: "QR + OTP delivery confirmation." },
            { Icon: RotateCcw, title: "Support ready", body: "Message admin from your account." }
          ].map(({ Icon, title, body }) => (
            <div key={title} className="border-t border-[var(--line)] pt-3 text-sm">
              <Icon className="text-red-700" size={18} />
              <p className="mt-2 font-black">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <h2 className="text-xl font-bold">Specifications</h2>
          <dl className="mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-lg bg-[var(--surface)] shadow-sm ring-1 ring-[var(--line)]">
            {product.specs.map((spec) => (
              <div key={spec.name} className="grid grid-cols-2 gap-4 p-3">
                <dt className="font-semibold text-slate-600 dark:text-slate-400">{spec.name}</dt>
                <dd>{spec.value}</dd>
              </div>
          ))}
        </dl>
        </div>
        </section>
      </div>

      {hasOptions ? (
        <section className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase text-safety">Child products</p>
              <h2 className="mt-2 text-3xl font-black">Choose your size and color</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Each option has its own SKU, stock, image, and price, so the cart keeps every variant separate.
              </p>
            </div>
            <span className="rounded-full bg-[var(--surface)] px-4 py-2 text-sm font-black text-[var(--muted)] shadow-sm ring-1 ring-[var(--line)]">
              {variants.length} variants
            </span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {variants.map((variant) => {
              const entries = optionEntries(variant.options);
              const color = colorValue(variant.options);
              const selected = variant.id === selectedVariant.id;
              const available = variant.isActive && variant.stock > 0;
              const childImage = resolveStoreImage(variant.imageUrl || product.image);
              return (
                <article
                  key={variant.id}
                  className={`store-editorial-card group overflow-hidden transition duration-200 hover:-translate-y-1 ${selected ? "ring-2 ring-red-500/30" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => selectVariant(variant)}
                    className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left dark:bg-slate-900"
                    aria-label={`Select ${variant.title}`}
                  >
                    <Image src={childImage} alt={`${product.name} ${variant.title}`} fill className="object-cover transition duration-500 group-hover:scale-[1.04]" sizes="(max-width: 768px) 100vw, 33vw" unoptimized={childImage.startsWith("data:")} />
                    {selected ? <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-full bg-red-700 text-white shadow-lg"><Check size={16} /></span> : null}
                    {color ? <span className="absolute right-3 top-3 size-8 rounded-full border-2 border-white shadow-lg" style={{ backgroundColor: colorStyle(color) }} title={color} /> : null}
                  </button>
                  <div className="p-4">
                    <button type="button" onClick={() => selectVariant(variant)} className="text-left focus:outline-none focus:ring-2 focus:ring-red-600">
                      <h3 className="text-lg font-black leading-snug">{product.name}</h3>
                      <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">{variant.title}</p>
                    </button>
                    {entries.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {entries.map(([name, value]) => {
                          const isColor = name.toLowerCase() === "color" || name.toLowerCase() === "colour";
                          return (
                            <span key={`${variant.id}-${name}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                              {isColor ? <span className="size-3.5 rounded-full border border-slate-300" style={{ backgroundColor: colorStyle(value) }} /> : null}
                              {name}: {value}
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-bold text-slate-500">{variant.sku}</p>
                        <div className="mt-1 flex flex-wrap items-baseline gap-2">
                          <strong className="text-xl">{money(variant.price)}</strong>
                          {variant.compareAtPrice ? <span className="text-sm text-slate-500 line-through">{money(variant.compareAtPrice)}</span> : null}
                        </div>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-black ${available ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200"}`}>
                        {available ? `${variant.stock} stock` : "Out"}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button type="button" variant={selected ? "primary" : "outline"} onClick={() => selectVariant(variant)} className="w-full">
                        {selected ? "Selected" : "Select"}
                      </Button>
                      <Button type="button" variant="accent" onClick={() => cart.add(product.id, 1, variant.id)} disabled={!available} className="w-full">
                        Add
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      <div className="fixed inset-x-0 bottom-[5rem] z-40 border-t border-[var(--line)] bg-white/95 p-3 shadow-2xl shadow-slate-950/15 backdrop-blur dark:bg-slate-950/95 md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-500">{selectedVariant.title}</p>
            <p className="font-black">{money(selectedVariant.price)}</p>
          </div>
          <Button type="button" variant="accent" onClick={() => cart.add(product.id, 1, selectedVariant.id.endsWith(":default") ? null : selectedVariant.id)} disabled={!inStock} className="shrink-0">
            Add to cart
          </Button>
          <Button type="button" variant="primary" onClick={() => {
            cart.add(product.id, 1, selectedVariant.id.endsWith(":default") ? null : selectedVariant.id);
            router.push("/checkout");
          }} disabled={!inStock} className="shrink-0">
            Buy
          </Button>
        </div>
      </div>
    </>
  );
}
