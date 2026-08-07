"use client";

import { CalendarDays, CheckCircle2, LoaderCircle, MapPin, Phone, Search, UserRound } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const statuses = ["ALL", "NEW", "CONTACTED", "SITE_VISIT", "QUOTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
type ServiceStatus = Exclude<(typeof statuses)[number], "ALL">;
type ServiceRequest = {
  id: string;
  requestNumber: string;
  customerName: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  roomType: string;
  roomSize: string | null;
  preferredDate: string | null;
  note: string | null;
  status: ServiceStatus;
  estimatedTotal: number | null;
  adminNote: string | null;
  createdAt: string;
  package: { id: string; name: string } | null;
};

async function responseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  return data.error || "The request could not be completed.";
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(value));
}

function statusTone(status: ServiceStatus) {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200";
  if (status === "CANCELLED") return "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  if (status === "NEW") return "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200";
  if (status === "QUOTED" || status === "CONFIRMED") return "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200";
  return "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200";
}

export function RoomServiceManager() {
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<(typeof statuses)[number]>("ALL");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => items.find((item) => item.id === selectedId) || null, [items, selectedId]);
  const [update, setUpdate] = useState<{ status: ServiceStatus; estimatedTotal: string; adminNote: string } | null>(null);
  const summary = useMemo(() => ({
    newCount: items.filter((item) => item.status === "NEW").length,
    active: items.filter((item) => ["CONTACTED", "SITE_VISIT", "QUOTED", "CONFIRMED", "IN_PROGRESS"].includes(item.status)).length,
    completed: items.filter((item) => item.status === "COMPLETED").length,
    quotedValue: items.filter((item) => item.status !== "CANCELLED").reduce((sum, item) => sum + (item.estimatedTotal || 0), 0)
  }), [items]);

  const load = useCallback(async (nextQuery: string, nextStatus: (typeof statuses)[number]) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      if (nextStatus !== "ALL") params.set("status", nextStatus);
      const response = await fetch(`/api/admin/room-services?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await responseError(response));
      const rows = await response.json() as ServiceRequest[];
      setItems(rows);
      const requestedId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("id") : null;
      setSelectedId((current) => rows.some((row) => row.id === (requestedId || current)) ? (requestedId || current) : rows[0]?.id || null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Service requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load("", "ALL"); }, [load]);
  useEffect(() => {
    if (!selected) { setUpdate(null); return; }
    setUpdate({ status: selected.status, estimatedTotal: selected.estimatedTotal == null ? "" : String(selected.estimatedTotal), adminNote: selected.adminNote || "" });
  }, [selected]);

  function search(event: FormEvent) {
    event.preventDefault();
    void load(query, status);
  }

  async function save() {
    if (!selected || !update) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/room-services/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: update.status, estimatedTotal: update.estimatedTotal ? Number(update.estimatedTotal) : null, adminNote: update.adminNote || null })
      });
      if (!response.ok) throw new Error(await responseError(response));
      const row = await response.json() as ServiceRequest;
      setItems((current) => current.map((item) => item.id === row.id ? { ...item, ...row } : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The service request could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div><p className="text-xs font-black uppercase tracking-[0.16em] text-red-700 dark:text-red-300">Installation operations</p><h2 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">Room service requests</h2><p className="mt-2 text-sm text-slate-500">Review customer requirements, schedule a visit, quote the work, and track installation progress.</p></div>
      <form onSubmit={search} className="flex flex-wrap gap-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
        <label className="flex min-w-64 flex-1 items-center gap-2 rounded-md bg-slate-100 px-3 dark:bg-slate-800"><Search size={17} className="text-slate-400" /><input className="min-h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Request, customer, phone, or city" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="Request status" className="admin-input min-w-44" value={status} onChange={(event) => { const next = event.target.value as typeof status; setStatus(next); void load(query, next); }}>{statuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
        <Button type="submit" variant="accent">Search</Button>
      </form>
      {error ? <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</div> : null}
      <section className="grid overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900 sm:grid-cols-2 xl:grid-cols-4">
        {[["New requests", summary.newCount], ["Active work", summary.active], ["Completed", summary.completed], ["Open quoted value", `PKR ${summary.quotedValue.toLocaleString("en-PK")}`]].map(([label, value], index) => <div key={label} className={`px-5 py-4 ${index ? "border-t border-slate-100 sm:border-l sm:border-t-0 dark:border-white/10" : ""}`}><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p><strong className="mt-1 block font-mono text-xl text-slate-950 dark:text-white">{value}</strong></div>)}
      </section>

      <div className="grid min-h-[34rem] gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <section className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/10"><h3 className="font-black">Requests</h3><span className="font-mono text-xs text-slate-500">{items.length}</span></div>
          <div className="max-h-[42rem] overflow-y-auto" data-lenis-prevent>
            {loading ? <div className="grid min-h-40 place-items-center"><LoaderCircle className="animate-spin text-red-700" /></div> : null}
            {!loading && !items.length ? <div className="p-10 text-center text-sm text-slate-500">No requests match these filters.</div> : null}
            {items.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`block w-full border-b border-slate-100 px-4 py-4 text-left transition dark:border-white/10 ${selectedId === item.id ? "bg-red-50 dark:bg-red-950/25" : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"}`}>
                <span className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block truncate text-sm">{item.customerName}</strong><span className="mt-1 block truncate text-xs text-slate-500">{item.package?.name || item.roomType} / {item.city}</span></span><span className={`rounded-md px-2 py-1 text-[9px] font-black ${statusTone(item.status)}`}>{item.status.replaceAll("_", " ")}</span></span>
                <span className="mt-3 flex items-center justify-between gap-2 font-mono text-[10px] text-slate-400"><span>{item.requestNumber}</span><span>{dateLabel(item.createdAt)}</span></span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-6">
          {!selected || !update ? <div className="grid min-h-80 place-items-center text-center text-sm text-slate-500">Select a request to review its details.</div> : (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-red-700 dark:text-red-300">{selected.requestNumber}</p><h3 className="mt-1 text-2xl font-black">{selected.customerName}</h3><p className="mt-1 text-sm text-slate-500">Submitted {dateLabel(selected.createdAt)}</p></div><span className={`rounded-md px-3 py-2 text-xs font-black ${statusTone(selected.status)}`}>{selected.status.replaceAll("_", " ")}</span></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800"><UserRound size={18} className="text-red-700" /><p className="mt-3 text-xs font-black uppercase text-slate-400">Customer</p><p className="mt-1 text-sm font-bold">{selected.email || "No email provided"}</p></div>
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800"><Phone size={18} className="text-red-700" /><p className="mt-3 text-xs font-black uppercase text-slate-400">Phone</p><a className="mt-1 block text-sm font-bold hover:text-red-700" href={`tel:${selected.phone}`}>{selected.phone}</a></div>
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800"><MapPin size={18} className="text-red-700" /><p className="mt-3 text-xs font-black uppercase text-slate-400">Site</p><p className="mt-1 text-sm font-bold">{selected.address}, {selected.city}</p></div>
                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800"><CalendarDays size={18} className="text-red-700" /><p className="mt-3 text-xs font-black uppercase text-slate-400">Preferred date</p><p className="mt-1 text-sm font-bold">{selected.preferredDate ? new Intl.DateTimeFormat("en-PK", { dateStyle: "long", timeZone: "Asia/Karachi" }).format(new Date(selected.preferredDate)) : "Flexible"}</p></div>
              </div>
              <div className="mt-5 rounded-lg bg-slate-950 p-5 text-white dark:bg-slate-800"><p className="text-xs font-black uppercase tracking-[0.12em] text-red-300">Work requested</p><h4 className="mt-2 text-xl font-black">{selected.package?.name || selected.roomType}</h4><p className="mt-1 text-sm text-slate-300">{selected.roomType}{selected.roomSize ? ` / ${selected.roomSize}` : ""}</p>{selected.note ? <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">{selected.note}</p> : null}</div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-bold">Status<select className="admin-input mt-1 w-full" value={update.status} onChange={(event) => setUpdate({ ...update, status: event.target.value as ServiceStatus })}>{statuses.filter((value) => value !== "ALL").map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
                <label className="text-sm font-bold">Estimated total<input type="number" min={0} className="admin-input mt-1 w-full" placeholder="PKR" value={update.estimatedTotal} onChange={(event) => setUpdate({ ...update, estimatedTotal: event.target.value })} /></label>
              </div>
              <label className="mt-4 block text-sm font-bold">Internal admin note<textarea rows={4} className="admin-input mt-1 w-full resize-none py-3" placeholder="Site visit, measurements, quote details, or follow-up notes" value={update.adminNote} onChange={(event) => setUpdate({ ...update, adminNote: event.target.value })} /></label>
              <Button variant="accent" className="mt-5 w-full gap-2" disabled={busy} onClick={() => void save()}>{busy ? <LoaderCircle className="animate-spin" size={17} /> : <CheckCircle2 size={17} />} Save request update</Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
