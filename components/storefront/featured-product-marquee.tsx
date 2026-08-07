"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MarqueeProduct = { id: string; name: string; slug: string; image: string; price: number };

export function FeaturedProductMarquee() {
  const sectionRef = useRef<HTMLElement>(null);
  const [products, setProducts] = useState<MarqueeProduct[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let active = true;
    const load = () => {
      fetch("/api/search?limit=8", { cache: "force-cache" })
        .then((response) => response.ok ? response.json() : { products: [] })
        .then((data) => {
          if (active) setProducts(Array.isArray(data.products) ? data.products.slice(0, 8) : []);
        })
        .catch(() => undefined)
        .finally(() => { if (active) setReady(true); });
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: "500px" });
    observer.observe(section);
    return () => { active = false; observer.disconnect(); };
  }, []);

  const repeated = [...products, ...products];
  return (
    <section ref={sectionRef} className="min-h-[7.25rem] overflow-hidden border-y border-[var(--line)] bg-[#f0f1ee] py-5 dark:bg-[#111517]" aria-label="Featured products" aria-busy={!ready}>
      {products.length ? <div className="featured-product-track flex w-max gap-3 px-3 hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
        {repeated.map((product, index) => {
          const duplicate = index >= products.length;
          return <Link key={`${product.id}-${index}`} href={`/products/${product.slug}`} aria-hidden={duplicate || undefined} tabIndex={duplicate ? -1 : 0} className="group grid w-[17rem] shrink-0 grid-cols-[4.5rem_1fr_auto] items-center gap-3 rounded-lg bg-white p-2.5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-[#1a2023] sm:w-[20rem]">
            <span className="relative aspect-square overflow-hidden rounded-md bg-slate-100"><Image src={product.image} alt="" fill className="object-cover transition duration-300 group-hover:scale-105" sizes="72px" /></span>
            <span className="min-w-0"><span className="block truncate text-xs font-black uppercase text-slate-950 dark:text-white">{product.name}</span><span className="mt-1 block font-mono text-xs font-bold text-red-700 dark:text-red-400">PKR {Number(product.price).toLocaleString()}</span></span>
            <ArrowUpRight size={17} className="text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-red-700" />
          </Link>;
        })}
      </div> : <div className="mx-auto flex h-[4.75rem] max-w-[90rem] items-center gap-3 px-4" aria-hidden="true">{[1,2,3,4].map((item) => <span key={item} className="h-full w-72 shrink-0 animate-pulse rounded-lg bg-slate-200/70" />)}</div>}
    </section>
  );
}
