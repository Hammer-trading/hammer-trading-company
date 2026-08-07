import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Hammer } from "lucide-react";
import { DynamicMedia } from "@/components/storefront/dynamic-media";
import { PageHeroSlider } from "@/components/storefront/page-hero-slider";
import { getPublishedProjects } from "@/lib/platform-content";
import { getPageHeroSlides } from "@/lib/storefront-banners";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Projects | Hammer Trading Company", description: "Explore upcoming, ongoing and completed HTC hardware installation projects." };

export default async function ProjectsPage() {
  const [projects, slides] = await Promise.all([getPublishedProjects(), getPageHeroSlides("PROJECTS_HERO")]);
  return <main className="pb-16">
    <PageHeroSlider slides={slides} fallback={{ eyebrow: "Work in the field", title: "Projects and progress", description: "See what HTC is preparing, installing and completing, with real media, documented progress and the products used." }}/>
    <section className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-10">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => <article key={project.id} className="premium-card group overflow-hidden">
          <Link href={`/projects/${project.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-100"><DynamicMedia src={project.coverImage || project.media[0]?.url || project.media[0]?.mediaAsset?.url} alt={project.imageAlt || project.title} className="transition duration-500 group-hover:scale-[1.04]"/><span className="absolute left-3 top-3 rounded-md bg-slate-950/85 px-3 py-1 text-xs font-black uppercase text-white">{project.projectStatus.replaceAll("_", " ")}</span></Link>
          <div className="p-5"><p className="text-xs font-black uppercase text-red-700">{project.category?.name || project.location || "HTC project"}</p><h2 className="mt-2 font-display text-3xl font-black uppercase leading-none"><Link href={`/projects/${project.slug}`}>{project.title}</Link></h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{project.shortDescription || project.description}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><span className="block h-full origin-left bg-red-700" style={{ transform: `scaleX(${Math.max(0, Math.min(100, project.progressPercent)) / 100})` }}/></div><div className="mt-3 flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{project.progressPercent}% complete · {project.products.length} products</span><Link href={`/projects/${project.slug}`} className="grid size-10 place-items-center rounded-md bg-slate-950 text-white transition group-hover:bg-red-700" aria-label={`View ${project.title}`}><ArrowRight size={18}/></Link></div></div>
        </article>)}
      </div>
      {!projects.length ? <div className="showroom-panel mt-8 border-dashed p-10 text-center"><Hammer className="mx-auto text-slate-400"/><h2 className="mt-3 text-xl font-black">No published projects yet</h2><p className="mt-2 text-sm text-slate-500">Upcoming, ongoing and completed work will appear here after admin publishing.</p></div> : null}
    </section>
  </main>;
}
