"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReturnItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  evidenceUrl?: string | null;
  createdAt: string;
};

export function ReturnRequestManager() {
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/returns", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Return requests could not be loaded.");
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Return requests could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: formData.get("orderNumber"),
          reason: formData.get("reason"),
          description: formData.get("description"),
          evidenceUrl: formData.get("evidenceUrl")
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Return request could not be created.");
      event.currentTarget.reset();
      setMessage("Return request created. Support will review it in the admin panel.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Return request could not be created.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form onSubmit={submit} className="border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Structured request</p>
        <h2 className="mt-2 text-2xl font-black">Open a return</h2>
        <div className="mt-5 grid gap-4">
          <label className="text-sm font-semibold">Order number<input name="orderNumber" required className="premium-field mt-1 min-h-11 w-full px-3" /></label>
          <label className="text-sm font-semibold">Reason<select name="reason" className="premium-field mt-1 min-h-11 w-full px-3">{["DAMAGED","WRONG_ITEM","DEFECTIVE","MISSING_ITEM","OTHER"].map((reason) => <option key={reason} value={reason}>{reason.replaceAll("_", " ")}</option>)}</select></label>
          <label className="text-sm font-semibold">Details<textarea name="description" required minLength={10} maxLength={3000} className="premium-field mt-1 min-h-28 w-full p-3" /></label>
          <label className="text-sm font-semibold">Evidence URL (optional)<input name="evidenceUrl" type="url" className="premium-field mt-1 min-h-11 w-full px-3" /></label>
        </div>
        <Button className="mt-5 w-full" variant="accent" disabled={saving}>{saving ? <><Loader2 size={17} className="animate-spin" /> Submitting...</> : "Submit return request"}</Button>
        {message ? <p className="mt-4 border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800" role="status">{message}</p> : null}
      </form>

      <section>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Your requests</p>
        <h2 className="mt-2 text-2xl font-black">Return history</h2>
        <div className="mt-5 grid gap-3">
          {loading ? <div className="border border-dashed p-8 text-center text-slate-500">Loading requests...</div> : null}
          {!loading && !items.length ? <div className="border border-dashed p-8 text-center text-slate-500"><RotateCcw className="mx-auto mb-3" />No return requests yet.</div> : null}
          {items.map((item) => (
            <article key={item.id} className="border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong>{item.title}</strong><span className="bg-slate-100 px-2 py-1 text-xs font-black dark:bg-slate-800">{item.status}</span></div>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.description}</p>
              <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
