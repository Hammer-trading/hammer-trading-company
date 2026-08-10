"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { Ruler, Package, Layers, CheckCircle2, AlertCircle, Box } from "lucide-react";
import type { CatalogProduct, CatalogProductVariant, ProductSpec } from "@/lib/catalog";
import { resolveStoreImage } from "@/lib/store-image";
import { money } from "@/lib/utils";

type VisualChapterProps = {
  product: CatalogProduct;
  selectedVariant: CatalogProductVariant;
  variants: CatalogProductVariant[];
};

export function VisualProductChapters({ product, selectedVariant, variants }: VisualChapterProps) {
  const reduceMotion = useReducedMotion();
  
  // Only show specs chapter if real structured specs exist
  const hasSpecs = product.specs && product.specs.length > 0;
  
  // Only show dimensions if real dimension data exists (not invented)
  const dimensions = useMemo(() => {
    const spec = product.specs?.find((s) => s.name.toLowerCase().includes("dimension") || s.name.toLowerCase().includes("size"));
    if (!spec || !spec.value) return null;
    return spec.value;
  }, [product.specs]);
  
  // Only show compatibility if real compatibility data exists
  const compatibility = useMemo(() => {
    const spec = product.specs?.find((s) => s.name.toLowerCase().includes("compatibility") || s.name.toLowerCase().includes("compatible"));
    if (!spec || !spec.value) return null;
    return spec.value;
  }, [product.specs]);
  
  // Material/finish selection from real variant options
  const materialOptions = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const variant of variants) {
      for (const [key, value] of Object.entries(variant.options)) {
        if (!value) continue;
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("material") || lowerKey.includes("finish")) {
          const current = groups.get(key) || [];
          if (!current.includes(value)) groups.set(key, [...current, value]);
        }
      }
    }
    return Array.from(groups.entries()).map(([name, values]) => ({ name, values }));
  }, [variants]);
  
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  
  // Update variant when material/finish is selected
  const activeVariant = useMemo(() => {
    if (!selectedMaterial) return selectedVariant;
    const match = variants.find((v) => 
      Object.entries(v.options).some(([key, value]) => {
        const lowerKey = key.toLowerCase();
        return (lowerKey.includes("material") || lowerKey.includes("finish")) && value === selectedMaterial;
      })
    );
    return match || selectedVariant;
  }, [selectedMaterial, selectedVariant, variants]);

  // Room builder / complete build - only show if product has real room/package associations
  const hasRoomAssociation = product.category?.toLowerCase().includes("room") || 
                             product.tags?.some((t) => t.toLowerCase().includes("room") || t.toLowerCase().includes("package"));

  return (
    <div className="mt-10 space-y-12">
      {/* Material/Finish Selection Chapter */}
      {materialOptions.length > 0 ? (
        <section aria-labelledby="material-chapter-heading">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-sm font-bold uppercase text-slate-500">Material & Finish</p>
              <h2 id="material-chapter-heading" className="mt-2 text-2xl font-black">Select your preferred finish</h2>
            </div>
            {selectedMaterial ? (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-950/30 dark:text-red-200">
                {selectedMaterial}
              </span>
            ) : null}
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materialOptions.flatMap((group) =>
              group.values.map((value) => {
                const isActive = selectedMaterial === value;
                const variantForValue = variants.find((v) =>
                  Object.entries(v.options).some(([k, val]) => {
                    const lowerK = k.toLowerCase();
                    return (lowerK.includes("material") || lowerK.includes("finish")) && val === value;
                  })
                );
                const inStock = variantForValue ? variantForValue.stock > 0 : false;
                
                return (
                  <button
                    key={`${group.name}-${value}`}
                    type="button"
                    onClick={() => setSelectedMaterial(value)}
                    aria-pressed={isActive}
                    className={`group relative overflow-hidden rounded-lg p-4 text-left ring-1 transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-600 ${
                      isActive
                        ? "bg-red-50 ring-red-600 shadow-md dark:bg-red-950/20"
                        : "bg-[var(--surface)] ring-[var(--line)] hover:ring-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black">{value}</p>
                        {variantForValue && (
                          <>
                            <p className="mt-1 text-xs font-semibold text-slate-500">SKU: {variantForValue.sku}</p>
                            <p className="mt-1 font-bold">{money(variantForValue.price)}</p>
                          </>
                        )}
                      </div>
                      {isActive ? (
                        <CheckCircle2 size={20} className="text-red-600" />
                      ) : (
                        <Box size={20} className="text-slate-400" />
                      )}
                    </div>
                    {variantForValue && (
                      <div className="mt-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-black ${
                          inStock
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200"
                            : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-200"
                        }`}>
                          {inStock ? `${variantForValue.stock} in stock` : "Out of stock"}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>
      ) : null}

      {/* Specifications Chapter */}
      {hasSpecs ? (
        <section aria-labelledby="specs-chapter-heading">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase text-slate-500">Specifications</p>
            <h2 id="specs-chapter-heading" className="mt-2 text-2xl font-black">Technical details</h2>
          </div>
          
          <dl className="divide-y divide-[var(--line)] overflow-hidden rounded-lg bg-[var(--surface)] shadow-sm ring-1 ring-[var(--line)]">
            {product.specs.map((spec) => (
              <motion.div
                key={spec.name}
                className="grid grid-cols-2 gap-4 p-4"
                initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <dt className="font-semibold text-slate-600 dark:text-slate-400">{spec.name}</dt>
                <dd className="text-slate-900 dark:text-slate-100">{spec.value}</dd>
              </motion.div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* Dimensions Chapter - Only if real data exists */}
      {dimensions ? (
        <section aria-labelledby="dimensions-chapter-heading">
          <div className="mb-5 flex items-center gap-3">
            <Ruler className="text-red-700" size={22} />
            <div>
              <p className="text-sm font-bold uppercase text-slate-500">Dimensions</p>
              <h2 id="dimensions-chapter-heading" className="mt-1 text-xl font-black">Physical measurements</h2>
            </div>
          </div>
          
          <div className="rounded-lg bg-[var(--surface)] p-5 shadow-sm ring-1 ring-[var(--line)]">
            <p className="text-lg font-semibold text-[var(--ink)]">{dimensions}</p>
            <p className="mt-2 text-sm text-slate-500">Verify these measurements before ordering to ensure proper fit.</p>
          </div>
        </section>
      ) : null}

      {/* Compatibility Chapter - Only if real data exists */}
      {compatibility ? (
        <section aria-labelledby="compatibility-chapter-heading">
          <div className="mb-5 flex items-center gap-3">
            <Layers className="text-red-700" size={22} />
            <div>
              <p className="text-sm font-bold uppercase text-slate-500">Compatibility</p>
              <h2 id="compatibility-chapter-heading" className="mt-1 text-xl font-black">System requirements</h2>
            </div>
          </div>
          
          <div className="rounded-lg bg-[var(--surface)] p-5 shadow-sm ring-1 ring-[var(--line)]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 text-emerald-600" size={20} />
              <p className="text-sm leading-6 text-[var(--ink)]">{compatibility}</p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Room Builder / Complete Build - Only if real room association exists */}
      {hasRoomAssociation ? (
        <section aria-labelledby="room-builder-chapter-heading">
          <div className="mb-5 flex items-center gap-3">
            <Package className="text-red-700" size={22} />
            <div>
              <p className="text-sm font-bold uppercase text-slate-500">Complete Build</p>
              <h2 id="room-builder-chapter-heading" className="mt-1 text-xl font-black">Build your room</h2>
            </div>
          </div>
          
          <div className="rounded-lg bg-gradient-to-br from-red-50 to-orange-50 p-6 shadow-sm ring-1 ring-red-100 dark:from-red-950/20 dark:to-orange-950/20 dark:ring-red-900/30">
            <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
              This product is part of our room package collection. Configure a complete room solution with matching pieces and professional installation.
            </p>
            <a
              href="/home-service"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              Start Room Configuration
              <AlertCircle size={16} />
            </a>
          </div>
        </section>
      ) : null}

      {/* Empty state when no structured data exists - explicit fallback, no invented content */}
      {!hasSpecs && !dimensions && !compatibility && materialOptions.length === 0 && !hasRoomAssociation ? (
        <section aria-label="Product information unavailable">
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
            <AlertCircle className="mx-auto mb-3 text-slate-400" size={28} />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
              Detailed specifications and compatibility information will be added soon.
            </p>
            <p className="mt-1 text-xs text-slate-500">Contact support for technical inquiries about this product.</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
