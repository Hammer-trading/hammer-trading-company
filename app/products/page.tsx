import { PackageSearch, ShieldCheck, SlidersHorizontal, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductFilters } from "@/components/product-filters";
import { SectionReveal, StaggerItem, StaggerReveal } from "@/components/section-reveal";
import {
  filterStorefrontProducts,
  getStorefrontBrands,
  getStorefrontCategories,
  getStorefrontProducts,
  toProductCardSummary
} from "@/lib/storefront-products";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; brand?: string; best?: string; discount?: string; sort?: string }> }) {
  const params = await searchParams;
  const [allProducts, categories, brands] = await Promise.all([getStorefrontProducts(), getStorefrontCategories(), getStorefrontBrands()]);
  const products = filterStorefrontProducts(allProducts, params.q, params.category, params.brand, params.best, params.discount).sort((a, b) => {
    switch (params.sort) {
      case "price-asc": return a.price - b.price;
      case "price-desc": return b.price - a.price;
      case "best-sellers": return Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller));
      case "stock-low": return a.stock - b.stock;
      case "new-arrivals": return Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
      default: return Number(Boolean(b.isFeatured || b.isBestSeller)) - Number(Boolean(a.isFeatured || a.isBestSeller));
    }
  });

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <section className="store-catalog-hero border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto max-w-[92rem] px-4 py-10 sm:px-6 sm:py-12 lg:px-8 xl:px-10">
          <p className="store-eyebrow inline-flex items-center gap-2"><PackageSearch size={14} aria-hidden="true" /> Live product catalogue</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-4xl font-display text-5xl font-black leading-[0.88] text-[var(--ink)] sm:text-6xl lg:text-7xl">Tools and hardware for the exact job.</h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">Search the real catalogue by SKU, category, brand, discount or stock, then configure the exact size, color and inch variant.</p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-bold text-[var(--muted)]">
              <span className="inline-flex items-center gap-2"><Truck size={16} className="text-red-700 dark:text-red-400" /> Delivery quote</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-red-700 dark:text-red-400" /> Secure checkout</span>
            </div>
          </div>
        </div>
      </section>

      <div className="store-catalog-layout mx-auto grid max-w-[92rem] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 xl:px-10">
        <aside className="h-fit lg:sticky lg:top-[156px]">
          <ProductFilters categories={categories} brands={brands} />
        </aside>
        <SectionReveal>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
            <div>
              <p className="store-eyebrow inline-flex items-center gap-2"><SlidersHorizontal size={14} aria-hidden="true" /> Filtered collection</p>
              <h2 className="mt-2 font-display text-4xl font-black leading-none text-[var(--ink)]">{products.length} product{products.length === 1 ? "" : "s"}</h2>
            </div>
            <span className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-[10px] font-black uppercase text-[var(--muted)] shadow-sm">{(params.sort || "featured").replaceAll("-", " ")}</span>
          </div>
          {products.length ? (
            <StaggerReveal slow className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 2xl:grid-cols-4">
              {products.map((product, index) => (
                <StaggerItem key={product.id} from="top" slow>
                  <ProductCard product={toProductCardSummary(product)} index={index} desktopColumns={4} />
                </StaggerItem>
              ))}
            </StaggerReveal>
          ) : (
            <div className="grid min-h-72 place-items-center border-y border-[var(--line)] text-center text-[var(--muted)]">
              <div><PackageSearch className="mx-auto text-red-700 dark:text-red-400" size={30} /><p className="mt-4 font-bold">No products match these filters.</p><p className="mt-1 text-sm">Clear a filter or search for another product.</p></div>
            </div>
          )}
        </SectionReveal>
      </div>
    </div>
  );
}
