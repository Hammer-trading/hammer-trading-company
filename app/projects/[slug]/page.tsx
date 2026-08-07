import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CheckCircle2, CircleDot, MapPin, PackageCheck, Wrench } from "lucide-react";
import { DynamicMedia } from "@/components/storefront/dynamic-media";
import { getPublishedProject } from "@/lib/platform-content";

type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  return project
    ? { title: project.seoTitle || `${project.title} | HTC Projects`, description: project.seoDescription || project.shortDescription }
    : { title: "Project not found" };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) notFound();

  const videos = project.media.filter((entry) => entry.type === "VIDEO" || /\.(mp4|webm)(?:$|\?)/i.test(entry.url));
  const gallery = project.media.filter((entry) => !videos.some((video) => video.id === entry.id));

  return (
    <main className="pb-16 pt-24">
      <section className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10">
        <div className="relative aspect-[16/8] overflow-hidden rounded-lg bg-slate-100">
          <DynamicMedia src={project.coverImage || gallery[0]?.url} alt={project.imageAlt || project.title} priority />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <p className="showroom-eyebrow text-red-700">{project.category?.name || "HTC field work"}</p>
            <h1 className="mt-3 font-display text-6xl font-black uppercase leading-[.85]">{project.title}</h1>
            {project.shortDescription ? <p className="mt-5 text-lg font-semibold leading-8 text-slate-700">{project.shortDescription}</p> : null}
            <p className="mt-6 whitespace-pre-line leading-8 text-slate-600">{project.description}</p>
          </div>
          <aside className="showroom-panel h-fit p-5 lg:sticky lg:top-24">
            <p className="rounded-md bg-slate-950 px-3 py-2 text-center text-xs font-black uppercase text-white">{project.projectStatus.replaceAll("_", " ")}</p>
            <div className="mt-4"><div className="flex items-center justify-between text-xs font-black uppercase"><span>Project progress</span><span className="text-red-700">{project.progressPercent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full origin-left bg-red-700" style={{ transform: `scaleX(${Math.max(0, Math.min(100, project.progressPercent)) / 100})` }}/></div></div>
            <div className="mt-4 grid gap-3 text-sm">
              {project.location ? <p className="flex gap-2"><MapPin size={17} className="text-red-700" />{project.location}</p> : null}
              {project.isCustomerNamePublic && project.customerOrCompany ? <p className="flex gap-2"><CheckCircle2 size={17} className="text-red-700"/>{project.customerOrCompany}</p> : null}
              {project.startDate ? <p className="flex gap-2"><CalendarDays size={17} className="text-red-700" />{new Date(project.startDate).toLocaleDateString("en-PK")}</p> : null}
              {project.service ? <Link href={`/services/${project.service.slug}`} className="flex gap-2 font-bold text-red-700"><Wrench size={17} />{project.service.name}</Link> : null}
            </div>
          </aside>
        </div>
      </section>

      {project.updates.length ? <section className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10">
        <p className="showroom-eyebrow text-red-700">Progress record</p>
        <h2 className="mt-2 font-display text-4xl font-black uppercase">Project updates</h2>
        <div className="mt-6 grid border-l border-slate-300">
          {project.updates.map((update) => <article key={update.id} className="relative grid gap-3 border-b border-slate-200 py-6 pl-7 md:grid-cols-[170px_1fr]"><CircleDot className="absolute -left-3 top-6 bg-white text-red-700" size={24}/><div><p className="font-mono text-xs font-bold text-red-700">{new Date(update.occurredAt).toLocaleDateString("en-PK")}</p>{update.progressPercent !== null ? <p className="mt-2 text-xs font-black uppercase text-slate-500">{update.progressPercent}% complete</p> : null}</div><div><p className="text-xs font-black uppercase text-red-700">{update.milestone || "Field update"}</p><h3 className="mt-1 text-xl font-black">{update.title}</h3>{update.description ? <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{update.description}</p> : null}</div></article>)}
        </div>
      </section> : null}

      {gallery.length ? (
        <section className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10">
          <p className="showroom-eyebrow text-red-700">Installation record</p>
          <h2 className="mt-2 font-display text-4xl font-black uppercase">Project gallery</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((media, index) => (
              <figure key={media.id} className={`relative overflow-hidden rounded-lg bg-slate-100 ${index === 0 ? "aspect-[16/10] sm:col-span-2" : "aspect-[4/3]"}`}>
                <DynamicMedia src={media.url} alt={media.altText || project.title} />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-slate-950/85 to-transparent p-4 pt-12 text-white">
                  <span className="text-sm font-bold">{media.caption || media.altText || project.title}</span>
                  <span className="rounded-md bg-white/15 px-2 py-1 text-[10px] font-black uppercase">{media.type}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {videos.length ? (
        <section className="bg-slate-950 py-12 text-white">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
            <p className="showroom-eyebrow text-red-300">On-site video</p>
            <h2 className="mt-2 font-display text-4xl font-black uppercase">Watch the installation</h2>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              {videos.map((media) => (
                <figure key={media.id}>
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                    <DynamicMedia src={media.url} alt={media.altText || `${project.title} video`} controls poster={media.posterUrl} />
                  </div>
                  {media.caption ? <figcaption className="mt-2 text-sm text-slate-300">{media.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {project.products.length ? (
        <section className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3"><PackageCheck className="text-red-700" /><h2 className="font-display text-4xl font-black uppercase">Products used</h2></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {project.products.map((entry) => (
              <Link key={entry.id} href={`/products/${entry.product.slug}`} className="premium-card flex items-center gap-4 p-3">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-slate-100">
                  <DynamicMedia src={entry.variant?.imageUrl || entry.product.images[0]?.url} alt={entry.product.name} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-red-700">{entry.quantity} x {entry.variant?.title || "Standard"}</p>
                  <h3 className="mt-1 font-black">{entry.product.name}</h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">{entry.variant?.sku || entry.product.sku}</p>
                  {entry.note ? <p className="mt-1 text-xs text-slate-500">{entry.note}</p> : null}
                  <p className="mt-2 flex items-center gap-1 text-sm font-bold text-emerald-700"><CheckCircle2 size={15} /> Verified project item</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {project.testimonial ? <section className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-10"><blockquote className="border-l-4 border-red-700 bg-slate-100 p-7 font-display text-3xl font-bold uppercase leading-tight">&ldquo;{project.testimonial}&rdquo;</blockquote></section> : null}
    </main>
  );
}
