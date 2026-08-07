"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, MessageCircle, RefreshCw, ShoppingBag, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

type AbandonedCart = {
  id: string;
  sessionId?: string | null;
  customer?: { name: string; email?: string | null; phone?: string | null } | null;
  itemCount: number;
  subtotal: number;
  updatedAt: string;
  items: Array<{ id: string; quantity: number; product: { name: string; sku: string; price: number } }>;
};

export function AdminAbandonedCartManager() {
  const [items, setItems] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/abandoned-carts");
    const data = await response.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(cartId: string, action: string) {
    const response = await fetch("/api/admin/abandoned-carts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cartId, action })
    });
    const result = await response.json().catch(() => ({}));
    setToast(response.ok ? (action === "send" ? result.message || "Recovery notification queued" : "Cart updated") : result.error || "Action failed");
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Abandoned cart recovery</h2>
            <p className="mt-1 text-sm text-slate-500">Email/WhatsApp recovery templates are integration-ready and use customer contact info when available.</p>
          </div>
          <Button variant="outline" onClick={() => void load()}><RefreshCw size={17} /> Refresh</Button>
        </div>
      </div>

      <div className="grid gap-3">
        {loading ? <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">Loading abandoned carts...</div> : null}
        {!loading && !items.length ? <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">No abandoned carts yet.</div> : null}
        {items.map((cart) => (
          <div key={cart.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <strong>{cart.customer?.name || "Guest customer"}</strong>
                <p className="text-sm text-slate-500">{cart.customer?.email || "No email"} - {cart.customer?.phone || "No phone"} - {new Date(cart.updatedAt).toLocaleString()}</p>
                <p className="mt-1 text-sm font-bold">{cart.itemCount} item(s) - {money(cart.subtotal)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="accent" onClick={() => void act(cart.id, "send")}><Mail size={17} /> Send recovery</Button>
                {cart.customer?.phone ? <a className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" href={`https://wa.me/${String(cart.customer.phone).replace(/\D/g, "")}`} target="_blank"><MessageCircle size={17} /> WhatsApp</a> : null}
                <Button variant="outline" onClick={() => void act(cart.id, "recovered")}><ShoppingBag size={17} /> Mark recovered</Button>
                <Button variant="outline" onClick={() => void act(cart.id, "closed")}><XCircle size={17} /> Close</Button>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950">
                  <span>{item.quantity} x {item.product.name} <span className="text-slate-500">({item.product.sku})</span></span>
                  <strong>{money(item.product.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {toast ? <div className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">{toast}</div> : null}
    </div>
  );
}
