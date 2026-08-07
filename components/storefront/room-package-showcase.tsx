import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ClipboardList, Clock3, Hammer, Ruler, ShieldCheck } from "lucide-react";
import type { PublicRoomPackage } from "@/lib/room-services";

const serviceFeatures = [
  { Icon: Ruler, label: "Measured for your room" },
  { Icon: ClipboardList, label: "Complete item schedule" },
  { Icon: Hammer, label: "Supply and installation" },
  { Icon: ShieldCheck, label: "Admin-tracked handover" }
] as const;

export function RoomPackageShowcase({ packages }: { packages: PublicRoomPackage[] }) {
  return (
    <section className="store-room-service overflow-hidden border-y border-[var(--line)] bg-white py-16 dark:bg-[var(--surface)] sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="store-eyebrow">HTC home service</p>
            <h2 className="mt-3 max-w-2xl font-display text-5xl font-black leading-[0.9] text-[var(--ink)] sm:text-6xl">
              One room. One complete hardware plan.
            </h2>
            <p className="mt-6 max-w-xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Tell us about the room and our team handles measurement, product selection, supply, professional fitting, and the final check.
            </p>
            <div className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {serviceFeatures.map(({ Icon, label }) => (
                <div key={label} className="flex min-h-12 items-center gap-3 border-t border-[var(--line)] pt-4 text-sm font-bold text-[var(--ink)]">
                  <Icon size={18} className="shrink-0 text-red-700 dark:text-red-400" aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/home-service#request-service" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-red-700 px-6 text-sm font-black text-white transition duration-200 hover:-translate-y-0.5 hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-600/30">
                Plan my room <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link href="/home-service#service-process" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[var(--surface)] px-5 text-sm font-black text-[var(--ink)] ring-1 ring-[var(--line)] transition duration-200 hover:-translate-y-0.5 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30">
                View the process
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="group relative aspect-[16/11] overflow-hidden rounded-lg bg-slate-100 shadow-[0_24px_70px_rgba(15,18,20,0.14)] dark:bg-slate-900">
              <Image
                src="/brand/workshop-hero.webp"
                alt="HTC room hardware planning and installation service"
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                sizes="(max-width: 1024px) 100vw, 58vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-white sm:inset-x-7 sm:bottom-7">
                <div>
                  <span className="text-[10px] font-black uppercase text-red-300">Measured / supplied / installed</span>
                  <p className="mt-2 max-w-lg text-sm font-bold leading-6 sm:text-base">A single HTC team keeps the item plan and installation connected.</p>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-red-700"><Hammer size={20} aria-hidden="true" /></span>
              </div>
            </div>
          </div>
        </div>

        {packages.length ? (
          <div className="mt-16 border-t border-[var(--line)] pt-10 lg:mt-20">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="store-eyebrow">Ready room packages</p>
                <h3 className="mt-2 font-display text-4xl font-black leading-none text-[var(--ink)] sm:text-5xl">Start with a proven item plan.</h3>
              </div>
              <Link href="/home-service" className="store-text-link">Explore all packages <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {packages.slice(0, 3).map((item) => (
                <Link key={item.id} href="/home-service#request-service" className="group overflow-hidden rounded-lg bg-[#f4f5f2] text-[var(--ink)] shadow-[0_12px_34px_rgba(15,18,20,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(15,18,20,0.13)] dark:bg-[#1a2023]">
                  <span className="relative block aspect-[16/9] overflow-hidden bg-slate-200 dark:bg-slate-900">
                    <Image src={item.image || "/brand/workshop-hero.webp"} alt={item.name} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.035]" sizes="(max-width: 1024px) 100vw, 33vw" />
                    <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[10px] font-black uppercase text-slate-950 shadow-sm">{item.roomType}</span>
                  </span>
                  <span className="block p-5">
                    <strong className="block text-lg font-black">{item.name}</strong>
                    <span className="mt-4 grid gap-2">
                      {item.items.slice(0, 3).map((entry, index) => (
                        <span key={`${entry.name}-${index}`} className="flex items-center gap-2 text-xs leading-5 text-[var(--muted)]">
                          <Check size={14} className="shrink-0 text-emerald-600" aria-hidden="true" /> {entry.quantity} {entry.unit} {entry.name}
                        </span>
                      ))}
                    </span>
                    <span className="mt-5 flex items-end justify-between border-t border-[var(--line)] pt-4">
                      <strong className="font-mono text-base">PKR {item.price.toLocaleString()}</strong>
                      <span className="flex items-center gap-1 text-xs font-bold text-[var(--muted)]"><Clock3 size={14} aria-hidden="true" /> {item.durationDays} day{item.durationDays > 1 ? "s" : ""}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
