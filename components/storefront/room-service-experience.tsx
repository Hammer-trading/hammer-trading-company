"use client";

import Image from "next/image";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardPenLine,
  Clock3,
  Home,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Phone,
  Ruler,
  Send,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicRoomPackage } from "@/lib/room-services";

type FormState = {
  packageId: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  roomType: string;
  roomSize: string;
  preferredDate: string;
  note: string;
};

const initialForm: FormState = {
  packageId: "",
  customerName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  roomType: "Bedroom",
  roomSize: "",
  preferredDate: "",
  note: ""
};

const requestBenefits = [
  { Icon: ShieldCheck, title: "Verified scope", text: "Requirements are checked before quotation." },
  { Icon: CalendarDays, title: "Planned visit", text: "Choose a preferred survey or installation date." },
  { Icon: MapPin, title: "Admin tracked", text: "Your request and status stay in one system." }
] as const;

async function responseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  return data.error || "The request could not be submitted.";
}

export function RoomServiceExperience({ packages }: { packages: PublicRoomPackage[] }) {
  const reduceMotion = useReducedMotion();
  const formRef = useRef<HTMLElement>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const selectedPackage = packages.find((item) => item.id === form.packageId) || null;

  function selectPackage(item: PublicRoomPackage) {
    setForm((current) => ({ ...current, packageId: item.id, roomType: item.roomType }));
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 20);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setConfirmation("");

    try {
      const response = await fetch("/api/room-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, packageId: form.packageId || null, preferredDate: form.preferredDate || null })
      });

      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json();
      setConfirmation(data.requestNumber);
      setForm(initialForm);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {packages.length ? (
        <section className="bg-[#f5f5f1] py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
            <div className="grid items-end gap-6 lg:grid-cols-[0.82fr_1.18fr]">
              <div>
                <p className="showroom-eyebrow">Ready room packages</p>
                <h2 className="mt-4 font-display text-4xl font-black leading-[0.95] text-slate-950 sm:text-5xl">
                  A complete item plan, ready to tailor.
                </h2>
              </div>
              <p className="max-w-xl text-base leading-7 text-slate-600">
                Review what is included, choose a starting package, and send the room brief. Measurements and final pricing are confirmed before work starts.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {packages.map((item, index) => (
                <motion.article
                  key={item.id}
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.36, delay: reduceMotion ? 0 : index * 0.05 }}
                  className="group overflow-hidden rounded-lg bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_65px_rgba(15,23,42,0.14)]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
                    <Image
                      src={item.image || "/brand/workshop-hero.webp"}
                      alt={item.name}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.035]"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 text-white">
                      <span className="rounded-md bg-red-700 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]">{item.roomType}</span>
                      <span className="flex items-center gap-1 text-xs font-bold"><Clock3 size={14} /> {item.durationDays} day{item.durationDays > 1 ? "s" : ""}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-black text-slate-950">{item.name}</h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.description}</p>
                      </div>
                      {item.isFeatured ? <span className="rounded-md bg-red-50 px-2 py-1 text-[9px] font-black uppercase text-red-700">Popular</span> : null}
                    </div>
                    <ul className="mt-5 grid gap-2 border-t border-slate-100 pt-5">
                      {item.items.slice(0, 5).map((entry, itemIndex) => (
                        <li key={`${entry.name}-${itemIndex}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2 text-slate-700">
                            <Check size={15} className="shrink-0 text-emerald-600" />
                            <span className="truncate">{entry.name}</span>
                          </span>
                          <strong className="shrink-0 font-mono text-xs">{entry.quantity} {entry.unit}</strong>
                        </li>
                      ))}
                      {item.items.length > 5 ? <li className="text-xs font-bold text-slate-400">+ {item.items.length - 5} more included items</li> : null}
                    </ul>
                    <div className="mt-6 flex items-end justify-between gap-4">
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Package from</span>
                        <strong className="font-mono text-xl text-slate-950">PKR {item.price.toLocaleString()}</strong>
                        {item.compareAtPrice ? <span className="ml-2 font-mono text-xs text-slate-400 line-through">{item.compareAtPrice.toLocaleString()}</span> : null}
                      </div>
                      <PackageCheck size={22} className="text-red-700" />
                    </div>
                    <Button variant="accent" className="mt-5 w-full" onClick={() => selectPackage(item)}>
                      Choose this package
                    </Button>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section ref={formRef} id="request-service" className="luminous-dark scroll-mt-28 overflow-hidden py-16 text-white sm:py-20 lg:py-24">
        <div className="mx-auto grid max-w-[90rem] gap-12 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16 lg:px-10">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="showroom-eyebrow text-red-300">Installation request</p>
            <h2 className="mt-4 max-w-lg font-display text-4xl font-black leading-[0.95] sm:text-5xl lg:text-6xl">
              Start with the room. We will plan the rest.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-slate-300">
              Send one clear brief. The HTC team verifies the room, prepares the hardware scope, and confirms cost before installation.
            </p>

            <div className="mt-9 grid gap-5">
              {requestBenefits.map(({ Icon, title, text }, index) => (
                <div key={title} className="grid grid-cols-[2.25rem_1fr] gap-3 border-b border-white/10 pb-5">
                  <span className="font-mono text-[10px] font-black text-red-300">0{index + 1}</span>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black text-white"><Icon size={17} className="text-red-300" /> {title}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-lg bg-white text-slate-950 shadow-[0_32px_90px_rgba(0,0,0,0.34)]">
            <div className="h-1 bg-red-700" />
            {confirmation ? (
              <div className="grid min-h-[38rem] place-items-center px-6 py-12 text-center sm:px-10">
                <div>
                  <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={30} /></span>
                  <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Saved in HTC service desk</p>
                  <h3 className="mt-3 text-3xl font-black">Request received</h3>
                  <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">Our service team will contact you using the phone number provided.</p>
                  <p className="mt-6 rounded-md bg-slate-100 px-4 py-3 font-mono text-sm font-black">{confirmation}</p>
                  <Button variant="outline" className="mt-6" onClick={() => setConfirmation("")}>Create another request</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="p-5 sm:p-8 lg:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-700">Room project brief</p>
                    <h3 className="mt-2 text-2xl font-black sm:text-3xl">Request a survey and quote</h3>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"><ShieldCheck size={15} /> Secure request</span>
                </div>

                {error ? <div role="alert" className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

                <fieldset className="mt-7 border-b border-slate-200 pb-7">
                  <legend className="flex items-center gap-2 text-sm font-black uppercase text-slate-950"><PackageCheck size={17} className="text-red-700" /> Service option</legend>
                  <label className="mt-4 block text-sm font-bold">Selected package
                    <select
                      className="store-input mt-1.5 w-full"
                      value={form.packageId}
                      onChange={(event) => {
                        const item = packages.find((entry) => entry.id === event.target.value);
                        setForm({ ...form, packageId: event.target.value, roomType: item?.roomType || form.roomType });
                      }}
                    >
                      <option value="">Custom room solution</option>
                      {packages.map((item) => <option key={item.id} value={item.id}>{item.name} - PKR {item.price.toLocaleString()}</option>)}
                    </select>
                  </label>
                  {selectedPackage ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
                      <strong>{selectedPackage.name}</strong>
                      <span>{selectedPackage.items.length} items / {selectedPackage.durationDays} day{selectedPackage.durationDays > 1 ? "s" : ""}</span>
                    </div>
                  ) : null}
                </fieldset>

                <fieldset className="mt-7 border-b border-slate-200 pb-7">
                  <legend className="flex items-center gap-2 text-sm font-black uppercase text-slate-950"><UserRound size={17} className="text-red-700" /> Contact details</legend>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold">Full name<input required minLength={2} className="store-input mt-1.5 w-full" autoComplete="name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></label>
                    <label className="text-sm font-bold">Phone number<input required minLength={7} className="store-input mt-1.5 w-full" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
                    <label className="text-sm font-bold">Email <span className="font-normal text-slate-400">(optional)</span><input type="email" className="store-input mt-1.5 w-full" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
                    <label className="text-sm font-bold">City<input required minLength={2} className="store-input mt-1.5 w-full" autoComplete="address-level2" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
                  </div>
                </fieldset>

                <fieldset className="mt-7 border-b border-slate-200 pb-7">
                  <legend className="flex items-center gap-2 text-sm font-black uppercase text-slate-950"><Home size={17} className="text-red-700" /> Room details</legend>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold">Room type<input required className="store-input mt-1.5 w-full" value={form.roomType} onChange={(event) => setForm({ ...form, roomType: event.target.value })} /></label>
                    <label className="text-sm font-bold">Room size <span className="font-normal text-slate-400">(optional)</span><input className="store-input mt-1.5 w-full" placeholder="e.g. 12 x 14 ft" value={form.roomSize} onChange={(event) => setForm({ ...form, roomSize: event.target.value })} /></label>
                    <label className="text-sm font-bold sm:col-span-2">Full service address<textarea required minLength={8} rows={3} className="store-input mt-1.5 w-full resize-none py-3" autoComplete="street-address" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
                  </div>
                </fieldset>

                <fieldset className="mt-7">
                  <legend className="flex items-center gap-2 text-sm font-black uppercase text-slate-950"><ClipboardPenLine size={17} className="text-red-700" /> Visit and requirements</legend>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold">Preferred date<input type="date" min={new Date().toISOString().slice(0, 10)} className="store-input mt-1.5 w-full" value={form.preferredDate} onChange={(event) => setForm({ ...form, preferredDate: event.target.value })} /></label>
                    <div className="flex min-h-[4.25rem] items-end gap-2 pb-3 text-xs font-bold text-slate-500"><Ruler size={15} className="text-red-700" /> Final measurements are verified on site.</div>
                    <label className="text-sm font-bold sm:col-span-2">Requirements or notes<textarea rows={4} className="store-input mt-1.5 w-full resize-none py-3" placeholder="Describe doors, shelves, fittings, room condition, or special requirements" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
                  </div>
                </fieldset>

                <Button type="submit" variant="accent" className="mt-7 min-h-12 w-full gap-2" disabled={busy}>
                  {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />} Submit service request
                </Button>
                <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-500"><Phone size={13} /> No payment is collected with this request.</p>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
