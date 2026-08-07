"use client";

import { useState } from "react";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import { type CatalogProduct } from "@/lib/catalog";
import { Button } from "@/components/ui/button";

export function ProductQuoteForm({ product, variantId }: { product: CatalogProduct; variantId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            productId: product.id,
            variantId: variantId || null,
            quantity: Number(formData.get("quantity") || 1)
          }],
          customerName: formData.get("customerName"),
          customerPhone: formData.get("customerPhone"),
          customerEmail: formData.get("customerEmail"),
          city: formData.get("city"),
          note: formData.get("note")
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Quote request failed.");
      setMessage("Quote request saved. Admin will reply from the quotation panel.");
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Quote request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER?.replace(/\D/g, "") || "";
  const whatsappText = encodeURIComponent(`Assalamualaikum Hammer Trading Company, I want to order/inquire about ${product.name} (${product.sku}).`);

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/[0.78] p-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen((value) => !value)}><Send size={17} /> Request bulk quote</Button>
        {whatsappNumber ? <a href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5">
          <MessageCircle size={17} /> WhatsApp quick order
        </a> : null}
      </div>
      {open ? (
        <form action={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="quantity" required type="number" min={1} defaultValue={10} className="premium-field rounded-lg px-3 py-2" placeholder="Quantity" />
          <input name="city" required className="premium-field rounded-lg px-3 py-2" placeholder="City" />
          <input name="customerName" required className="premium-field rounded-lg px-3 py-2" placeholder="Name / company" />
          <input name="customerPhone" required className="premium-field rounded-lg px-3 py-2" placeholder="Phone" />
          <input name="customerEmail" type="email" className="premium-field rounded-lg px-3 py-2 sm:col-span-2" placeholder="Email optional" />
          <textarea name="note" className="premium-field rounded-lg px-3 py-2 sm:col-span-2" placeholder="Message / delivery requirements" />
          <Button className="sm:col-span-2" variant="accent" disabled={loading}>{loading ? "Sending..." : "Submit quote request"}</Button>
        </form>
      ) : null}
      {message ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-700"><CheckCircle2 className="mr-1 inline text-emerald-600" size={17} />{message}</p> : null}
    </div>
  );
}
