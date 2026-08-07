"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit, FileText, RefreshCw, Search, ShoppingBag, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

type QuoteStatus = "PENDING" | "REPLIED" | "APPROVED" | "REJECTED" | "CONVERTED";

type QuoteItem = {
  id: string;
  productId: string;
  variantId?: string | null;
  name: string;
  sku: string;
  variantTitle?: string | null;
  variantOptions?: Record<string, unknown> | null;
  quantity: number;
  requestedTargetPrice?: number | null;
  quotedUnitPrice?: number | null;
  lineTotal?: number | null;
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    wholesalePrice?: number | null;
    stock: number;
  };
  variant?: {
    id: string;
    title: string;
    sku: string;
    price: number;
    wholesalePrice?: number | null;
    stock: number;
    options?: Record<string, unknown> | null;
  } | null;
};

type Quote = {
  id: string;
  productName: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  city: string;
  note?: string | null;
  status: QuoteStatus;
  adminReply?: string | null;
  quotedPrice?: number | null;
  quotedSubtotal?: number | null;
  discountTotal: number;
  deliveryCharge?: number | null;
  quotedTotal?: number | null;
  validUntil?: string | null;
  terms?: string | null;
  convertedOrderId?: string | null;
  convertedOrder?: { orderNumber: string; total: number } | null;
  items: QuoteItem[];
  createdAt: string;
};

const statuses: Array<"" | QuoteStatus> = ["", "PENDING", "REPLIED", "APPROVED", "REJECTED", "CONVERTED"];

function suggestedPrice(item: QuoteItem) {
  return item.variant?.wholesalePrice
    ?? item.product.wholesalePrice
    ?? item.variant?.price
    ?? item.product.price;
}

function editableQuote(quote: Quote) {
  return {
    ...quote,
    discountTotal: Number(quote.discountTotal || 0),
    deliveryCharge: Number(quote.deliveryCharge || 0),
    items: quote.items.map((item) => ({
      ...item,
      quotedUnitPrice: item.quotedUnitPrice ?? suggestedPrice(item)
    }))
  };
}

function optionLabel(item: QuoteItem) {
  const options = item.variantOptions && typeof item.variantOptions === "object"
    ? Object.entries(item.variantOptions).map(([key, value]) => `${key}: ${String(value)}`).join(" / ")
    : "";
  return options || item.variantTitle || "Standard product";
}

export function AdminQuoteManager() {
  const [items, setItems] = useState<Quote[]>([]);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      const response = await fetch(`/api/admin/quotes?${params}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to load quotation requests.");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Unable to load quotation requests.");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const pricedSubtotal = useMemo(() => {
    if (!selected?.items.length) return Number(selected?.quotedSubtotal || selected?.quotedPrice || 0);
    return selected.items.reduce((sum, item) => sum + Number(item.quotedUnitPrice || 0) * item.quantity, 0);
  }, [selected]);
  const quotedTotal = Math.max(0, pricedSubtotal - Number(selected?.discountTotal || 0))
    + Number(selected?.deliveryCharge || 0);

  function openQuote(quote: Quote) {
    setSelected(editableQuote(quote));
    setToast("");
  }

  function updateLinePrice(id: string, value: number) {
    if (!selected) return;
    setSelected({
      ...selected,
      items: selected.items.map((item) => item.id === id ? { ...item, quotedUnitPrice: Math.max(0, value) } : item)
    });
  }

  async function save(nextStatus?: QuoteStatus) {
    if (!selected || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/quotes/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus || selected.status,
          adminReply: selected.adminReply,
          quotedPrice: selected.items.length ? undefined : pricedSubtotal,
          discountTotal: selected.discountTotal,
          deliveryCharge: selected.deliveryCharge,
          validUntil: selected.validUntil || null,
          terms: selected.terms,
          items: selected.items.length
            ? selected.items.map((item) => ({ id: item.id, quotedUnitPrice: Number(item.quotedUnitPrice || 0) }))
            : undefined
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Quotation update failed.");
      setSelected(editableQuote(data.quote));
      setToast(nextStatus === "APPROVED" ? "Quotation approved and ready for conversion." : "Quotation updated.");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Quotation update failed.");
    } finally {
      setSaving(false);
    }
  }

  async function convert() {
    if (!selected || converting) return;
    if (!window.confirm("Convert this approved quotation into a COD order? Exact product and variant stock will be reduced.")) return;
    setConverting(true);
    try {
      const response = await fetch(`/api/admin/quotes/${selected.id}/convert`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Quotation conversion failed.");
      setToast(`Order created: ${data.orderNumber}`);
      setSelected(null);
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Quotation conversion failed.");
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap gap-2">
          <label className="flex min-h-11 min-w-64 flex-1 items-center border border-slate-300 px-3 dark:border-slate-700">
            <Search aria-hidden="true" size={17} className="text-slate-400" />
            <span className="sr-only">Search quotations</span>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              placeholder="Search customer, product, SKU, phone or city"
            />
          </label>
          <select
            aria-label="Quotation status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-h-11 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {statuses.map((item) => <option key={item} value={item}>{item || "All statuses"}</option>)}
          </select>
          <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw size={17} /> Refresh</Button>
        </div>
      </div>

      <div className="grid gap-3">
        {loading ? <div className="border border-dashed p-8 text-center text-slate-500">Loading quotations...</div> : null}
        {!loading && !items.length ? <div className="border border-dashed p-8 text-center text-slate-500">No quotation requests found.</div> : null}
        {items.map((quote) => (
          <article key={quote.id} className="border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="truncate">{quote.productName}</strong>
                  <span className="bg-slate-100 px-2 py-1 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200">{quote.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {quote.items.length || 1} product line{quote.items.length === 1 ? "" : "s"} / {quote.quantity} units / {quote.customerName} / {quote.city}
                </p>
                <p className="mt-1 text-xs text-slate-500">{quote.customerPhone} / {new Date(quote.createdAt).toLocaleString()}</p>
                {quote.quotedTotal ? <p className="mt-2 text-sm font-bold">Quoted total: {money(quote.quotedTotal)}</p> : null}
                {quote.convertedOrder ? <p className="mt-1 text-sm font-bold text-emerald-700">Converted: {quote.convertedOrder.orderNumber}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => openQuote(quote)}><Edit size={17} /> Manage</Button>
                <a
                  className="inline-flex min-h-11 items-center border border-slate-300 px-4 py-2 text-sm font-semibold transition-colors hover:border-emerald-600 hover:text-emerald-700 dark:border-slate-700"
                  href={`https://wa.me/${String(quote.customerPhone).replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-3 sm:p-5" role="dialog" aria-modal="true" aria-labelledby="quote-dialog-title">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto bg-white shadow-2xl dark:bg-slate-950">
            <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Wholesale quotation</p>
                <h2 id="quote-dialog-title" className="mt-1 text-2xl font-black">{selected.productName}</h2>
                <p className="mt-1 text-sm text-slate-500">{selected.customerName} / {selected.customerPhone} / {selected.city}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close quotation"
                className="grid h-11 w-11 shrink-0 place-items-center border border-slate-300 transition-colors hover:border-red-500 hover:text-red-600 dark:border-slate-700"
              >
                <X size={20} />
              </button>
            </header>

            <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
              <section>
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                  <h3 className="font-black">Product lines</h3>
                  <span className="font-mono text-xs text-slate-500">{selected.items.length || 1} lines</span>
                </div>

                {selected.items.length ? (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {selected.items.map((item) => {
                      const stock = item.variant?.stock ?? item.product.stock;
                      return (
                        <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_110px_140px] sm:items-end">
                          <div className="min-w-0">
                            <p className="font-black">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{optionLabel(item)}</p>
                            <p className="mt-1 font-mono text-xs text-slate-500">{item.sku} / Stock {stock}</p>
                            <p className="mt-2 text-xs text-slate-500">Catalog trade price: {money(suggestedPrice(item))}</p>
                          </div>
                          <div>
                            <span className="text-xs font-bold uppercase text-slate-500">Quantity</span>
                            <p className="mt-2 font-mono text-lg font-black">{item.quantity}</p>
                          </div>
                          <label className="text-xs font-bold uppercase text-slate-500">
                            Unit price
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.quotedUnitPrice ?? ""}
                              onChange={(event) => updateLinePrice(item.id, Number(event.target.value || 0))}
                              className="mt-1 min-h-11 w-full border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    This is a legacy custom request. Set its quoted total in the summary before approval.
                  </div>
                )}

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Status
                    <select
                      className="mt-1 min-h-11 w-full border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                      value={selected.status}
                      onChange={(event) => setSelected({ ...selected, status: event.target.value as QuoteStatus })}
                      disabled={selected.status === "CONVERTED"}
                    >
                      {statuses.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Valid until
                    <input
                      type="date"
                      className="mt-1 min-h-11 w-full border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
                      value={selected.validUntil ? selected.validUntil.slice(0, 10) : ""}
                      onChange={(event) => setSelected({ ...selected, validUntil: event.target.value || null })}
                    />
                  </label>
                  <label className="text-sm font-semibold sm:col-span-2">
                    Customer reply
                    <textarea
                      className="mt-1 min-h-24 w-full border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                      value={selected.adminReply || ""}
                      onChange={(event) => setSelected({ ...selected, adminReply: event.target.value })}
                    />
                  </label>
                  <label className="text-sm font-semibold sm:col-span-2">
                    Terms
                    <textarea
                      className="mt-1 min-h-24 w-full border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                      value={selected.terms || ""}
                      onChange={(event) => setSelected({ ...selected, terms: event.target.value })}
                      placeholder="Payment, delivery and stock allocation terms"
                    />
                  </label>
                  <div className="border border-slate-200 p-3 text-sm sm:col-span-2 dark:border-slate-800">
                    <strong>Customer note</strong>
                    <p className="mt-2 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{selected.note || "No note"}</p>
                  </div>
                </div>
              </section>

              <aside className="border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <h3 className="font-black">Quotation summary</h3>
                {!selected.items.length ? (
                  <label className="mt-4 block text-sm font-semibold">
                    Legacy quoted subtotal
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="mt-1 min-h-11 w-full border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                      value={selected.quotedSubtotal ?? selected.quotedPrice ?? 0}
                      onChange={(event) => setSelected({ ...selected, quotedSubtotal: Number(event.target.value || 0), quotedPrice: Number(event.target.value || 0) })}
                    />
                  </label>
                ) : null}
                <label className="mt-4 block text-sm font-semibold">
                  Discount
                  <input
                    type="number"
                    min={0}
                    max={pricedSubtotal}
                    step="0.01"
                    className="mt-1 min-h-11 w-full border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                    value={selected.discountTotal || 0}
                    onChange={(event) => setSelected({ ...selected, discountTotal: Number(event.target.value || 0) })}
                  />
                </label>
                <label className="mt-4 block text-sm font-semibold">
                  Delivery charge
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className="mt-1 min-h-11 w-full border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"
                    value={selected.deliveryCharge || 0}
                    onChange={(event) => setSelected({ ...selected, deliveryCharge: Number(event.target.value || 0) })}
                  />
                </label>
                <dl className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm dark:border-slate-700">
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Subtotal</dt><dd className="font-bold">{money(pricedSubtotal)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Discount</dt><dd className="font-bold">-{money(Number(selected.discountTotal || 0))}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Delivery</dt><dd className="font-bold">{money(Number(selected.deliveryCharge || 0))}</dd></div>
                  <div className="flex justify-between gap-4 border-t border-slate-300 pt-3 text-lg dark:border-slate-700"><dt className="font-black">Total</dt><dd className="font-black text-red-600">{money(quotedTotal)}</dd></div>
                </dl>

                <div className="mt-6 grid gap-2">
                  <Button variant="outline" onClick={() => void save()} disabled={saving || selected.status === "CONVERTED"}>
                    <FileText size={17} /> {saving ? "Saving..." : "Save quotation"}
                  </Button>
                  <Button variant="outline" onClick={() => void save("APPROVED")} disabled={saving || selected.status === "CONVERTED"}>
                    <CheckCircle2 size={17} /> Approve
                  </Button>
                  <Button variant="outline" onClick={() => void save("REJECTED")} disabled={saving || selected.status === "CONVERTED"}>
                    <XCircle size={17} /> Reject
                  </Button>
                  <Button
                    variant="accent"
                    onClick={() => void convert()}
                    disabled={converting || selected.status !== "APPROVED" || Boolean(selected.convertedOrderId)}
                  >
                    <ShoppingBag size={17} /> {converting ? "Converting..." : "Convert to order"}
                  </Button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl" role="status">
          <span className="flex-1">{toast}</span>
          <button type="button" onClick={() => setToast("")} aria-label="Dismiss notification"><X size={16} /></button>
        </div>
      ) : null}
    </div>
  );
}
