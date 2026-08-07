"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, PackageCheck, Truck } from "lucide-react";
import { money } from "@/lib/utils";

type Order = {
  orderNumber: string;
  status: string;
  total: string | number;
  customerName: string;
  trackingNumber?: string | null;
  courierName?: string | null;
  timeline: Array<{ id: string; status: string; note?: string | null; createdAt: string }>;
  summary?: {
    subtotal: number;
    discount: number;
    deliveryCharge: number;
    estimatedDaysMin?: number;
    estimatedDaysMax?: number;
  };
};

export function OrderTracker({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${orderNumber}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Order not found");
        setOrder(data);
      })
      .catch((reason) => {
        const local = localStorage.getItem(`hammer_order_${orderNumber}`);
        if (local) {
          const parsed = JSON.parse(local) as Order;
          setOrder(parsed);
          setError("");
          void fetch("/api/orders/fallback-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed)
          });
          return;
        }
        setError(reason.message);
      });
  }, [orderNumber]);

  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>;
  if (!order) return <div className="skeleton h-48 rounded-lg" />;

  return (
    <div className="premium-card overflow-hidden rounded-2xl">
      <div className="bg-gradient-to-r from-slate-950 to-red-950 p-5 text-white">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-white/10"><PackageCheck className="text-white" /></span>
          <div>
            <p className="text-sm text-white/70">Order tracking</p>
            <h1 className="text-2xl font-black">{order.orderNumber}</h1>
          </div>
        </div>
      </div>
      <div className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/70 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">Current status</p>
          <strong className="text-xl">{order.status.replaceAll("_", " ")}</strong>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">{order.courierName || "Courier pending"}</p>
          <strong>{money(Number(order.total || 0))}</strong>
        </div>
      </div>
      {order.summary ? (
        <div className="mt-4 grid gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900 sm:grid-cols-3">
          <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Delivery {money(order.summary.deliveryCharge)}</span>
          <span>Discount {money(order.summary.discount)}</span>
          <span className="flex items-center gap-2"><Truck size={16} /> {order.summary.estimatedDaysMin || 0}-{order.summary.estimatedDaysMax || 5} days</span>
        </div>
      ) : null}
      <ol className="mt-6 grid gap-3">
        {order.timeline.map((event) => (
          <li key={event.id} className="rounded-xl border border-slate-200 bg-white/75 p-3 shadow-sm">
            <strong>{event.status.replaceAll("_", " ")}</strong>
            <p className="text-sm text-slate-600">{event.note || "Status updated"}</p>
            <time className="mt-1 block text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</time>
          </li>
        ))}
      </ol>
      </div>
    </div>
  );
}
