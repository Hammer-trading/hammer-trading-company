import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, CheckCircle2, MapPin, Target } from "lucide-react";
import { DynamicMedia } from "@/components/storefront/dynamic-media";
import { PageHeroSlider } from "@/components/storefront/page-hero-slider";
import { getPublishedAboutPage } from "@/lib/platform-content";
import { getPageHeroSlides, type HeroSlide } from "@/lib/storefront-banners";

export const dynamic = "force-dynamic";

type AboutStat = { value: string; label: string };
type AboutMilestone = { year: string; title: string; description?: string };

function objectArray<T>(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is T => Boolean(entry && typeof entry === "object")) : [];
}

export async function generateMetadata(): Promise<Metadata> {
  const about = await getPublishedAboutPage();
  return {
    title: about?.seoTitle || "About Hammer Trading Company",
    description: about?.seoDescription || about?.heroSubtitle || "Learn about Hammer Trading Company's hardware, room solutions and professional installation work."
  };
}

export default async function AboutPage() {
  const [about, bannerSlides] = await Promise.all([getPublishedAboutPage(), getPageHeroSlides("ABOUT_HERO")]);
  const fallbackSlide: HeroSlide[] = about?.heroImage ? [{
    id: about.id,
    title: about.heroTitle,
    subtitle: about.heroSubtitle,
    image: about.heroImage,
    mobileImage: null,
    href: null,
    sortOrder: 0
  }] : [];
  const slides = bannerSlides.length ? bannerSlides : fallbackSlide;
  const values = about?.values || ["Reliable product guidance", "Transparent project scope", "Responsible after-sales support"];
  const stats = objectArray<AboutStat>(about?.stats);
  const milestones = objectArray<AboutMilestone>(about?.milestones);
  const gallery = Array.isArray(about?.gallery) ? about.gallery.map(String).filter(Boolean) : [];

  return <main className="pb-16">
    <PageHeroSlider slides={slides} fallback={{
      eyebrow: about?.eyebrow || "Hammer Trading Company",
      title: about?.heroTitle || "Hardware expertise, built around real spaces",
      description: about?.heroSubtitle || "HTC brings products, complete room bundles and professional installation into one accountable customer experience."
    }}/>

    <section className="mx-auto grid max-w-[90rem] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)] lg:px-10 lg:py-20">
      <div><p className="showroom-eyebrow text-red-700">Who we are</p><h2 className="mt-3 max-w-4xl font-display text-5xl font-black uppercase leading-[.92] sm:text-6xl">{about?.introTitle || "A practical hardware partner from product selection to installed result"}</h2><p className="mt-6 max-w-3xl whitespace-pre-line text-base leading-8 text-slate-600">{about?.introBody || "Hammer Trading Company helps customers select dependable hardware, buy complete room product bundles, and book managed installation services. Our catalog, service quotations and project records stay connected so the customer always knows what is being supplied and what work is being performed."}</p></div>
      <div className="border-l-2 border-red-700 pl-6"><Target className="text-red-700"/><h3 className="mt-4 font-display text-3xl font-black uppercase">Our standard</h3><div className="mt-5 grid gap-3">{values.map((value) => <p key={value} className="flex items-start gap-3 text-sm font-bold leading-6"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600"/>{value}</p>)}</div></div>
    </section>

    {stats.length ? <section className="bg-slate-950 text-white"><div className="mx-auto grid max-w-[90rem] grid-cols-2 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-10">{stats.map((stat) => <div key={`${stat.value}-${stat.label}`} className="border-white/10 p-4 even:border-l lg:border-l"><strong className="font-display text-5xl font-black text-red-300">{stat.value}</strong><p className="mt-2 text-xs font-bold uppercase text-slate-300">{stat.label}</p></div>)}</div></section> : null}

    <section className="mx-auto grid max-w-[90rem] gap-5 px-4 py-14 sm:px-6 md:grid-cols-2 lg:px-10">
      <div className="border-t-4 border-red-700 bg-slate-100 p-6"><p className="showroom-eyebrow text-red-700">Mission</p><h2 className="mt-3 font-display text-4xl font-black uppercase">Make every scope clear</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{about?.mission || "Supply the right hardware, communicate quantities and pricing clearly, and complete installation work to an agreed scope."}</p></div>
      <div className="border-t-4 border-slate-950 bg-slate-100 p-6"><p className="showroom-eyebrow text-red-700">Vision</p><h2 className="mt-3 font-display text-4xl font-black uppercase">One connected experience</h2><p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{about?.vision || "Build a trusted hardware platform where products, room bundles, services and completed projects remain connected from first enquiry to final handover."}</p></div>
    </section>

    {gallery.length ? <section className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{gallery.slice(0, 9).map((image, index) => <div key={`${image}-${index}`} className={`relative overflow-hidden bg-slate-100 ${index === 0 ? "aspect-[16/10] sm:col-span-2" : "aspect-[4/3]"}`}><DynamicMedia src={image} alt={`Hammer Trading Company gallery ${index + 1}`}/></div>)}</div></section> : null}

    {milestones.length ? <section className="mx-auto max-w-[90rem] px-4 py-14 sm:px-6 lg:px-10"><p className="showroom-eyebrow text-red-700">Company timeline</p><h2 className="mt-2 font-display text-5xl font-black uppercase">Built one milestone at a time</h2><div className="mt-8 grid gap-0 border-l border-slate-300">{milestones.map((milestone) => <div key={`${milestone.year}-${milestone.title}`} className="relative grid gap-2 border-b border-slate-200 py-6 pl-7 sm:grid-cols-[120px_1fr]"><span className="absolute -left-1.5 top-8 size-3 rounded-full bg-red-700"/><strong className="font-mono text-red-700">{milestone.year}</strong><div><h3 className="font-black">{milestone.title}</h3>{milestone.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{milestone.description}</p> : null}</div></div>)}</div></section> : null}

    <section className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 lg:px-10"><div className="grid gap-8 bg-red-700 p-7 text-white sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end"><div><Award size={28}/><h2 className="mt-4 font-display text-5xl font-black uppercase leading-none">{about?.ctaTitle || "Plan your next room with HTC"}</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-red-50">{about?.ctaText || "Browse a supply-only room bundle or speak with our team about a complete product and installation service."}</p>{about?.serviceAreas?.length ? <p className="mt-4 flex items-center gap-2 text-xs font-bold uppercase"><MapPin size={15}/>{about.serviceAreas.join(" · ")}</p> : null}</div><Link href={about?.ctaHref || "/services"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-black text-red-700 transition hover:-translate-y-0.5">{about?.ctaLabel || "Explore our services"}<ArrowRight size={17}/></Link></div></section>
  </main>;
}
