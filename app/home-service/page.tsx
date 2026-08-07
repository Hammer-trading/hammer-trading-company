import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowDown,
  BadgeCheck,
  ClipboardCheck,
  Hammer,
  PackageCheck,
  Ruler,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";
import { RoomServiceExperience } from "@/components/storefront/room-service-experience";
import { getRoomPackages } from "@/lib/room-services";

export const metadata: Metadata = {
  title: "Room Hardware Installation Service | Hammer Trading Company",
  description: "Book complete room hardware packages, site measurement, supply, and professional installation."
};

export const revalidate = 60;
export const dynamic = "force-dynamic";

const serviceSteps = [
  {
    Icon: Ruler,
    number: "01",
    title: "Survey the room",
    text: "We confirm room measurements, fittings, surfaces, and installation requirements."
  },
  {
    Icon: ClipboardCheck,
    number: "02",
    title: "Build the item plan",
    text: "Every lock, hinge, bracket, fastener, and accessory is listed with quantity."
  },
  {
    Icon: BadgeCheck,
    number: "03",
    title: "Confirm the quote",
    text: "You approve the complete hardware and installation estimate before work begins."
  },
  {
    Icon: PackageCheck,
    number: "04",
    title: "Supply and install",
    text: "The team brings the approved material, completes fitting, and verifies handover."
  }
] as const;

const serviceSignals = [
  { Icon: Ruler, label: "Site measurement" },
  { Icon: Wrench, label: "Hardware planning" },
  { Icon: Hammer, label: "Professional fitting" },
  { Icon: ShieldCheck, label: "Verified handover" }
] as const;

export default async function HomeServicePage() {
  const packages = await getRoomPackages();

  return (
    <div className="bg-[#f5f5f1]">
      <section className="luminous-dark relative isolate overflow-hidden pb-12 pt-36 text-white sm:pb-16 sm:pt-40 lg:min-h-[44rem] lg:pb-14">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,6,10,0.98)_0%,rgba(4,6,10,0.88)_46%,rgba(4,6,10,0.38)_100%),url('/brand/workshop-hero.webp')] bg-cover bg-[68%_center] lg:bg-center" />
        <div aria-hidden="true" className="room-service-shine absolute inset-y-0 -left-1/3 w-1/3 opacity-0" />
        <div className="relative mx-auto flex min-h-[30rem] max-w-[90rem] flex-col justify-between px-4 sm:px-6 lg:px-10">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-red-300">
              <Sparkles size={14} /> HTC Home Service / Supply + Fit
            </div>
            <h1 className="mt-6 max-w-4xl font-display text-5xl font-black leading-[0.9] sm:text-7xl lg:text-[5.8rem]">
              Your room, planned down to every fitting.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              One managed service for measurement, hardware selection, supply, installation, and verified handover.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#request-service"
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-red-700 px-6 text-sm font-black text-white shadow-[0_16px_35px_rgba(185,28,28,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                <Hammer size={18} /> Request installation
              </a>
              <a
                href="#service-process"
                className="inline-flex min-h-12 items-center gap-2 rounded-md bg-white/10 px-5 text-sm font-black text-white ring-1 ring-white/15 backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white"
              >
                See how it works <ArrowDown size={17} />
              </a>
            </div>
          </div>

          <div className="mt-12 grid gap-x-8 gap-y-4 border-t border-white/15 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {serviceSignals.map(({ Icon, label }, index) => (
              <div key={label} className="flex items-center gap-3 text-sm font-bold text-slate-100">
                <span className="font-mono text-[10px] font-black text-red-300">0{index + 1}</span>
                <Icon size={17} className="text-red-300" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="service-process" className="scroll-mt-28 bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-[90rem] gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-10">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="showroom-eyebrow">One managed workflow</p>
            <h2 className="mt-4 max-w-xl font-display text-4xl font-black leading-[0.95] text-slate-950 sm:text-5xl">
              From room survey to verified handover.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
              Your requirements, approved item list, quotation, visit date, and service status stay in one trackable request.
            </p>
            <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-lg bg-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
              <Image
                src="/brand/workshop-hero.webp"
                alt="Professional hardware planning and installation"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white sm:p-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-red-300">HTC managed service</span>
                  <p className="mt-1 text-sm font-bold">Clear scope. Approved material. Accountable fitting.</p>
                </div>
                <ShieldCheck className="shrink-0 text-red-300" size={24} />
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {serviceSteps.map(({ Icon, number, title, text }) => (
              <article
                key={number}
                className="group grid gap-5 rounded-lg bg-[#f5f5f1] p-5 transition duration-300 hover:-translate-y-0.5 hover:bg-slate-950 hover:text-white sm:grid-cols-[5.5rem_1fr] sm:items-center sm:p-7"
              >
                <div className="flex items-center justify-between sm:block">
                  <span className="grid size-12 place-items-center rounded-md bg-white text-slate-950 shadow-sm transition duration-300 group-hover:bg-red-700 group-hover:text-white">
                    <Icon size={21} />
                  </span>
                  <span className="font-mono text-xs font-black text-red-700 transition group-hover:text-red-300 sm:mt-5 sm:block">STEP {number}</span>
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-950 transition group-hover:text-white sm:text-xl">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 transition group-hover:text-slate-300">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <RoomServiceExperience packages={packages} />
    </div>
  );
}
