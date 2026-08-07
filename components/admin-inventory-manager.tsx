"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type InventoryProduct = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  inventoryLogs: Array<{ id: string; type: string; quantity: number; previousStock: number; newStock: number; reason: string; createdAt: string; actor?: { name: string } | null }>;
};

export function AdminInventoryManager() {
  const [items, setItems] = useState<InventoryProduct[]>([]);
  const [q, setQ] = useState("");
  const [stock, setStock] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [allowNegative, setAllowNegative] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/inventory?q=${encodeURIComponent(q)}&stock=${stock}`);
    const data = await response.json();
    setLoading(false);
    if (response.ok) setItems(data);
    else setToast(data.error || "Unable to load inventory");
    const settings = await fetch("/api/admin/inventory/settings").then((r) => r.json()).catch(() => ({ allowNegativeStock: false }));
    setAllowNegative(Boolean(settings.allowNegativeStock));
  }, [q, stock]);

  useEffect(() => {
    void load();
  }, [load]);

  async function adjust(product: InventoryProduct) {
    const type = window.prompt("Type: STOCK_IN, STOCK_OUT, or MANUAL_ADJUSTMENT", "STOCK_IN") || "";
    const quantity = Number(window.prompt(type === "MANUAL_ADJUSTMENT" ? "New stock quantity" : "Quantity", "1"));
    const reason = window.prompt("Adjustment reason", "Manual inventory update") || "";
    if (!["STOCK_IN", "STOCK_OUT", "MANUAL_ADJUSTMENT"].includes(type) || !Number.isInteger(quantity) || !reason) return setToast("Invalid adjustment");
    if (!window.confirm(`Apply ${type} for ${product.name}?`)) return;
    const response = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, type, quantity, reason })
    });
    const result = await response.json();
    setToast(response.ok ? `Stock updated: ${result.previousStock} -> ${result.newStock}` : result.error || "Stock update failed");
    await load();
  }

  async function saveSetting(value: boolean) {
    if (!window.confirm(`${value ? "Allow" : "Disallow"} negative stock checkout and adjustments?`)) return;
    const response = await fetch("/api/admin/inventory/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allowNegativeStock: value }) });
    const result = await response.json();
    setAllowNegative(Boolean(result.allowNegativeStock));
    setToast("Inventory setting saved");
  }

  const low = items.filter((item) => item.stock > 0 && item.stock <= item.lowStockThreshold).length;
  const out = items.filter((item) => item.stock <= 0).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        {[["Current SKUs", items.length], ["Low stock", low], ["Out of stock", out], ["Negative stock", allowNegative ? "Allowed" : "Blocked"]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><p className="text-sm font-semibold text-slate-500">{label}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          <div className="flex min-w-64 flex-1 items-center rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"><Search size={17} /><input value={q} onChange={(event) => setQ(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Search SKU or product" /></div>
          <select value={stock} onChange={(event) => setStock(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
          <Button variant="outline" onClick={() => void saveSetting(!allowNegative)}>{allowNegative ? "Block negative stock" : "Allow negative stock"}</Button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-950"><tr><th className="p-3">SKU</th><th>Product</th><th>Current stock</th><th>Warning</th><th>Recent history</th><th>Action</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" /> Loading inventory...</td></tr> : items.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">No inventory records found.</td></tr> : items.map((item) => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3 font-mono">{item.sku}</td><td><strong>{item.name}</strong></td><td className={item.stock <= 0 ? "font-black text-red-600" : item.stock <= item.lowStockThreshold ? "font-black text-amber-600" : "font-bold"}>{item.stock}</td><td>{item.stock <= 0 ? "Out of stock" : item.stock <= item.lowStockThreshold ? "Low stock" : "Healthy"}</td><td>{item.inventoryLogs.length ? item.inventoryLogs.map((log) => <p key={log.id} className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()} - {log.type} {log.quantity} ({log.previousStock} {"->"} {log.newStock}) by {log.actor?.name || "System"} - {log.reason}</p>) : <span className="text-xs text-slate-500">No logs yet</span>}</td><td><Button variant="outline" onClick={() => void adjust(item)}>Adjust stock</Button></td></tr>)}
          </tbody>
        </table>
      </div>
      {toast ? <div className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">{toast}</div> : null}
    </div>
  );
}
