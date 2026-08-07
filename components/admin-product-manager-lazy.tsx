"use client";

import dynamic from "next/dynamic";

type Lookup = { id: string; name: string; slug: string };

const LazyProductManager = dynamic(
  () => import("@/components/admin-product-manager").then((module) => module.AdminProductManager),
  {
    ssr: false,
    loading: () => <div className="admin-surface h-[70vh] animate-pulse bg-slate-100 dark:bg-slate-900" aria-label="Loading product manager" />
  }
);

export function AdminProductManagerLazy({ categories, brands }: { categories: Lookup[]; brands: Lookup[] }) {
  return <LazyProductManager categories={categories} brands={brands} />;
}
