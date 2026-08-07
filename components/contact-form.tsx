"use client";

import { FormEvent, useState } from "react";
import { Loader2, Send } from "lucide-react";

export function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setLoading(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.get("type"), title: form.get("title"), description: form.get("description"),
          customerName: form.get("customerName"), phone: form.get("phone"), email: form.get("email"), city: form.get("city")
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request could not be submitted");
      formElement.reset();
      setSuccess(`Request received. Reference: ${data.id}`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Request could not be submitted"); }
    finally { setLoading(false); }
  }

  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-bold">Name<input name="customerName" required minLength={2} className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
    <label className="text-sm font-bold">Phone<input name="phone" required minLength={8} inputMode="tel" className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
    <label className="text-sm font-bold">Email<input name="email" type="email" className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
    <label className="text-sm font-bold">City<input name="city" className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
    <label className="text-sm font-bold">Request type<select name="type" className="premium-field mt-1 w-full rounded-lg px-3 py-2.5"><option value="GENERAL">General enquiry</option><option value="PRODUCT">Product help</option><option value="ORDER">Order support</option><option value="SERVICE">Home service</option><option value="WHOLESALE">Wholesale</option></select></label>
    <label className="text-sm font-bold">Subject<input name="title" required minLength={2} className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
    <label className="text-sm font-bold sm:col-span-2">How can we help?<textarea name="description" required minLength={5} rows={5} className="premium-field mt-1 w-full resize-none rounded-lg p-3" /></label>
    {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700 sm:col-span-2" role="alert">{error}</p> : null}
    {success ? <p className="rounded-lg bg-emerald-50 p-3 text-sm font-bold text-emerald-800 sm:col-span-2" role="status">{success}</p> : null}
    <button type="submit" disabled={loading} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-red-700 px-5 text-sm font-black text-white transition hover:bg-slate-950 disabled:opacity-60 sm:col-span-2">{loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Send request</button>
  </form>;
}

