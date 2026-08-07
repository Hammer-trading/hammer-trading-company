"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Item = { id: string; name: string; phone?: string | null; provider?: string; city?: string | null; vehicle?: string | null; isActive: boolean; orders?: unknown[] };

export function AdminCourierRiderManager({ type }: { type: "couriers" | "riders" }) {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<Item | null>(null);
  const [toast, setToast] = useState("");
  const isCourier = type === "couriers";

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/${type}`);
    const data = await response.json();
    setItems(response.ok ? data : []);
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!form) return;
    const response = await fetch(form.id ? `/api/admin/${type}/${form.id}` : `/api/admin/${type}`, { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    setToast(response.ok ? "Saved" : data.error || "Save failed");
    if (response.ok) {
      setForm(null);
      await load();
    }
  }

  async function remove(id: string) {
    if (!window.confirm(`Delete this ${isCourier ? "courier" : "rider"}?`)) return;
    const response = await fetch(`/api/admin/${type}/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setToast(response.ok ? "Deleted" : data.error || "Delete failed");
    if (response.ok) await load();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Button variant="accent" onClick={() => setForm({ id: "", name: "", phone: "", provider: isCourier ? "LOCAL" : undefined, city: "", vehicle: "", isActive: true })}><Plus size={17} /> Add {isCourier ? "courier" : "rider"}</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No {type} found.</div> : items.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between gap-3"><div><strong>{item.name}</strong><p className="text-sm text-slate-500">{isCourier ? item.provider : `${item.phone || ""} ${item.city || ""}`} - {item.isActive ? "Active" : "Inactive"}</p><p className="text-xs text-slate-500">{isCourier ? `${item.orders?.length || 0} assigned orders` : item.vehicle || "No vehicle"}</p></div><div className="flex gap-1"><button className="rounded-md p-2 hover:bg-slate-100" onClick={() => setForm(item)}><Edit size={17} /></button><button className="rounded-md p-2 text-red-600 hover:bg-red-50" onClick={() => void remove(item.id)}><Trash2 size={17} /></button></div></div></div>)}
      </div>
      {form ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><div className="w-full max-w-lg rounded-xl bg-white p-5 dark:bg-slate-950"><h2 className="text-2xl font-black">{form.id ? "Edit" : "Add"} {isCourier ? "courier" : "rider"}</h2><div className="mt-4 grid gap-3"><input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />{isCourier ? <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Provider code" value={form.provider || ""} onChange={(e) => setForm({ ...form, provider: e.target.value })} /> : <><input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="City" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /><input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Vehicle" value={form.vehicle || ""} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></>}<label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button variant="accent" onClick={() => void save()}>Save</Button></div></div></div> : null}
      {toast ? <div className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">{toast}</div> : null}
    </div>
  );
}
