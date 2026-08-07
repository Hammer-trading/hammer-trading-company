"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { Download, Edit, MessageCircle, Plus, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

function Toast({ text }: { text: string }) {
  return text ? <div className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">{text}</div> : null;
}

export function CustomerManager() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [toast, setToast] = useState("");
  const load = useCallback(async () => {
    const data = await fetch(`/api/admin/customers?q=${encodeURIComponent(q)}&status=${status}`).then((r) => r.json());
    setItems(Array.isArray(data) ? data : []);
  }, [q, status]);
  useEffect(() => { void load(); }, [load]);
  async function save() {
    const r = await fetch(`/api/admin/customers/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected) });
    setToast(r.ok ? "Customer saved" : "Save failed"); setSelected(null); await load();
  }
  return <div className="space-y-4"><div className="rounded-xl border bg-white p-4 dark:bg-slate-900"><div className="flex flex-wrap gap-2"><div className="flex flex-1 items-center rounded-lg border px-3 py-2"><Search size={17}/><input className="flex-1 bg-transparent px-2 outline-none" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search customers"/></div><select className="rounded-lg border px-3 py-2 dark:bg-slate-950" value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">Any status</option><option value="active">Active</option><option value="blocked">Blocked</option></select><button className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold" onClick={()=>{ window.location.href = "/api/admin/customers?export=csv"; }}><Download size={17}/> Export</button></div></div><div className="grid gap-3">{items.length ? items.map((c)=><div key={c.id} className="rounded-xl border bg-white p-4 dark:bg-slate-900"><div className="flex flex-wrap justify-between gap-3"><div><strong>{c.name}</strong><p className="text-sm text-slate-500">{c.email} - {c.phone || "No phone"} - {c.isActive ? "Active" : "Blocked"}</p><p className="text-sm">Orders {c.orders?.length || 0} - Spending {money(c.totalSpending || 0)} - AOV {money(c.averageOrderValue || 0)}</p><p className="text-xs text-slate-500">Cancelled {c.orders?.filter((o:any)=>o.status==="CANCELLED").length || 0} - Returned {c.orders?.filter((o:any)=>o.status==="RETURNED").length || 0} - Support {c.supportTickets?.length || 0}</p></div><div className="flex gap-2"><a className="rounded-md border p-2" href={`https://wa.me/${String(c.phone||"").replace(/\D/g,"")}`} target="_blank"><MessageCircle size={17}/></a><button className="rounded-md border p-2" onClick={()=>setSelected(c)}><Edit size={17}/></button></div></div></div>) : <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No customers found.</div>}</div>{selected?<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><div className="w-full max-w-2xl rounded-xl bg-white p-5 dark:bg-slate-950"><h2 className="text-2xl font-black">{selected.name}</h2><div className="mt-4 grid gap-3"><label className="flex gap-2"><input type="checkbox" checked={selected.isActive} onChange={(e)=>setSelected({...selected,isActive:e.target.checked})}/> Active / unblocked</label><textarea className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Internal notes" value={selected.internalNotes||""} onChange={(e)=>setSelected({...selected,internalNotes:e.target.value})}/><div className="rounded-lg border p-3 text-sm">{selected.addresses?.map((a:any)=><p key={a.id}>{a.addressLine}, {a.city}</p>)}</div></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={()=>setSelected(null)}>Cancel</Button><Button variant="accent" onClick={()=>void save()}>Save</Button></div></div></div>:null}<Toast text={toast}/></div>;
}

export function CrudManager({ title, endpoint, fields }: { title: string; endpoint: string; fields: string[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null);
  const [toast, setToast] = useState("");
  const load = useCallback(async () => { const data = await fetch(endpoint).then((r)=>r.json()); setItems(Array.isArray(data) ? data : []); }, [endpoint]);
  useEffect(()=>{ void load(); }, [load]);
  async function save() {
    const r = await fetch(form.id ? `${endpoint}/${form.id}` : endpoint, { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setToast(r.ok ? "Saved" : "Save failed"); if (r.ok) { setForm(null); await load(); }
  }
  async function remove(id:string) { if(!confirm("Delete this item?")) return; const r=await fetch(`${endpoint}/${id}`,{method:"DELETE"}); setToast(r.ok?"Deleted":"Delete failed"); await load(); }
  return <div className="space-y-4"><div className="rounded-xl border bg-white p-4 dark:bg-slate-900"><Button variant="accent" onClick={()=>setForm({isActive:true, startsAt:new Date().toISOString().slice(0,10), type:"HERO"})}><Plus size={17}/> Add {title}</Button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.length?items.map((item)=><div key={item.id} className="rounded-xl border bg-white p-4 dark:bg-slate-900"><strong>{item.code || item.title}</strong><p className="text-sm text-slate-500">{item.isActive ? "Active" : "Inactive"} {item.expiresAt ? `- expires ${new Date(item.expiresAt).toLocaleDateString()}` : ""}</p><div className="mt-3 flex gap-2"><button className="rounded-md border p-2" onClick={()=>setForm(item)}><Edit size={17}/></button><button className="rounded-md border p-2 text-red-600" onClick={()=>void remove(item.id)}><Trash2 size={17}/></button></div></div>):<div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No records found.</div>}</div>{form?<div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 dark:bg-slate-950"><h2 className="text-2xl font-black">{form.id?"Edit":"Create"} {title}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{fields.map((field)=><label key={field} className="text-sm font-semibold">{field.replaceAll("_"," ")}<input className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" type={field.includes("date")||field.includes("At")?"date":field.includes("percent")||field.includes("amount")||field.includes("limit")||field.includes("Order")||field.includes("sort")?"number":"text"} value={String(form[field]??"")} onChange={(e)=>setForm({...form,[field]:e.target.value})}/></label>)}<label className="flex items-center gap-2 rounded-lg border p-2"><input type="checkbox" checked={!!form.isActive} onChange={(e)=>setForm({...form,isActive:e.target.checked})}/> Active</label><label className="flex items-center gap-2 rounded-lg border p-2"><input type="checkbox" checked={!!form.freeDelivery} onChange={(e)=>setForm({...form,freeDelivery:e.target.checked})}/> Free delivery</label></div><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={()=>setForm(null)}>Cancel</Button><Button variant="accent" onClick={()=>void save()}><Save size={17}/> Save</Button></div></div></div>:null}<Toast text={toast}/></div>;
}
