"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { brands, categories } from "@/lib/catalog";

export function ProductFilters({ categories: categoryOptions = categories, brands: brandOptions = brands }: { categories?: string[]; brands?: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [query, setQuery] = useState(params.get("q") || "");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setQuery(params.get("q") || "");
  }, [params]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((params.get("q") || "") !== query.trim()) update("q", query.trim());
    }, 320);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all" || value === "") next.delete(key);
    else next.set(key, value);
    const search = next.toString();
    router.push(search ? `/products?${search}` : "/products");
  }

  function clearOne(key: string) {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    const search = next.toString();
    router.push(search ? `/products?${search}` : "/products");
  }

  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];
    const q = params.get("q");
    const category = params.get("category");
    const brand = params.get("brand");
    const sort = params.get("sort");
    if (q) items.push({ key: "q", label: `Search: ${q}` });
    if (category) items.push({ key: "category", label: category });
    if (brand) items.push({ key: "brand", label: brand });
    if (params.get("best") === "true") items.push({ key: "best", label: "Best sellers" });
    if (params.get("discount") === "true") items.push({ key: "discount", label: "Discounts" });
    if (sort) items.push({ key: "sort", label: `Sort: ${sort.replaceAll("-", " ")}` });
    return items;
  }, [params]);

  const controls = (
    <div className="space-y-5">
      <label className="block text-xs font-black uppercase text-[var(--ink)]">
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="store-input mt-2 w-full" placeholder="SKU, tool, brand" />
      </label>
      <label className="block text-xs font-black uppercase text-[var(--ink)]">
        Category
        <select value={params.get("category") || "all"} onChange={(event) => update("category", event.target.value)} className="store-input mt-2 w-full">
          <option value="all">All categories</option>
          {categoryOptions.map((category) => <option key={category}>{category}</option>)}
        </select>
      </label>
      <label className="block text-xs font-black uppercase text-[var(--ink)]">
        Brand
        <select value={params.get("brand") || "all"} onChange={(event) => update("brand", event.target.value)} className="store-input mt-2 w-full">
          <option value="all">All brands</option>
          {brandOptions.map((brand) => <option key={brand}>{brand}</option>)}
        </select>
      </label>
      <label className="block text-xs font-black uppercase text-[var(--ink)]">
        Sort
        <select value={params.get("sort") || "featured"} onChange={(event) => update("sort", event.target.value)} className="store-input mt-2 w-full">
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to high</option>
          <option value="price-desc">Price: High to low</option>
          <option value="best-sellers">Best sellers</option>
          <option value="stock-low">Low stock first</option>
          <option value="new-arrivals">New arrivals</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2 text-xs font-bold text-[var(--ink)]">
        <label className="flex min-h-11 items-center gap-2 rounded-lg bg-[var(--surface)] px-3 shadow-sm ring-1 ring-[var(--line)]"><input type="checkbox" className="accent-red-700" checked={params.get("best") === "true"} onChange={(event) => update("best", event.target.checked ? "true" : "")} /> Best sellers</label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg bg-[var(--surface)] px-3 shadow-sm ring-1 ring-[var(--line)]"><input type="checkbox" className="accent-red-700" checked={params.get("discount") === "true"} onChange={(event) => update("discount", event.target.checked ? "true" : "")} /> Discounts</label>
      </div>
    </div>
  );

  return (
    <div className="store-filter-panel border-b border-[var(--line)] pb-5 lg:border-b-0 lg:pb-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-black uppercase text-[var(--ink)]"><SlidersHorizontal size={17} /> Filters</h2>
        <button className="min-h-10 rounded-lg bg-slate-950 px-4 text-xs font-black text-white lg:hidden" onClick={() => setOpen(true)}>Open filters</button>
      </div>
      {activeFilters.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.map((item) => (
            <button key={item.key} onClick={() => clearOne(item.key)} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-red-50 px-3 text-[10px] font-black capitalize text-red-700 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-200">
              {item.label}<X size={13} />
            </button>
          ))}
          <button onClick={() => router.push("/products")} className="min-h-8 rounded-full bg-[var(--surface)] px-3 text-[10px] font-black text-[var(--muted)] shadow-sm ring-1 ring-[var(--line)]">Clear all</button>
        </div>
      ) : null}
      <div className="mt-4 hidden lg:block">{controls}</div>
      {mounted ? createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div className="fixed inset-0 z-[80] bg-slate-950/55 p-3 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button className="absolute inset-0" aria-label="Close filters" onClick={() => setOpen(false)} />
              <motion.div role="dialog" aria-modal="true" aria-label="Product filters" data-lenis-prevent className="absolute inset-x-3 bottom-3 max-h-[88dvh] overflow-y-auto rounded-lg bg-[var(--surface)] p-5 text-[var(--ink)] shadow-2xl" initial={reduceMotion ? false : { y: "110%" }} animate={{ y: 0 }} exit={{ y: "110%" }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-black">Product filters</h3>
                  <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white" aria-label="Close filters"><X size={18} /></button>
                </div>
                {controls}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body
      ) : null}
      </div>
  );
}
