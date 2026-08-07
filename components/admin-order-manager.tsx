"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckSquare, Eye, MessageCircle, Plus, Printer, RefreshCw, Search, ShieldAlert, Trash2, Truck, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { money } from "@/lib/utils";
import type { PrintDocumentKind, PrintableOrder } from "@/components/order-bulk-print";

type Courier = { id: string; name: string };
type Rider = { id: string; name: string; phone?: string | null };
type Order = {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  province: string;
  city: string;
  area?: string | null;
  addressLine: string;
  nearestLandmark?: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: string;
  discountTotal: string;
  manualDiscount: string;
  deliveryCharge: string;
  manualDeliveryCharge?: string | null;
  codAmount?: string | null;
  total: string;
  courierId?: string | null;
  assignedRiderId?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  courierBookingId?: string | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
  deliveredAt?: string | null;
  createdAt?: string;
  confirmationMethod?: string | null;
  confirmationGps?: string | null;
  confirmationPhotoUrl?: string | null;
  deliveryDisputeStatus?: string | null;
  qrcodes: Array<{ id: string; url: string; usedAt?: string | null; expiresAt?: string | null }>;
  timeline: Array<{ id: string; status: string; note?: string | null; createdAt: string }>;
  activityLogs?: Array<{ id: string; action: string; createdAt: string }>;
  items: Array<{ id: string; name: string; sku: string; variantTitle?: string | null; variantOptions?: Record<string, string> | null; quantity: number; price: string; total: string }>;
  engine?: {
    riskScore: number;
    riskLevel: "low" | "medium" | "high";
    slaStatus: "on_track" | "due_today" | "delayed" | "complete";
    recommendedAction: string;
    riskFlags: Array<{ code: string; label: string; severity: "low" | "medium" | "high"; note: string }>;
  };
};

export function AdminOrderManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [source, setSource] = useState<"database" | "fallback" | "">("");
  const [filters, setFilters] = useState({ q: "", status: "", city: "", paymentMethod: "", courierId: "", riderId: "", printStatus: "", risk: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [timelineForm, setTimelineForm] = useState({ status: "", note: "", createdAt: "" });
  const printWindowRef = useRef<Window | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    return params.toString();
  }, [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/orders?${query}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setToast(data.error || "Unable to load orders");
    setOrders(data.items);
    setCouriers(data.couriers);
    setRiders(data.riders);
    setStatuses(data.statuses);
    setPages(data.pages || 1);
    setSource(data.source || "database");
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleOrderIds = useMemo(() => orders.map((order) => order.id), [orders]);
  const allVisibleSelected = visibleOrderIds.length > 0 && visibleOrderIds.every((id) => selectedIds.includes(id));
  const selectedCount = selectedIds.length;

  function isPrinted(order: Order) {
    return Boolean(
      order.activityLogs?.some((log) => log.action === "ORDER_BULK_PRINTED") ||
      order.timeline?.some((event) => event.note?.toLowerCase().includes("bulk order slips printed"))
    );
  }

  function riskClass(level?: string) {
    if (level === "high") return "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900";
    if (level === "medium") return "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900";
    return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900";
  }

  function slaLabel(value?: string) {
    if (value === "due_today") return "Due today";
    if (value === "delayed") return "Delayed";
    if (value === "complete") return "Complete";
    return "On track";
  }

  function toggleOrder(id: string, checked: boolean) {
    setSelectedIds((current) => checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id));
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((current) => checked ? Array.from(new Set([...current, ...visibleOrderIds])) : current.filter((id) => !visibleOrderIds.includes(id)));
  }

  async function open(order: Order) {
    const response = await fetch(`/api/admin/orders/${order.id}`);
    const data = await response.json();
    if (response.ok) {
      setSelected({ ...data, engine: order.engine });
      setTimelineForm({ status: data.status || "", note: "", createdAt: new Date().toISOString().slice(0, 16) });
    }
    else setToast(data.error || "Unable to open order");
  }

  async function saveOrder() {
    if (!selected) return;
    const response = await fetch(`/api/admin/orders/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(selected) });
    const data = await response.json();
    setToast(response.ok ? "Order saved" : data.error || "Save failed");
    await load();
  }

  async function setStatus(status: string) {
    if (!selected) return;
    if (["CANCELLED", "RETURNED", "REFUNDED", "DELIVERY_FAILED"].includes(status) && !window.confirm(`Move order to ${status}? Stock may be restored automatically.`)) return;
    const note = window.prompt("Status note", `Status changed to ${status}`) || "";
    const response = await fetch(`/api/admin/orders/${selected.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, note }) });
    const data = await response.json();
    setToast(response.ok ? `Status updated${data.restoredStock ? " and stock restored" : ""}` : data.error || "Status update failed");
    await open(selected);
    await load();
  }

  async function bookCourier() {
    if (!selected) return;
    const response = await fetch(`/api/admin/orders/${selected.id}/book-courier`, { method: "POST" });
    const data = await response.json();
    setToast(response.ok ? "Courier booked and verified tracking saved" : data.error || "Courier booking failed");
    await open(selected);
    await load();
  }

  async function addTimeline() {
    if (!selected) return;
    if (!timelineForm.note.trim()) return setToast("Timeline note is required");
    const response = await fetch(`/api/admin/orders/${selected.id}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(timelineForm)
    });
    const data = await response.json();
    setToast(response.ok ? "Timeline added" : data.error || "Timeline update failed");
    if (response.ok) {
      setTimelineForm({ status: selected.status, note: "", createdAt: new Date().toISOString().slice(0, 16) });
      await open(selected);
      await load();
    }
  }

  async function deleteOrder() {
    if (!selected) return;
    const confirmed = window.confirm(`Delete order ${selected.orderNumber}? This is permanent. Stock will be restored for active non-delivered orders.`);
    if (!confirmed) return;
    const response = await fetch(`/api/admin/orders/${selected.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoreStock: true })
    });
    const data = await response.json();
    setToast(response.ok ? `Order deleted${data.restoredStock ? " and stock restored" : ""}` : data.error || "Delete failed");
    if (response.ok) {
      setSelected(null);
      setSelectedIds((current) => current.filter((id) => id !== selected.id));
      await load();
    }
  }

  async function prepareBulkPrint(kind: PrintDocumentKind) {
    if (selectedIds.length === 0) return setToast("Select at least one order first");
    const printWindow = window.open("", "_blank", "width=980,height=720");
    if (!printWindow) return setToast("Popup blocked. Please allow popups for printing.");
    printWindowRef.current = printWindow;
    printWindow.document.write(`<!doctype html><html><head><title>Preparing order slips</title></head><body style="font-family:Arial,sans-serif;padding:32px"><h1>Preparing order slips...</h1><p>Please wait. The print dialog will open automatically.</p></body></html>`);
    printWindow.document.close();
    setBulkBusy(true);
    const response = await fetch("/api/admin/orders/bulk-print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, documentType: kind, markPrinted: kind !== "pick-list" })
    });
    const data = await response.json();
    setBulkBusy(false);
    if (!response.ok) {
      printWindowRef.current?.close();
      printWindowRef.current = null;
      return setToast(data.error || "Unable to prepare selected orders");
    }
    const prepared = data.orders as PrintableOrder[];
    if (!prepared.length) {
      printWindowRef.current?.close();
      printWindowRef.current = null;
      return setToast("No valid selected orders found. Refresh and select again.");
    }
    setSelectedIds(prepared.map((order) => order.id));
    printWindow.document.open();
    printWindow.document.write(buildBulkPrintHtml(prepared));
    printWindow.document.close();
    printWindowRef.current = null;
    const missingCount = Array.isArray(data.missing) ? data.missing.length : Number(data.missing || 0);
    setToast(`${prepared.length} order slip${prepared.length === 1 ? "" : "s"} ready for print${missingCount ? `. ${missingCount} stale selection ignored.` : ""}`);
    window.setTimeout(() => void load(), 700);
  }

  async function updateBulkStatus() {
    if (!bulkStatus) return setToast("Choose a status first");
    if (selectedIds.length === 0) return setToast("Select at least one order first");
    if (!window.confirm(`Update ${selectedIds.length} selected orders to ${bulkStatus}?`)) return;
    setBulkBusy(true);
    const response = await fetch("/api/admin/orders/bulk-status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, status: bulkStatus, note: `Bulk status update to ${bulkStatus}` })
    });
    const data = await response.json();
    setBulkBusy(false);
    const missingCount = Array.isArray(data.missing) ? data.missing.length : Number(data.missing || 0);
    setToast(response.ok ? `${data.count || selectedIds.length} orders updated${missingCount ? `. ${missingCount} stale selection ignored.` : ""}` : data.error || "Bulk status update failed");
    if (response.ok) {
      setSelectedIds([]);
      await load();
    }
  }

  function escapeHtml(value: unknown) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function orderQrUrl(order: PrintableOrder) {
    const qr = order.qrcodes?.find((item) => !item.usedAt)?.url || order.qrcodes?.[0]?.url || `/orders/${order.orderNumber}`;
    return `/api/barcode?data=${encodeURIComponent(qr)}`;
  }

  function printableAddress(order: PrintableOrder) {
    return [order.addressLine, order.area, order.nearestLandmark, order.city, order.province].filter(Boolean).join(", ");
  }

  function variationText(item: { variantTitle?: string | null; variantOptions?: Record<string, string> | null }) {
    const options = item.variantOptions && typeof item.variantOptions === "object"
      ? Object.entries(item.variantOptions).map(([key, value]) => `${key}: ${value}`).join(" / ")
      : "";
    return options || item.variantTitle || "-";
  }

  function buildBulkPrintHtml(printableOrders: PrintableOrder[]) {
    const pages = printableOrders.map((order) => {
      const discount = Number(order.discountTotal || 0) + Number(order.manualDiscount || 0);
      const delivery = Number(order.manualDeliveryCharge ?? order.deliveryCharge ?? 0);
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const rows = order.items.map((item) => `
        <tr>
          <td>${escapeHtml(item.name)}${variationText(item) !== "-" ? `<br><small>${escapeHtml(variationText(item))}</small>` : ""}</td>
          <td>${escapeHtml(item.sku)}</td>
          <td>${escapeHtml(variationText(item))}</td>
          <td>${escapeHtml(item.quantity)}</td>
          <td>${escapeHtml(money(Number(item.price || 0)))}</td>
          <td>${escapeHtml(money(Number(item.total || 0)))}</td>
        </tr>
      `).join("");

      return `
        <section class="page">
          <header class="header">
            <div class="brand-lockup">
              <img class="brand-logo" src="/brand/htc-logo.png" alt="Hammer Trading Company logo" />
              <div>
                <p class="brand">Hammer Trading Company</p>
                <h1>Order Slip</h1>
                <p class="muted">Professional tools, hardware, and delivery across Pakistan</p>
              </div>
            </div>
            <div class="qr-card">
              <img src="${orderQrUrl(order)}" alt="Delivery QR code" />
              <strong>Scan for delivery</strong>
            </div>
          </header>
          <div class="info-grid">
            <div><span>Order ID</span><strong>${escapeHtml(order.orderNumber)}</strong></div>
            <div><span>Invoice</span><strong>${escapeHtml(order.invoiceNumber)}</strong></div>
            <div><span>Order date</span><strong>${escapeHtml(order.createdAt ? new Date(order.createdAt).toLocaleString() : "-")}</strong></div>
            <div><span>Payment</span><strong>${escapeHtml(order.paymentMethod)} / ${escapeHtml(order.paymentStatus)}</strong></div>
          </div>
          <div class="status-strip">
            <span>Status: <strong>${escapeHtml(order.status.replaceAll("_", " "))}</strong></span>
            <span>Total items: <strong>${totalItems}</strong></span>
            <span>COD: <strong>${escapeHtml(order.paymentMethod === "COD" ? money(Number(order.codAmount || order.total || 0)) : "-")}</strong></span>
          </div>
          <div class="two-col">
            <div>
              <h2>Customer</h2>
              <p><strong>${escapeHtml(order.customerName)}</strong></p>
              <p>${escapeHtml(order.customerPhone)}</p>
              <p>${escapeHtml(printableAddress(order))}</p>
              <p><strong>City:</strong> ${escapeHtml(order.city)}</p>
            </div>
            <div>
              <h2>Delivery</h2>
              <p><strong>Courier:</strong> ${escapeHtml(order.courierName || "-")}</p>
              <p><strong>Tracking:</strong> ${escapeHtml(order.trackingNumber || "-")}</p>
              <p><strong>Admin note:</strong> ${escapeHtml(order.internalNotes || "-")}</p>
              <p><strong>Customer note:</strong> ${escapeHtml(order.customerNotes || "-")}</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Variation</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <div><span>Subtotal</span><strong>${escapeHtml(money(Number(order.subtotal || 0)))}</strong></div>
            <div><span>Discount</span><strong>${escapeHtml(money(discount))}</strong></div>
            <div><span>Delivery</span><strong>${escapeHtml(money(delivery))}</strong></div>
            <div class="grand"><span>Grand total</span><strong>${escapeHtml(money(Number(order.total || 0)))}</strong></div>
          </div>
          <footer>
            <div><strong>Packing check</strong><br />Verify quantity, SKU, and parcel seal before dispatch.</div>
            <div><strong>Return address</strong><br />Hammer Trading Company, Pakistan. Return parcels only after admin approval.</div>
          </footer>
        </section>
      `;
    }).join("");

    return `<!doctype html>
<html>
<head>
  <title>Hammer Trading Company order slips</title>
  <base href="${window.location.origin}">
  <style>
    * { box-sizing: border-box; }
    body { background: #fff; color: #111827; font-family: Arial, Helvetica, sans-serif; line-height: 1.35; margin: 0; }
    .page { break-after: page; min-height: 287mm; padding: 10mm; page-break-after: always; }
    .page:last-child { break-after: auto; page-break-after: auto; }
    .header { align-items: flex-start; border-bottom: 2px solid #111827; display: flex; gap: 18px; justify-content: space-between; padding-bottom: 12px; }
    .brand-lockup { align-items: center; display: flex; gap: 13px; min-width: 0; }
    .brand-logo { height: 58px; object-fit: contain; width: 58px; }
    .brand { font-size: 12px; font-weight: 800; letter-spacing: .12em; margin: 0; text-transform: uppercase; }
    h1 { font-size: 26px; margin: 6px 0; }
    h2 { font-size: 14px; margin: 0 0 8px; text-transform: uppercase; }
    p { margin: 4px 0; }
    .muted { color: #64748b; font-size: 12px; }
    .qr-card { align-items: center; border: 1px solid #cbd5e1; border-radius: 12px; display: grid; gap: 5px; justify-items: center; padding: 8px; text-align: center; }
    .qr-card img { height: 116px; width: 116px; }
    .info-grid { display: grid; gap: 10px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 14px 0; }
    .info-grid div, .two-col > div { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px; }
    .info-grid span { color: #64748b; display: block; font-size: 11px; text-transform: uppercase; }
    .status-strip { background: #111827; border-radius: 10px; color: #fff; display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); margin: 12px 0; padding: 10px 12px; }
    .two-col { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; margin: 14px 0; }
    table { border-collapse: collapse; margin-top: 14px; width: 100%; }
    th, td { border: 1px solid #cbd5e1; font-size: 12px; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
    .totals { margin-left: auto; margin-top: 14px; width: 310px; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { border-top: 2px solid #111827; font-size: 18px; font-weight: 900; margin-top: 4px; padding-top: 8px; }
    footer { border-top: 1px dashed #94a3b8; display: grid; gap: 12px; grid-template-columns: 1fr 1fr; margin-top: 22px; padding-top: 12px; }
    @page { margin: 8mm; size: A4; }
    @media print { body { margin: 0 !important; } }
  </style>
</head>
<body>${pages}
<script>
  const waitForImages = () => Promise.all(Array.from(document.images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      setTimeout(resolve, 1400);
    });
  }));
  window.addEventListener("load", () => {
    waitForImages().then(() => setTimeout(() => {
      window.focus();
      window.print();
    }, 160));
  });
  window.addEventListener("afterprint", () => setTimeout(() => window.close(), 250));
</script>
</body>
</html>`;
  }

  function print() {
    if (!selected) return;
    const qr = selected.qrcodes.find((item) => !item.usedAt)?.url || selected.qrcodes[0]?.url || "";
    const barcodeSrc = qr ? `/api/barcode?data=${encodeURIComponent(qr)}` : "";
    const title = "Order Slip";
    const html = `<!doctype html>
<html>
<head>
  <title>${escapeHtml(title)} ${escapeHtml(selected.invoiceNumber)}</title>
  <style>
    body { color: #111827; font-family: Arial, sans-serif; padding: 24px; }
    .top { align-items: flex-start; display: flex; justify-content: space-between; gap: 24px; }
    .brand-lockup { align-items: center; display: flex; gap: 13px; }
    .brand-logo { height: 62px; object-fit: contain; width: 62px; }
    .brand { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 6px 0 10px; }
    table { border-collapse: collapse; margin-top: 20px; width: 100%; }
    th, td { border: 1px solid #d1d5db; padding: 9px; text-align: left; }
    th { background: #f3f4f6; }
    .muted { color: #6b7280; font-size: 12px; }
    .qr { border: 1px solid #d1d5db; padding: 12px; text-align: center; width: 190px; }
    .qr img { height: 156px; width: 156px; }
    .totals { margin-left: auto; margin-top: 18px; width: 280px; }
    .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
    .total { border-top: 2px solid #111827; font-size: 18px; font-weight: 700; }
    @media print { button { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="top">
    <div class="brand-lockup">
      <img class="brand-logo" src="/brand/htc-logo.png" alt="Hammer Trading Company logo" />
      <div>
        <div class="brand">Hammer Trading Company</div>
        <h1>${escapeHtml(title)} ${escapeHtml(selected.invoiceNumber)}</h1>
        <p><b>Order:</b> ${escapeHtml(selected.orderNumber)}</p>
        <p><b>Status:</b> ${escapeHtml(selected.status)} &nbsp; <b>Payment:</b> ${escapeHtml(selected.paymentMethod)} / ${escapeHtml(selected.paymentStatus)}</p>
        <p><b>Customer:</b> ${escapeHtml(selected.customerName)} ${escapeHtml(selected.customerPhone)}</p>
        <p><b>Address:</b> ${escapeHtml(selected.addressLine)}, ${escapeHtml(selected.area || "")}, ${escapeHtml(selected.city)}, ${escapeHtml(selected.province)}</p>
        ${selected.trackingNumber ? `<p><b>Tracking:</b> ${escapeHtml(selected.trackingNumber)}</p>` : ""}
      </div>
    </div>
    ${barcodeSrc ? `<div class="qr"><img src="${barcodeSrc}" alt="Delivery barcode" /><div class="muted">Scan after delivery, then enter customer OTP.</div></div>` : ""}
  </div>
  <table>
    <tr><th>SKU</th><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
    ${selected.items.map((item) => `<tr><td>${escapeHtml(item.sku)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(variationText(item))}</td><td>${escapeHtml(item.quantity)}</td><td>${escapeHtml(money(Number(item.price)))}</td><td>${escapeHtml(money(Number(item.total)))}</td></tr>`).join("")}
  </table>
  <div class="totals">
    <div><span>Subtotal</span><b>${escapeHtml(money(Number(selected.subtotal)))}</b></div>
    <div><span>Discount</span><b>${escapeHtml(money(Number(selected.discountTotal) + Number(selected.manualDiscount || 0)))}</b></div>
    <div><span>Delivery</span><b>${escapeHtml(money(Number(selected.manualDeliveryCharge || selected.deliveryCharge)))}</b></div>
    <div class="total"><span>Total</span><span>${escapeHtml(money(Number(selected.total)))}</span></div>
  </div>
  ${selected.customerNotes ? `<p><b>Customer notes:</b> ${escapeHtml(selected.customerNotes)}</p>` : ""}
  <p class="muted">Packing check: verify quantities, seal parcel, and keep QR code visible for delivery confirmation scan.</p>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.setTimeout(() => win.print(), 400);
  }

  return (
    <div className="space-y-4">
      {source === "fallback" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          PostgreSQL is not connected yet. Orders are being read from the local fallback store; once the database is connected, the admin panel will read orders from PostgreSQL.
        </div>
      ) : null}
      <div className="admin-surface p-4">
        <div className="grid gap-2 lg:grid-cols-8">
          <div className="flex items-center rounded-lg border border-slate-200 px-3 py-2 lg:col-span-2 dark:border-slate-700"><Search size={17} /><input value={filters.q} onChange={(e) => { setFilters({ ...filters, q: e.target.value }); setPage(1); }} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Order, customer, phone, product, SKU" /></div>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950"><option value="">Any status</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          <input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950" placeholder="City" />
          <select value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950"><option value="">Any payment</option><option>COD</option><option>BANK_TRANSFER</option></select>
          <select value={filters.printStatus} onChange={(e) => setFilters({ ...filters, printStatus: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950"><option value="">Any print status</option><option value="printed">Printed</option><option value="not_printed">Not printed</option></select>
          <select value={filters.risk} onChange={(e) => setFilters({ ...filters, risk: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950"><option value="">Any risk/SLA</option><option value="high">High risk</option><option value="medium">Medium risk</option><option value="delayed">Delayed</option><option value="due_today">Due today</option></select>
          <select value={filters.courierId} onChange={(e) => setFilters({ ...filters, courierId: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950"><option value="">Any courier</option>{couriers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={filters.riderId} onChange={(e) => setFilters({ ...filters, riderId: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950"><option value="">Any rider</option>{riders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950" aria-label="From date" />
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950" aria-label="To date" />
          <Button variant="outline" onClick={() => void load()}><RefreshCw size={17} /> Refresh</Button>
        </div>
      </div>
      <div className="admin-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-sm font-bold text-slate-600 dark:text-slate-300">{selectedCount} selected</span>
          <Button variant="accent" disabled={bulkBusy || selectedCount === 0} onClick={() => void prepareBulkPrint("order-slips")}><Printer size={17} /> Print selected slips</Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950"><option value="">Bulk status update</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
          <Button variant="outline" disabled={bulkBusy || selectedCount === 0 || !bulkStatus} onClick={() => void updateBulkStatus()}><CheckSquare size={17} /> Apply status</Button>
          {bulkBusy ? <span className="text-sm font-semibold text-slate-500">Working...</span> : null}
        </div>
      </div>
      <div className="admin-surface overflow-x-auto">
        <table className="w-full min-w-[1220px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-100/90 text-slate-500 backdrop-blur dark:bg-slate-900/90"><tr><th className="p-3"><input type="checkbox" checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} aria-label="Select all visible orders" /></th><th>Order</th><th>Customer</th><th>Status</th><th>Risk</th><th>Printed</th><th>Payment</th><th>Courier/Rider</th><th>Tracking</th><th>Total</th><th>QR</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={12} className="p-8 text-center"><RefreshCw className="mx-auto animate-spin" /> Loading orders...</td></tr> : orders.length === 0 ? <tr><td colSpan={12} className="p-8 text-center text-slate-500">No orders found.</td></tr> : orders.map((order) => {
              const qrUsed = order.qrcodes?.some((item) => item.usedAt);
              const printed = isPrinted(order);
              const engine = order.engine;
              return <tr key={order.id} className="border-t border-slate-100 transition hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-900/70"><td className="p-3"><input type="checkbox" checked={selectedIds.includes(order.id)} onChange={(event) => toggleOrder(order.id, event.target.checked)} aria-label={`Select order ${order.orderNumber}`} /></td><td className="font-mono">{order.orderNumber}</td><td><strong>{order.customerName}</strong><p className="text-xs text-slate-500">{order.customerPhone} - {order.city}</p></td><td><StatusBadge status={order.status} /></td><td><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ring-1 ${riskClass(engine?.riskLevel)}`} title={engine?.riskFlags.map((flag) => `${flag.label}: ${flag.note}`).join("\n") || "Low risk"}><ShieldAlert size={13} /> {engine?.riskLevel || "low"}</span><p className="mt-1 max-w-[150px] truncate text-xs text-slate-500">{engine?.recommendedAction || slaLabel(engine?.slaStatus)}</p></td><td><span className={`rounded-full px-2 py-1 text-xs font-bold ${printed ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800"}`}>{printed ? "Printed" : "Not printed"}</span></td><td>{order.paymentMethod}<p className="text-xs">{order.paymentStatus}</p></td><td>{order.courierName || "Unassigned"}<p className="text-xs text-slate-500">{order.assignedRiderId ? "Rider assigned" : ""}</p></td><td>{order.trackingNumber || "-"}</td><td className="font-bold">{money(Number(order.total))}</td><td>{qrUsed ? "Confirmed" : "Pending"}</td><td><Button variant="outline" onClick={() => void open(order)}><Eye size={17} /> View</Button></td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><span className="text-sm text-slate-500">Page {page} of {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button></div>
      <AnimatePresence>
        {selected ? (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="admin-surface max-h-[92vh] w-full max-w-6xl overflow-y-auto p-5" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
              <div className="flex items-center justify-between"><div><h2 className="text-2xl font-black">{selected.orderNumber}</h2><p className="text-sm text-slate-500">{selected.invoiceNumber}</p></div><button onClick={() => setSelected(null)}><X /></button></div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="rounded-lg border p-2 dark:bg-slate-900" value={selected.customerName} onChange={(e) => setSelected({ ...selected, customerName: e.target.value })} />
                    <input className="rounded-lg border p-2 dark:bg-slate-900" value={selected.customerPhone} onChange={(e) => setSelected({ ...selected, customerPhone: e.target.value })} />
                    <input className="rounded-lg border p-2 dark:bg-slate-900" value={selected.city} onChange={(e) => setSelected({ ...selected, city: e.target.value })} />
                    <input className="rounded-lg border p-2 dark:bg-slate-900" value={selected.area || ""} onChange={(e) => setSelected({ ...selected, area: e.target.value })} />
                    <textarea className="rounded-lg border p-2 sm:col-span-2 dark:bg-slate-900" value={selected.addressLine} onChange={(e) => setSelected({ ...selected, addressLine: e.target.value })} />
                    <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Delivery charge" value={selected.deliveryCharge} onChange={(e) => setSelected({ ...selected, deliveryCharge: e.target.value })} />
                    <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Manual delivery" value={selected.manualDeliveryCharge || ""} onChange={(e) => setSelected({ ...selected, manualDeliveryCharge: e.target.value })} />
                    <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Manual discount" value={selected.manualDiscount || "0"} onChange={(e) => setSelected({ ...selected, manualDiscount: e.target.value })} />
                    <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="COD amount" value={selected.codAmount || ""} onChange={(e) => setSelected({ ...selected, codAmount: e.target.value })} />
                    <select className="rounded-lg border p-2 dark:bg-slate-900" value={selected.courierId || ""} onChange={(e) => setSelected({ ...selected, courierId: e.target.value })}><option value="">No courier</option>{couriers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                    <select className="rounded-lg border p-2 dark:bg-slate-900" value={selected.assignedRiderId || ""} onChange={(e) => setSelected({ ...selected, assignedRiderId: e.target.value })}><option value="">No rider</option>{riders.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                    <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Tracking number" value={selected.trackingNumber || ""} onChange={(e) => setSelected({ ...selected, trackingNumber: e.target.value })} />
                    <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Courier booking ID" value={selected.courierBookingId || ""} onChange={(e) => setSelected({ ...selected, courierBookingId: e.target.value })} />
                    <textarea className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Internal notes" value={selected.internalNotes || ""} onChange={(e) => setSelected({ ...selected, internalNotes: e.target.value })} />
                    <textarea className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Customer visible notes" value={selected.customerNotes || ""} onChange={(e) => setSelected({ ...selected, customerNotes: e.target.value })} />
                  </div>
                  <div className="rounded-xl border p-4 dark:border-slate-800"><h3 className="font-bold">Items</h3>{selected.items.map((item) => <div key={item.id} className="mt-2 flex justify-between gap-3 text-sm"><span>{item.quantity} x {item.name} <span className="font-mono text-xs">{item.sku}</span>{variationText(item) !== "-" ? <small className="block text-slate-500">{variationText(item)}</small> : null}</span><strong>{money(Number(item.total))}</strong></div>)}</div>
                  <div className="rounded-xl border p-4 dark:border-slate-800">
                    <h3 className="font-bold">Timeline</h3>
                    <div className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-900 sm:grid-cols-[160px_190px_1fr_auto]">
                      <select className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950" value={timelineForm.status || selected.status} onChange={(e) => setTimelineForm({ ...timelineForm, status: e.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
                      <input type="datetime-local" className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950" value={timelineForm.createdAt} onChange={(e) => setTimelineForm({ ...timelineForm, createdAt: e.target.value })} />
                      <input className="rounded-lg border px-3 py-2 text-sm dark:bg-slate-950" placeholder="Timeline note for this order" value={timelineForm.note} onChange={(e) => setTimelineForm({ ...timelineForm, note: e.target.value })} />
                      <Button variant="outline" onClick={() => void addTimeline()}><Plus size={17} /> Add</Button>
                    </div>
                    <ol className="mt-3 border-l border-slate-200 pl-4">{selected.timeline.map((event) => <li key={event.id} className="mb-3"><StatusBadge status={event.status} /><p className="mt-1 text-sm text-slate-500">{event.note || "Status updated"} - {new Date(event.createdAt).toLocaleString()}</p></li>)}</ol>
                  </div>
                </div>
                <aside className="space-y-3">
                  <StatusBadge status={selected.status} />
                  {selected.engine ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <strong>Order engine</strong>
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${riskClass(selected.engine.riskLevel)}`}>{selected.engine.riskLevel} risk</span>
                      </div>
                      <p className="mt-2 text-slate-600 dark:text-slate-300">{selected.engine.recommendedAction}</p>
                      {selected.engine.riskFlags.length ? <p className="mt-1 text-xs text-slate-500">{selected.engine.riskFlags.map((flag) => flag.label).join(" • ")}</p> : <p className="mt-1 text-xs text-slate-500">No major risk flags.</p>}
                    </div>
                  ) : null}
                  <select className="w-full rounded-lg border p-2 dark:bg-slate-900" value={selected.status} onChange={(e) => void setStatus(e.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
                  <Button className="w-full" variant="accent" onClick={() => void saveOrder()}>Save order</Button>
                  <Button className="w-full" variant="outline" onClick={() => void bookCourier()}><Truck size={17} /> Book courier mock</Button>
                  <Button className="w-full" variant="outline" onClick={() => print()}><Printer size={17} /> Print order slip</Button>
                  <a className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold" href={`https://wa.me/${selected.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(`Assalamualaikum, your Hammer order ${selected.orderNumber} status is ${selected.status}.`)}`} target="_blank"><MessageCircle size={17} /> WhatsApp customer</a>
                  <Button className="w-full border-red-200 text-red-700 hover:bg-red-50" variant="outline" onClick={() => void deleteOrder()}><Trash2 size={17} /> Delete order</Button>
                  <div className="rounded-xl border p-4 text-sm dark:border-slate-800"><h3 className="font-bold">QR confirmation</h3><p>Status: {selected.deliveredAt ? "Confirmed" : "Pending"}</p><p>OTP: {selected.deliveredAt ? "Verified" : "Pending"}</p><p>Time: {selected.deliveredAt ? new Date(selected.deliveredAt).toLocaleString() : "-"}</p><p>Method: {selected.confirmationMethod || "-"}</p><p>Courier: {selected.courierName || "-"}</p><p>GPS: {selected.confirmationGps || "-"}</p><p>Dispute: {selected.deliveryDisputeStatus || "-"}</p>{selected.confirmationPhotoUrl ? <a className="text-orange-600" href={selected.confirmationPhotoUrl} target="_blank">View proof image</a> : null}</div>
                </aside>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {toast ? <div className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">{toast}</div> : null}
    </div>
  );
}
