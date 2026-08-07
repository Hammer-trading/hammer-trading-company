"use client";

import Image from "next/image";
import { Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

export type SharedProductVariant = {
  id: string | null;
  title: string;
  sku: string;
  price: number;
  stock: number;
  imageUrl: string;
};

export type SharedProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category: string;
  image: string;
  price: number;
  stock: number;
  variants: SharedProductVariant[];
};

export type SelectedSharedProduct = {
  product: SharedProduct;
  variant: SharedProductVariant;
};

export function ProductSelector({
  open,
  selected,
  onSelect,
  onClose
}: {
  open: boolean;
  selected?: SelectedSharedProduct | null;
  onSelect: (selection: SelectedSharedProduct) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SharedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`/api/chat/products?q=${encodeURIComponent(query)}&limit=16`, { cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() : response.json().then((body) => Promise.reject(new Error(body.error || "Product search failed"))))
        .then((data: { products?: SharedProduct[] }) => setProducts(Array.isArray(data.products) ? data.products : []))
        .catch((reason) => {
          if (controller.signal.aborted) return;
          setError(reason instanceof Error ? reason.message : "Product search failed");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const selectedKey = useMemo(() => selected ? `${selected.product.id}:${selected.variant.id || ""}` : "", [selected]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-slate-950/55 p-2 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Share product">
      <div className="mx-auto flex h-[calc(100dvh-1rem)] max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:max-h-[92vh] sm:h-auto sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-slate-800 sm:p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-700">Share product</p>
            <h2 className="text-base font-black sm:text-lg">Select one exact product or variant</h2>
          </div>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-red-300 hover:text-red-700 dark:border-slate-800 dark:text-slate-300" aria-label="Close product selector"><X size={18} /></button>
        </div>
        <div className="border-b border-slate-200 p-3 dark:border-slate-800 sm:p-4">
          <label className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 dark:border-slate-800">
            <Search size={18} className="text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} autoFocus className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" placeholder="Search name, SKU, category, brand, variant..." />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" data-lenis-prevent>
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">{error}</div> : null}
          {loading ? <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />)}</div> : null}
          {!loading && !products.length && !error ? (
            <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-slate-300 text-center text-sm text-slate-500 dark:border-slate-800">
              <div><ShoppingBag className="mx-auto mb-2 text-slate-400" />No products found.</div>
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="flex gap-3">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                    <Image src={product.image} alt={product.name} fill unoptimized className="object-cover" sizes="80px" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-red-700">{product.brand} / {product.category}</p>
                    <h3 className="mt-1 line-clamp-2 font-black leading-tight">{product.name}</h3>
                    <p className="mt-1 font-mono text-[11px] font-bold text-slate-500">{product.sku}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {product.variants.map((variant) => {
                    const key = `${product.id}:${variant.id || ""}`;
                    const active = key === selectedKey;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => onSelect({ product, variant })}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-xs transition ${active ? "border-red-600 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-100" : "border-slate-200 hover:border-red-200 dark:border-slate-800"}`}
                      >
                        <span className="min-w-0">
                          <strong className="block truncate">{variant.title}</strong>
                          <span className="block truncate font-mono text-[10px] opacity-70">{variant.sku}</span>
                        </span>
                        <span className="text-right">
                          <strong className="block">{money(variant.price)}</strong>
                          <span className={variant.stock > 0 ? "text-emerald-700" : "text-red-700"}>{variant.stock > 0 ? `${variant.stock} in stock` : "Out of stock"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 p-3 dark:border-slate-800 sm:gap-3 sm:p-4">
          <p className="min-w-0 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">{selected ? `${selected.product.name} / ${selected.variant.title}` : "No product selected"}</p>
          <Button type="button" variant="accent" disabled={!selected} onClick={onClose}>Use product</Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
