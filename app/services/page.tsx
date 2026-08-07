import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, ShieldCheck } from "lucide-react";
import { DynamicMedia } from "@/components/storefront/dynamic-media";
import { PageHeroSlider } from "@/components/storefront/page-hero-slider";
import { getPublishedServices } from "@/lib/platform-content";
import { getPageHeroSlides } from "@/lib/storefront-banners";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Room Installation Services | Hammer Trading Company", description: "Book HTC-managed room hardware products and professional installation." };

export default async function ServicesPage() {
  const [services, slides] = await Promise.all([getPublishedServices(), getPageHeroSlides("SERVICES_HERO")]);
  return <main className="pb-16">
    <PageHeroSlider slides={slides} fallback={{ eyebrow: "Products plus professional installation", title: "HTC room services", description: "Our team reviews your space, confirms products and quantities, installs the hardware and manages the work through one service request." }}/>
    <div className="mx-auto -mt-6 grid max-w-[90rem] gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:px-10">
      <span className="relative z-10 inline-flex min-h-14 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold shadow-lg"><CalendarCheck size={17} className="text-red-700"/> Scheduled site visits</span>
      <span className="relative z-10 inline-flex min-h-14 items-center gap-2 rounded-md bg-white px-4 text-sm font-bold shadow-lg"><ShieldCheck size={17} className="text-red-700"/> Product and workmanship scope</span>
    </div>
    <section className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-10">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => <article key={service.id} className="premium-card group overflow-hidden">
          <Link href={`/services/${service.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100"><DynamicMedia src={service.coverImage} alt={service.imageAlt || service.name} className="transition duration-500 group-hover:scale-[1.04]"/><span className="absolute left-3 top-3 rounded-md bg-slate-950/85 px-3 py-1 text-[10px] font-black uppercase text-white">{service.serviceMode.replaceAll("_", " ")}</span></Link>
          <div className="p-5"><p className="text-xs font-black uppercase text-red-700">{service.category?.name || "Room service"}</p><h2 className="mt-2 font-display text-3xl font-black uppercase leading-none"><Link href={`/services/${service.slug}`}>{service.name}</Link></h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{service.shortDescription || service.description}</p><div className="mt-5 flex items-center justify-between gap-3"><strong>{service.fixedPrice ? money(Number(service.fixedPrice)) : service.startingPrice ? `From ${money(Number(service.startingPrice))}` : "Request quote"}</strong><Link href={`/services/${service.slug}`} className="grid size-10 place-items-center rounded-md bg-slate-950 text-white transition group-hover:bg-red-700" aria-label={`View ${service.name}`}><ArrowRight size={18}/></Link></div></div>
        </article>)}
      </div>
      {!services.length ? <div className="showroom-panel mt-8 border-dashed p-10 text-center"><h2 className="text-xl font-black">Services are being prepared</h2><p className="mt-2 text-sm text-slate-500">Published services will appear here automatically after the admin enables them.</p></div> : null}
    </section>
  </main>;
}
