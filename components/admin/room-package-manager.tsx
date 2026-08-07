"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, PackagePlus, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/utils";

type PackageItem = { name: string; quantity: number; unit: string; note?: string | null };
type AdminRoomPackage = {
  id: string;
  name: string;
  slug: string;
  roomType: string;
  description: string;
  image: string | null;
  items: PackageItem[];
  price: number;
  compareAtPrice: number | null;
  durationDays: number;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
};

type Draft = Omit<AdminRoomPackage, "id">;

const emptyDraft: Draft = {
  name: "",
  slug: "",
  roomType: "Bedroom",
  description: "",
  image: null,
  items: [{ name: "", quantity: 1, unit: "pcs", note: "" }],
  price: 0,
  compareAtPrice: null,
  durationDays: 1,
  isFeatured: false,
  isActive: true,
  sortOrder: 0
};

function dataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(blob);
  });
}

async function optimizeImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 20 * 1024 * 1024) throw new Error("The image must be smaller than 20 MB.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / bitmap.width, 1200 / bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image processing is unavailable.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    (value) => value ? resolve(value) : reject(new Error("The image could not be optimized.")),
    "image/webp",
    0.9
  ));
  return dataUrl(blob);
}

async function responseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  return data.error || "The request could not be completed.";
}

export function RoomPackageManager() {
  const [items, setItems] = useState<AdminRoomPackage[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [error, setError] = useState("");
  const summary = useMemo(() => ({
    total: items.length,
    live: items.filter((item) => item.isActive).length,
    featured: items.filter((item) => item.isFeatured).length,
    includedItems: items.reduce((sum, item) => sum + item.items.length, 0)
  }), [items]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/room-packages", { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      setItems(await response.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Room packages could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function createPackage() {
    setEditingId(null);
    setDraft({ ...emptyDraft, items: emptyDraft.items.map((item) => ({ ...item })), sortOrder: items.length });
    setError("");
  }

  function editPackage(item: AdminRoomPackage) {
    setEditingId(item.id);
    setDraft({ ...item, items: item.items.map((entry) => ({ ...entry })) });
    setError("");
  }

  function updateItem(index: number, changes: Partial<PackageItem>) {
    if (!draft) return;
    setDraft({ ...draft, items: draft.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) });
  }

  async function imageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !draft) return;
    setImageBusy(true);
    setError("");
    try {
      setDraft({ ...draft, image: await optimizeImage(file) });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The image could not be processed.");
    } finally {
      setImageBusy(false);
    }
  }

  async function save() {
    if (!draft) return;
    const validItems = draft.items.filter((item) => item.name.trim()).map((item) => ({ ...item, name: item.name.trim(), note: item.note?.trim() || null }));
    if (draft.name.trim().length < 2 || draft.description.trim().length < 10 || !validItems.length) {
      setError("Add a package name, a useful description, and at least one included item.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(editingId ? `/api/admin/room-packages/${editingId}` : "/api/admin/room-packages", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, slug: slugify(draft.slug || draft.name), items: validItems })
      });
      if (!response.ok) throw new Error(await responseError(response));
      setDraft(null);
      setEditingId(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The package could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: AdminRoomPackage) {
    if (!window.confirm(`Delete ${item.name}? Existing service requests will retain their customer details.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/room-packages/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The package could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-black uppercase tracking-[0.16em] text-red-700 dark:text-red-300">Service catalog</p><h2 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Room packages</h2><p className="mt-2 text-sm text-slate-500">Create complete hardware bundles for bedrooms, kitchens, offices, and other spaces.</p></div>
        <Button variant="accent" className="gap-2" onClick={createPackage}><PackagePlus size={18} /> New package</Button>
      </div>
      {error ? <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</div> : null}

      <section className="grid overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-4">
        {[["Packages", summary.total], ["Visible", summary.live], ["Homepage", summary.featured], ["Included lines", summary.includedItems]].map(([label, value], index) => <div key={label} className={`px-5 py-4 ${index ? "border-t border-slate-100 sm:border-l sm:border-t-0 dark:border-white/10" : ""}`}><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><strong className="mt-1 block font-mono text-2xl text-slate-950 dark:text-white">{value}</strong></div>)}
      </section>

      {draft ? (
        <section className="rounded-lg bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6">
          <div className="flex items-center justify-between"><h3 className="text-xl font-black">{editingId ? "Edit package" : "Create package"}</h3><button type="button" className="grid size-10 place-items-center rounded-md bg-slate-100 dark:bg-slate-800" onClick={() => setDraft(null)} aria-label="Close package editor"><X size={18} /></button></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-bold">Package name<input className="admin-input mt-1 w-full" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value, slug: editingId ? draft.slug : slugify(event.target.value) })} /></label>
            <label className="text-sm font-bold">Room type<input className="admin-input mt-1 w-full" value={draft.roomType} onChange={(event) => setDraft({ ...draft, roomType: event.target.value })} /></label>
            <label className="text-sm font-bold">Slug<input className="admin-input mt-1 w-full font-mono" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} /></label>
            <label className="text-sm font-bold">Installation duration (days)<input type="number" min={1} max={90} className="admin-input mt-1 w-full" value={draft.durationDays} onChange={(event) => setDraft({ ...draft, durationDays: Number(event.target.value) })} /></label>
            <label className="text-sm font-bold">Package price<input type="number" min={0} className="admin-input mt-1 w-full" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} /></label>
            <label className="text-sm font-bold">Original price (optional)<input type="number" min={0} className="admin-input mt-1 w-full" value={draft.compareAtPrice ?? ""} onChange={(event) => setDraft({ ...draft, compareAtPrice: event.target.value ? Number(event.target.value) : null })} /></label>
          </div>
          <label className="mt-4 block text-sm font-bold">Description<textarea rows={4} className="admin-input mt-1 w-full resize-none py-3" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>

          <div className="mt-5 grid gap-4 lg:grid-cols-[14rem_1fr]">
            <div>
              <p className="text-sm font-bold">Package image</p>
              <label className="mt-1 flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                {draft.image ? <Image src={draft.image} alt="Package preview" fill={false} width={480} height={360} unoptimized className="h-full w-full object-cover" /> : imageBusy ? <LoaderCircle className="animate-spin" /> : <span className="flex flex-col items-center gap-2 text-xs font-bold"><ImagePlus size={22} /> Choose image</span>}
                <input className="hidden" type="file" accept="image/*" onChange={(event) => void imageChange(event)} />
              </label>
              {draft.image ? <button type="button" className="mt-2 text-xs font-bold text-red-700" onClick={() => setDraft({ ...draft, image: null })}>Remove image</button> : null}
            </div>
            <div>
              <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black">Included hardware</p><p className="text-xs text-slate-500">List every item the installation team will supply.</p></div><button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-black text-white dark:bg-white dark:text-slate-950" onClick={() => setDraft({ ...draft, items: [...draft.items, { name: "", quantity: 1, unit: "pcs", note: "" }] })}><Plus size={15} /> Add item</button></div>
              <div className="mt-3 space-y-2">
                {draft.items.map((item, index) => (
                  <div key={index} className="grid gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-[1fr_6rem_6rem_auto]">
                    <input aria-label={`Item ${index + 1} name`} placeholder="e.g. Door lock set" className="admin-input" value={item.name} onChange={(event) => updateItem(index, { name: event.target.value })} />
                    <input aria-label={`Item ${index + 1} quantity`} type="number" min={1} className="admin-input" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} />
                    <input aria-label={`Item ${index + 1} unit`} placeholder="pcs" className="admin-input" value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} />
                    <button type="button" className="grid size-10 place-items-center rounded-md bg-red-50 text-red-700 disabled:opacity-40 dark:bg-red-950/50 dark:text-red-200" disabled={draft.items.length === 1} onClick={() => setDraft({ ...draft, items: draft.items.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Remove item ${index + 1}`}><Trash2 size={16} /></button>
                    <input aria-label={`Item ${index + 1} note`} placeholder="Optional item note" className="admin-input sm:col-span-4" value={item.note || ""} onChange={(event) => updateItem(index, { note: event.target.value })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.isFeatured} onChange={(event) => setDraft({ ...draft, isFeatured: event.target.checked })} /> Feature on homepage</label>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /> Visible to customers</label>
            <label className="flex items-center gap-2 text-sm font-bold">Sort order<input type="number" min={0} className="admin-input w-24" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} /></label>
            <Button variant="accent" className="ml-auto gap-2" disabled={busy || imageBusy} onClick={() => void save()}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} Save package</Button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="col-span-full flex min-h-40 items-center justify-center"><LoaderCircle className="animate-spin text-red-700" /></div> : null}
        {!loading && !items.length ? <div className="col-span-full rounded-lg bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:bg-slate-900">No room packages have been created.</div> : null}
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
            <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800">{item.image ? <Image src={item.image} alt={item.name} fill unoptimized className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" /> : <div className="grid h-full place-items-center text-slate-400"><ImagePlus /></div>}<span className={`absolute left-3 top-3 rounded-md px-2 py-1 text-[10px] font-black uppercase ${item.isActive ? "bg-emerald-600 text-white" : "bg-slate-950 text-white"}`}>{item.isActive ? "Live" : "Hidden"}</span></div>
            <div className="p-5"><p className="text-xs font-black uppercase tracking-[0.12em] text-red-700 dark:text-red-300">{item.roomType}</p><h3 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{item.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.description}</p><div className="mt-4 flex items-end justify-between"><div><span className="block font-mono text-lg font-black">PKR {item.price.toLocaleString()}</span><span className="text-xs text-slate-500">{item.items.length} items / {item.durationDays} day{item.durationDays > 1 ? "s" : ""}</span></div><div className="flex gap-2"><button type="button" className="grid size-10 place-items-center rounded-md bg-slate-100 dark:bg-slate-800" onClick={() => editPackage(item)} aria-label={`Edit ${item.name}`}><Pencil size={17} /></button><button type="button" disabled={busy} className="grid size-10 place-items-center rounded-md bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-200" onClick={() => void remove(item)} aria-label={`Delete ${item.name}`}><Trash2 size={17} /></button></div></div></div>
          </article>
        ))}
      </section>
    </div>
  );
}
