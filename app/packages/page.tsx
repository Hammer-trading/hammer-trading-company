import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes } from "lucide-react";
import { DynamicMedia } from "@/components/storefront/dynamic-media";
import { PageHeroSlider } from "@/components/storefront/page-hero-slider";
import { getPublishedPackages, packageAvailableStock } from "@/lib/platform-content";
import { getPageHeroSlides } from "@/lib/storefront-banners";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Room Packages | Hammer Trading Company", description: "Complete supply-only room hardware bundles built from live HTC product inventory." };

export default async function PackagesPage() {
  const [packages, slides] = await Promise.all([getPublishedPackages(), getPageHeroSlides("PACKAGES_HERO")]);
  return <main className="pb-16">
    <PageHeroSlider slides={slides} fallback={{ eyebrow: "Supply-only room bundles", title: "Complete room packages", description: "Buy the hardware required for a complete room as one stock-checked bundle. Professional HTC installation can be booked separately." }}/>
    <section className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-10">
      <div className="mb-7 grid gap-3 border-b border-slate-200 pb-6 sm:grid-cols-3">
        {["Exact products and variants", "One live bundle price", "Optional HTC installation"].map((label, index) => <p key={label} className="text-sm font-bold"><strong className="mr-2 text-red-700">0{index + 1}</strong>{label}</p>)}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((bundle) => {
          const stock = packageAvailableStock(bundle.items);
          return <article key={bundle.id} className="premium-card group overflow-hidden">
            <Link href={`/packages/${bundle.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
              <DynamicMedia src={bundle.coverImage} alt={bundle.imageAlt || bundle.name} className="transition duration-500 group-hover:scale-[1.04]"/>
              <span className="absolute left-3 top-3 rounded-md bg-white/95 px-3 py-1 text-[10px] font-black uppercase text-slate-950 shadow-sm">{bundle.roomType} · {bundle.tier}</span>
              {bundle.badge ? <span className="absolute right-3 top-3 rounded-md bg-red-700 px-3 py-1 text-xs font-black uppercase text-white">{bundle.badge}</span> : null}
            </Link>
            <div className="p-5">
              <p className="text-xs font-black uppercase text-red-700">{bundle.category?.name || `${bundle.items.length} product bundle`}</p>
              <h2 className="mt-2 font-display text-3xl font-black uppercase leading-none"><Link href={`/packages/${bundle.slug}`}>{bundle.name}</Link></h2>
              <p className="mt-3 line-clamp-2 text-sm text-slate-600">{bundle.shortDescription || bundle.description}</p>
              <div className="mt-4 flex items-end justify-between">
                <div><strong className="text-xl text-red-700">{money(Number(bundle.finalPrice))}</strong>{Number(bundle.originalPrice) > Number(bundle.finalPrice) ? <del className="ml-2 text-sm text-slate-400">{money(Number(bundle.originalPrice))}</del> : null}<p className={`mt-1 text-xs font-bold ${stock > 0 ? "text-emerald-700" : "text-red-700"}`}>{stock > 0 ? `${stock} bundles available` : "Out of stock"}</p></div>
                <Link href={`/packages/${bundle.slug}`} className="grid size-10 place-items-center rounded-md bg-slate-950 text-white transition group-hover:bg-red-700" aria-label={`View ${bundle.name}`}><ArrowRight size={18}/></Link>
              </div>
            </div>
          </article>;
        })}
      </div>
      {!packages.length ? <div className="showroom-panel mt-8 border-dashed p-10 text-center"><Boxes className="mx-auto text-slate-400"/><h2 className="mt-3 text-xl font-black">No published packages yet</h2><p className="mt-2 text-sm text-slate-500">Admin-created supply bundles will appear here automatically.</p></div> : null}
    </section>
  </main>;
}
