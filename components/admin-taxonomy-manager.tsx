"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/utils";

type Category = { id: string; name: string; slug: string; description?: string | null; image?: string | null; banner?: string | null; parentId?: string | null; seoTitle?: string | null; seoDescription?: string | null; sortOrder: number; isActive: boolean; products?: unknown[] };
type Brand = { id: string; name: string; slug: string; description?: string | null; logo?: string | null; seoTitle?: string | null; seoDescription?: string | null; isActive: boolean; products?: unknown[] };

export function AdminTaxonomyManager({ type }: { type: "categories" | "brands" }) {
  const [items, setItems] = useState<Array<Category | Brand>>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Category | Brand | null>(null);
  const [toast, setToast] = useState("");
  const isCategory = type === "categories";

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/${type}?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    setItems(response.ok ? data : []);
    if (!response.ok) setToast(data.error || `Unable to load ${type}`);
  }, [q, type]);

  useEffect(() => {
    void load();
  }, [load]);

  function empty(): Category | Brand {
    return isCategory
      ? { id: "", name: "", slug: "", description: "", image: "", banner: "", parentId: "", seoTitle: "", seoDescription: "", sortOrder: items.length + 1, isActive: true }
      : { id: "", name: "", slug: "", description: "", logo: "", seoTitle: "", seoDescription: "", isActive: true };
  }

  async function save() {
    if (!form) return;
    const payload = { ...form, slug: form.slug || slugify(form.name) };
    const response = await fetch(form.id ? `/api/admin/${type}/${form.id}` : `/api/admin/${type}`, {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    setToast(response.ok ? "Saved" : result.error || "Save failed");
    if (response.ok) {
      setForm(null);
      await load();
    }
  }

  async function remove(id: string) {
    if (!window.confirm(`Delete this ${isCategory ? "category" : "brand"}?`)) return;
    const response = await fetch(`/api/admin/${type}/${id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    setToast(response.ok ? "Deleted" : result.error || "Delete failed");
    if (response.ok) await load();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          <div className="flex min-w-64 flex-1 items-center rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"><Search size={17} /><input value={q} onChange={(event) => setQ(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder={`Search ${type}`} /></div>
          <Button variant="accent" onClick={() => setForm(empty())}><Plus size={17} /> Add {isCategory ? "category" : "brand"}</Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">No {type} found.</div> : items.map((item) => {
          const media = isCategory ? (item as Category).image : (item as Brand).logo;
          return <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">{media ? <Image src={media} alt={item.name} width={640} height={260} className="mb-3 h-28 w-full rounded-lg object-cover" unoptimized /> : null}<div className="flex items-start justify-between gap-3"><div><strong>{item.name}</strong><p className="text-sm text-slate-500">{item.slug} - {item.products?.length || 0} products</p><p className="mt-1 text-xs font-bold">{item.isActive ? "Active" : "Inactive"}</p></div><div className="flex gap-1"><button className="rounded-md p-2 hover:bg-slate-100" onClick={() => setForm(item)}><Edit size={17} /></button><button className="rounded-md p-2 text-red-600 hover:bg-red-50" onClick={() => void remove(item.id)}><Trash2 size={17} /></button></div></div></div>;
        })}
      </div>
      {form ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-950"><h2 className="text-2xl font-black">{form.id ? "Edit" : "Add"} {isCategory ? "category" : "brand"}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value, slug: form.id ? form.slug : slugify(event.target.value) })} /><input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} /><input className="rounded-lg border p-2 dark:bg-slate-900" placeholder={isCategory ? "Category image URL" : "Brand logo URL"} value={(isCategory ? (form as Category).image : (form as Brand).logo) || ""} onChange={(event) => setForm(isCategory ? { ...(form as Category), image: event.target.value } : { ...(form as Brand), logo: event.target.value })} />{isCategory ? <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Category banner URL" value={(form as Category).banner || ""} onChange={(event) => setForm({ ...(form as Category), banner: event.target.value })} /> : null}{isCategory ? <select className="rounded-lg border p-2 dark:bg-slate-900" value={(form as Category).parentId || ""} onChange={(event) => setForm({ ...(form as Category), parentId: event.target.value || null })}><option value="">No parent / top category</option>{items.filter((item) => item.id !== form.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}{isCategory ? <input type="number" className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Sort order" value={(form as Category).sortOrder} onChange={(event) => setForm({ ...(form as Category), sortOrder: Number(event.target.value) })} /> : null}<input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="SEO title" value={form.seoTitle || ""} onChange={(event) => setForm({ ...form, seoTitle: event.target.value })} /><input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="SEO description" value={form.seoDescription || ""} onChange={(event) => setForm({ ...form, seoDescription: event.target.value })} /><textarea className="rounded-lg border p-2 sm:col-span-2 dark:bg-slate-900" placeholder="Description" value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /><label className="flex items-center gap-2 rounded-lg border p-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Active</label></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button variant="accent" onClick={() => void save()}>Save</Button></div></div></div> : null}
      {toast ? <div className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">{toast}</div> : null}
    </div>
  );
}
