"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Pencil, Save, Trash2, Upload, X } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type AdminBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  mobileImage: string | null;
  type: string;
  href: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
};

type EditDraft = {
  title: string;
  subtitle: string;
  href: string;
  isActive: boolean;
  desktopFile: File | null;
  mobileFile: File | null;
  removeMobile: boolean;
};

const MAX_SLIDES = 15;
const placements = [
  { id: "HERO", label: "Home" },
  { id: "PACKAGES_HERO", label: "Packages" },
  { id: "SERVICES_HERO", label: "Services" },
  { id: "PROJECTS_HERO", label: "Projects" },
  { id: "ABOUT_HERO", label: "About" }
] as const;
type Placement = (typeof placements)[number]["id"];

function fileTitle(name: string, index: number) {
  const clean = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (/^(?:img|dsc|image|photo|screenshot|whatsapp\s*image)\s*\d*$/i.test(clean)) return "Built for real work.";
  return clean.length >= 2 ? clean : `Hero slide ${index + 1}`;
}

function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(blob);
  });
}

async function optimizeImage(file: File, maxWidth: number, maxHeight: number) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image.`);
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name} is larger than 20 MB.`);

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Image processing is not supported in this browser.");
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("The image could not be optimized.")), "image/webp", 0.9);
  });
  return dataUrl(blob);
}

function payload(banner: AdminBanner, changes: Partial<AdminBanner> = {}) {
  return {
    title: changes.title ?? banner.title,
    subtitle: changes.subtitle === undefined ? banner.subtitle : changes.subtitle,
    image: changes.image ?? banner.image,
    mobileImage: changes.mobileImage === undefined ? banner.mobileImage : changes.mobileImage,
    type: changes.type ?? banner.type,
    href: changes.href === undefined ? banner.href : changes.href,
    sortOrder: changes.sortOrder ?? banner.sortOrder,
    isActive: changes.isActive ?? banner.isActive,
    startsAt: changes.startsAt ?? banner.startsAt,
    endsAt: changes.endsAt === undefined ? banner.endsAt : changes.endsAt
  };
}

async function responseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  return data.error || "The request could not be completed.";
}

export function HeroBannerManager() {
  const [placement, setPlacement] = useState<Placement>("HERO");
  const [items, setItems] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const editing = useMemo(() => items.find((item) => item.id === editingId) || null, [editingId, items]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/banners?type=${placement}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      setItems(await response.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Hero slides could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [placement]);

  useEffect(() => {
    void load();
  }, [load]);

  function beginEdit(item: AdminBanner) {
    setEditingId(item.id);
    setDraft({
      title: item.title,
      subtitle: item.subtitle || "",
      href: item.href || "/products",
      isActive: item.isActive,
      desktopFile: null,
      mobileFile: null,
      removeMobile: false
    });
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = "";
    if (!files.length) return;
    const remaining = MAX_SLIDES - items.length;
    if (files.length > remaining) {
      setError(`Only ${remaining} hero slide slot${remaining === 1 ? " is" : "s are"} available.`);
      return;
    }

    setBusy(true);
    setError("");
    setProgress(0);
    try {
      for (let index = 0; index < files.length; index += 1) {
        const image = await optimizeImage(files[index], 2200, 1400);
        const response = await fetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: fileTitle(files[index].name, items.length + index),
            subtitle: null,
            image,
            mobileImage: null,
            type: placement,
            href: "/products",
            sortOrder: items.length + index,
            isActive: true,
            startsAt: new Date().toISOString(),
            endsAt: null
          })
        });
        if (!response.ok) throw new Error(await responseError(response));
        setProgress(index + 1);
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The slides could not be uploaded.");
      await load();
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  async function updateBanner(item: AdminBanner, changes: Partial<AdminBanner>) {
    const response = await fetch(`/api/admin/banners/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(item, changes))
    });
    if (!response.ok) throw new Error(await responseError(response));
    return response.json() as Promise<AdminBanner>;
  }

  async function toggle(item: AdminBanner) {
    setBusy(true);
    setError("");
    try {
      const updated = await updateBanner(item, { isActive: !item.isActive });
      setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The slide could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const otherIndex = index + direction;
    if (!items[index] || !items[otherIndex]) return;
    setBusy(true);
    setError("");
    try {
      await Promise.all([
        updateBanner(items[index], { sortOrder: items[otherIndex].sortOrder }),
        updateBanner(items[otherIndex], { sortOrder: items[index].sortOrder })
      ]);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The slide order could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: AdminBanner) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/banners/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      if (editingId === item.id) {
        setEditingId(null);
        setDraft(null);
      }
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The slide could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing || !draft) return;
    if (draft.title.trim().length < 2) {
      setError("Slide title must contain at least 2 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const image = draft.desktopFile ? await optimizeImage(draft.desktopFile, 2200, 1400) : editing.image;
      const mobileImage = draft.removeMobile
        ? null
        : draft.mobileFile
          ? await optimizeImage(draft.mobileFile, 1200, 1600)
          : editing.mobileImage;
      const updated = await updateBanner(editing, {
        title: draft.title.trim(),
        subtitle: draft.subtitle.trim() || null,
        href: draft.href.trim() || null,
        image,
        mobileImage,
        isActive: draft.isActive
      });
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
      setEditingId(null);
      setDraft(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The slide could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700 dark:text-red-300">Storefront media</p>
          <h2 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">{placements.find((entry) => entry.id === placement)?.label} hero slides</h2>
        </div>
        <div className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white dark:bg-white dark:text-slate-950">{items.length} / {MAX_SLIDES}</div>
      </div>
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-white p-2 shadow-sm dark:bg-slate-900" data-lenis-prevent>
        {placements.map((entry) => <button key={entry.id} type="button" aria-pressed={placement === entry.id} onClick={() => { setPlacement(entry.id); setEditingId(null); setDraft(null); setError(""); }} className={`min-h-10 shrink-0 rounded-md px-4 text-xs font-black transition ${placement === entry.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"}`}>{entry.label}</button>)}
      </div>

      {error ? <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-950/45 dark:text-red-200">{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="rounded-lg bg-white p-5 shadow-sm shadow-slate-950/8 dark:bg-slate-900">
          <h3 className="font-black text-slate-950 dark:text-white">Upload {placements.find((entry) => entry.id === placement)?.label.toLowerCase()} images</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">Upload up to 15 images for this page. Desktop files are optimized to high-quality WebP and rotate with a controlled 6.5 second hold.</p>
          <label className={`mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg bg-slate-100 px-5 text-center transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 ${busy || items.length >= MAX_SLIDES ? "pointer-events-none opacity-50" : ""}`}>
            {busy ? <LoaderCircle className="animate-spin" size={24} /> : <Upload size={24} />}
            <span className="mt-3 text-sm font-black">{busy ? `Uploading ${progress}` : "Choose multiple images"}</span>
            <input type="file" accept="image/*" multiple className="hidden" disabled={busy || items.length >= MAX_SLIDES} onChange={(event) => void upload(event)} />
          </label>

          {editing && draft ? (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-slate-950 dark:text-white">Edit slide</h3>
                <button type="button" className="grid size-9 place-items-center rounded-md bg-slate-100 dark:bg-slate-800" onClick={() => { setEditingId(null); setDraft(null); }} aria-label="Close editor"><X size={17} /></button>
              </div>
              <label className="block text-sm font-bold">Title<input maxLength={80} className="mt-1 min-h-11 w-full rounded-md bg-slate-100 px-3 outline-none focus:ring-2 focus:ring-red-600 dark:bg-slate-800" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <label className="block text-sm font-bold">Subtitle<textarea maxLength={180} rows={3} className="mt-1 w-full resize-none rounded-md bg-slate-100 px-3 py-2 outline-none focus:ring-2 focus:ring-red-600 dark:bg-slate-800" value={draft.subtitle} onChange={(event) => setDraft({ ...draft, subtitle: event.target.value })} /></label>
              <label className="block text-sm font-bold">Destination<input className="mt-1 min-h-11 w-full rounded-md bg-slate-100 px-3 outline-none focus:ring-2 focus:ring-red-600 dark:bg-slate-800" value={draft.href} onChange={(event) => setDraft({ ...draft, href: event.target.value })} /></label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-100 px-3 text-sm font-bold dark:bg-slate-800"><ImagePlus size={17} /> Replace desktop<input type="file" accept="image/*" className="hidden" onChange={(event) => setDraft({ ...draft, desktopFile: event.target.files?.[0] || null })} /></label>
                <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-slate-100 px-3 text-sm font-bold dark:bg-slate-800"><ImagePlus size={17} /> Mobile image<input type="file" accept="image/*" className="hidden" onChange={(event) => setDraft({ ...draft, mobileFile: event.target.files?.[0] || null, removeMobile: false })} /></label>
              </div>
              {editing.mobileImage ? <button type="button" className="text-sm font-bold text-red-700 dark:text-red-300" onClick={() => setDraft({ ...draft, mobileFile: null, removeMobile: true })}>Remove mobile image</button> : null}
              <label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Active on storefront</label>
              <Button type="button" variant="accent" className="w-full gap-2" disabled={busy} onClick={() => void saveEdit()}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} Save slide</Button>
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-black text-slate-950 dark:text-white">Display order</h3>
            {loading ? <LoaderCircle className="animate-spin text-slate-500" size={19} /> : null}
          </div>
          <div className="grid gap-3">
            {!loading && !items.length ? <div className="rounded-lg bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-900">No hero slides yet.</div> : null}
            {items.map((item, index) => (
              <article key={item.id} className="grid gap-4 rounded-lg bg-white p-3 shadow-sm shadow-slate-950/8 dark:bg-slate-900 sm:grid-cols-[11rem_1fr_auto] sm:items-center">
                <div className="relative aspect-video overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                  <Image src={item.image} alt={item.title} fill unoptimized className="object-cover" sizes="176px" />
                  <span className="absolute left-2 top-2 rounded-md bg-slate-950/80 px-2 py-1 text-[10px] font-black text-white">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate font-black text-slate-950 dark:text-white">{item.title}</h4>
                    <button type="button" aria-pressed={item.isActive} disabled={busy} onClick={() => void toggle(item)} className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${item.isActive ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>{item.isActive ? "Active" : "Hidden"}</button>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.subtitle || "Default storefront copy"}</p>
                  <p className="mt-2 truncate font-mono text-[11px] text-slate-400">{item.href || "No destination"}</p>
                </div>
                <div className="flex items-center gap-1 sm:flex-col">
                  <button type="button" title="Move up" aria-label={`Move ${item.title} up`} disabled={busy || index === 0} className="grid size-9 place-items-center rounded-md bg-slate-100 disabled:opacity-35 dark:bg-slate-800" onClick={() => void move(index, -1)}><ArrowUp size={16} /></button>
                  <button type="button" title="Move down" aria-label={`Move ${item.title} down`} disabled={busy || index === items.length - 1} className="grid size-9 place-items-center rounded-md bg-slate-100 disabled:opacity-35 dark:bg-slate-800" onClick={() => void move(index, 1)}><ArrowDown size={16} /></button>
                  <button type="button" title="Edit" aria-label={`Edit ${item.title}`} disabled={busy} className="grid size-9 place-items-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={() => beginEdit(item)}><Pencil size={16} /></button>
                  <button type="button" title="Delete" aria-label={`Delete ${item.title}`} disabled={busy} className="grid size-9 place-items-center rounded-md bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200" onClick={() => void remove(item)}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
