"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Boxes, Command, Loader2, PackageSearch, Search, ShoppingCart, Sparkles, X, Zap } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { money } from "@/lib/utils";

type SearchProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  image: string;
  rating: number;
  isBestSeller?: boolean;
  isFeatured?: boolean;
};

type SearchPayload = {
  products: SearchProduct[];
  categories: Array<{ name: string; href: string }>;
  actions: Array<{ label: string; href: string; hint: string }>;
};

const emptyPayload: SearchPayload = { products: [], categories: [], actions: [] };

export function SmartCommandPalette() {
  const router = useRouter();
  const cart = useCart();
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<SearchPayload>(emptyPayload);

  useEffect(() => {
    if (window.sessionStorage.getItem("hammer-open-command-palette") === "1") {
      window.sessionStorage.removeItem("hammer-open-command-palette");
      setOpen(true);
    }
    const openPalette = () => {
      window.sessionStorage.removeItem("hammer-open-command-palette");
      setOpen(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (!typing && event.key === "/") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("hammer:open-command-palette", openPalette);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("hammer:open-command-palette", openPalette);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=8`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search failed");
        setPayload(await response.json());
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setPayload(emptyPayload);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 120);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const visibleActions = useMemo(() => {
    const term = query.toLowerCase();
    if (!term) return payload.actions;
    return payload.actions.filter((action) => [action.label, action.hint].join(" ").toLowerCase().includes(term));
  }, [payload.actions, query]);

  const navigate = (href: string) => {
    setOpen(false);
    if (href.startsWith("/api/")) window.location.assign(href);
    else router.push(href);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button aria-label="Close smart search" className="absolute inset-0 cursor-default" onClick={() => setOpen(false)} />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label="Smart product search"
            className="relative mx-auto mt-16 max-h-[82dvh] max-w-3xl overflow-hidden rounded-3xl border border-white/55 bg-white/[0.95] shadow-[0_30px_110px_rgba(15,23,42,0.38)] backdrop-blur-2xl"
            initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <div className="border-b border-cyan-100/15 bg-[linear-gradient(118deg,#173a42,#102b33_62%,#6f1822)] p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/12 text-white ring-1 ring-white/20">
                  <Command size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-red-100">Smart command center</p>
                  <h2 className="truncate text-lg font-black">Search products, categories, orders, admin</h2>
                </div>
                <button className="grid size-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20" onClick={() => setOpen(false)} aria-label="Close search">
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/12 px-4 py-3 shadow-inner">
                <Search size={19} className="shrink-0 text-red-100" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Type drill, hammer, SKU, category..."
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white placeholder:text-white/60 outline-none"
                />
                {loading ? <Loader2 className="animate-spin text-red-100" size={18} /> : <kbd className="hidden rounded-lg border border-white/15 px-2 py-1 text-[11px] font-bold text-white/70 sm:block">Ctrl K</kbd>}
              </div>
            </div>

            <div className="max-h-[62dvh] overflow-y-auto p-4">
              <div className="grid gap-3 md:grid-cols-[1.3fr_.7fr]">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="inline-flex items-center gap-2 text-sm font-black uppercase text-slate-500"><PackageSearch size={16} /> Products</h3>
                    <Link href={`/products${query ? `?q=${encodeURIComponent(query)}` : ""}`} onClick={() => setOpen(false)} className="text-xs font-black text-red-700 hover:text-red-900">View all</Link>
                  </div>
                  {payload.products.length ? payload.products.map((product) => (
                    <article key={product.id} className="group rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition hover:border-red-200 hover:shadow-glow">
                      <div className="flex gap-3">
                        <button onClick={() => navigate(`/products/${product.slug}`)} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100 text-left">
                          <Image src={product.image} alt={product.name} fill className="object-cover transition group-hover:scale-110" sizes="80px" />
                        </button>
                        <div className="min-w-0 flex-1 py-1">
                          <button onClick={() => navigate(`/products/${product.slug}`)} className="block truncate text-left text-sm font-black text-ink hover:text-red-700">{product.name}</button>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{product.brand} / {product.category} / {product.sku}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <strong className="text-sm">{money(product.price)}</strong>
                            {product.compareAtPrice ? <span className="text-xs text-slate-500 line-through">{money(product.compareAtPrice)}</span> : null}
                            <span className={product.stock > 10 ? "text-xs font-bold text-emerald-700" : "text-xs font-bold text-orange-600"}>{product.stock > 0 ? `${product.stock} stock` : "Out of stock"}</span>
                          </div>
                        </div>
                        <div className="grid shrink-0 gap-2 self-center">
                          <button disabled={product.stock <= 0} onClick={() => cart.add(product.id)} className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Add ${product.name} to cart`}>
                            <ShoppingCart size={16} />
                          </button>
                          <button disabled={product.stock <= 0} onClick={() => navigate(`/buy-now/${product.slug}`)} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-red-700 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Buy ${product.name} now`}>
                            <Zap size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <Sparkles className="mx-auto text-slate-400" size={24} />
                      <p className="mt-2 text-sm font-bold text-slate-600">No product matched. Try SKU, brand, or category.</p>
                    </div>
                  )}
                </div>

                <aside className="space-y-4">
                  <div>
                    <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-black uppercase text-slate-500"><Boxes size={16} /> Categories</h3>
                    <div className="grid gap-2">
                      {payload.categories.map((category) => (
                        <button key={category.name} onClick={() => navigate(category.href)} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-bold transition hover:border-red-200 hover:text-red-700">
                          {category.name}<ArrowRight size={15} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-sm font-black uppercase text-slate-500">Quick actions</h3>
                    <div className="grid gap-2">
                      {visibleActions.map((action) => (
                        <button key={action.href} onClick={() => navigate(action.href)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-red-200 hover:bg-white">
                          <span className="block text-sm font-black text-slate-800">{action.label}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{action.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
