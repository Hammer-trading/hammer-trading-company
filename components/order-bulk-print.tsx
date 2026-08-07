"use client";

import { forwardRef } from "react";
import Image from "next/image";
import { money } from "@/lib/utils";

export type PrintableOrder = {
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
  subtotal: string | number;
  discountTotal: string | number;
  manualDiscount: string | number;
  deliveryCharge: string | number;
  manualDeliveryCharge?: string | number | null;
  codAmount?: string | number | null;
  total: string | number;
  courierName?: string | null;
  trackingNumber?: string | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
  createdAt?: string;
  qrcodes?: Array<{ id: string; url: string; usedAt?: string | null; expiresAt?: string | null }>;
  items: Array<{
    id: string;
    variantId?: string | null;
    name: string;
    sku: string;
    variantTitle?: string | null;
    variantOptions?: Record<string, string> | null;
    quantity: number;
    price: string | number;
    total: string | number;
    product?: {
      inventory?: {
        id: string;
      } | null;
    } | null;
  }>;
};

export type PrintDocumentKind = "order-slips" | "invoices" | "packing-slips" | "delivery-labels" | "pick-list";

const returnAddress = "Hammer Trading Company, Pakistan. Return parcels only after admin approval.";

function valueNumber(value: string | number | null | undefined) {
  return Number(value || 0);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function fullAddress(order: PrintableOrder) {
  return [order.addressLine, order.area, order.nearestLandmark, order.city, order.province].filter(Boolean).join(", ");
}

function qrData(order: PrintableOrder) {
  return order.qrcodes?.find((item) => !item.usedAt)?.url || order.qrcodes?.[0]?.url || `/orders/${order.orderNumber}`;
}

function shelfLocation() {
  return "-";
}

function variationText(item: { variantTitle?: string | null; variantOptions?: Record<string, string> | null }) {
  const options = item.variantOptions && typeof item.variantOptions === "object"
    ? Object.entries(item.variantOptions).map(([key, value]) => `${key}: ${value}`).join(" / ")
    : "";
  return options || item.variantTitle || "-";
}

export function buildPickList(orders: PrintableOrder[]) {
  const rows = new Map<string, { name: string; sku: string; variation: string; quantity: number; shelf: string }>();

  for (const order of orders) {
    for (const item of order.items) {
      const variation = variationText(item);
      const key = `${item.sku}::${variation}`;
      const current = rows.get(key) || { name: item.name, sku: item.sku, variation, quantity: 0, shelf: shelfLocation() };
      current.quantity += item.quantity;
      rows.set(key, current);
    }
  }

  return Array.from(rows.values()).sort((a, b) => a.sku.localeCompare(b.sku));
}

function Totals({ order }: { order: PrintableOrder }) {
  const discount = valueNumber(order.discountTotal) + valueNumber(order.manualDiscount);
  const delivery = valueNumber(order.manualDeliveryCharge ?? order.deliveryCharge);
  return (
    <div className="print-totals">
      <div><span>Subtotal</span><strong>{money(valueNumber(order.subtotal))}</strong></div>
      <div><span>Discount</span><strong>{money(discount)}</strong></div>
      <div><span>Delivery charges</span><strong>{money(delivery)}</strong></div>
      <div className="grand"><span>Grand total</span><strong>{money(valueNumber(order.total))}</strong></div>
      {order.paymentMethod === "COD" ? <div className="cod"><span>COD amount</span><strong>{money(valueNumber(order.codAmount || order.total))}</strong></div> : null}
    </div>
  );
}

function ItemsTable({ order, packing = false }: { order: PrintableOrder; packing?: boolean }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>SKU</th>
          <th>Variation</th>
          <th>Qty</th>
          {packing ? <th>Shelf/Bin</th> : <><th>Unit price</th><th>Total</th></>}
        </tr>
      </thead>
      <tbody>
        {order.items.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.sku}</td>
            <td>{variationText(item)}</td>
            <td>{item.quantity}</td>
            {packing ? <td>{shelfLocation()}</td> : <><td>{money(valueNumber(item.price))}</td><td>{money(valueNumber(item.total))}</td></>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OrderSlip({ order, title }: { order: PrintableOrder; title: string }) {
  const qr = `/api/barcode?data=${encodeURIComponent(qrData(order))}`;
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <section className="print-page premium-slip">
      <header className="print-header">
        <div className="brand-lockup">
          <Image className="brand-logo" src="/brand/htc-logo.png" alt="Hammer Trading Company logo" width={58} height={58} unoptimized />
          <div>
            <p className="brand">Hammer Trading Company</p>
            <h1>{title}</h1>
            <p className="muted">Professional tools, hardware, and delivery across Pakistan</p>
          </div>
        </div>
        <div className="qr-card">
          <Image className="qr" src={qr} alt={`QR code for ${order.orderNumber}`} width={116} height={116} unoptimized />
          <strong>Scan for delivery</strong>
        </div>
      </header>
      <div className="info-grid">
        <div><span>Order ID</span><strong>{order.orderNumber}</strong></div>
        <div><span>Invoice</span><strong>{order.invoiceNumber}</strong></div>
        <div><span>Order date</span><strong>{formatDate(order.createdAt)}</strong></div>
        <div><span>Payment</span><strong>{order.paymentMethod} / {order.paymentStatus}</strong></div>
      </div>
      <div className="status-strip">
        <span>Status: <strong>{order.status.replaceAll("_", " ")}</strong></span>
        <span>Total items: <strong>{totalItems}</strong></span>
        <span>COD: <strong>{order.paymentMethod === "COD" ? money(valueNumber(order.codAmount || order.total)) : "-"}</strong></span>
      </div>
      <div className="two-col">
        <div>
          <h2>Customer</h2>
          <p><strong>{order.customerName}</strong></p>
          <p>{order.customerPhone}</p>
          <p>{fullAddress(order)}</p>
          <p><strong>City:</strong> {order.city}</p>
        </div>
        <div>
          <h2>Delivery</h2>
          <p><strong>Courier:</strong> {order.courierName || "-"}</p>
          <p><strong>Tracking:</strong> {order.trackingNumber || "-"}</p>
          <p><strong>Admin note:</strong> {order.internalNotes || "-"}</p>
          <p><strong>Customer note:</strong> {order.customerNotes || "-"}</p>
        </div>
      </div>
      <ItemsTable order={order} />
      <Totals order={order} />
      <div className="slip-footer">
        <div><strong>Packing check</strong><br />Verify quantity, SKU, and parcel seal before dispatch.</div>
        <div><strong>Return address</strong><br />{returnAddress}</div>
      </div>
    </section>
  );
}

function PackingSlip({ order }: { order: PrintableOrder }) {
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <section className="print-page">
      <header className="print-header">
        <div className="brand-lockup">
          <Image className="brand-logo" src="/brand/htc-logo.png" alt="Hammer Trading Company logo" width={58} height={58} unoptimized />
          <div>
            <p className="brand">Hammer Trading Company</p>
            <h1>Packing Slip</h1>
          </div>
        </div>
        <div className="stamp">{totalItems} items</div>
      </header>
      <div className="info-grid">
        <div><span>Order ID</span><strong>{order.orderNumber}</strong></div>
        <div><span>Customer</span><strong>{order.customerName}</strong></div>
        <div><span>Phone</span><strong>{order.customerPhone}</strong></div>
        <div><span>Total items</span><strong>{totalItems}</strong></div>
      </div>
      <ItemsTable order={order} packing />
    </section>
  );
}

function DeliveryLabel({ order }: { order: PrintableOrder }) {
  const qr = `/api/barcode?data=${encodeURIComponent(qrData(order))}`;
  return (
    <section className="print-page label-page">
      <header className="print-header">
        <div className="brand-lockup">
          <Image className="brand-logo" src="/brand/htc-logo.png" alt="Hammer Trading Company logo" width={58} height={58} unoptimized />
          <div>
            <p className="brand">Hammer Trading Company</p>
            <h1>Delivery Label</h1>
          </div>
        </div>
        <Image className="qr" src={qr} alt={`QR code for ${order.orderNumber}`} width={116} height={116} unoptimized />
      </header>
      <div className="label-box">
        <p><strong>Order ID:</strong> {order.orderNumber}</p>
        <p><strong>Customer:</strong> {order.customerName}</p>
        <p><strong>Phone:</strong> {order.customerPhone}</p>
        <p><strong>Address:</strong> {fullAddress(order)}</p>
        <p><strong>City:</strong> {order.city}</p>
        <p><strong>COD amount:</strong> {order.paymentMethod === "COD" ? money(valueNumber(order.codAmount || order.total)) : "-"}</p>
        <p><strong>Tracking:</strong> {order.trackingNumber || "-"}</p>
        <p><strong>Courier:</strong> {order.courierName || "-"}</p>
        <p><strong>Delivery note:</strong> {order.customerNotes || "-"}</p>
      </div>
      <p className="return-address"><strong>Return address:</strong> {returnAddress}</p>
    </section>
  );
}

function PickList({ orders }: { orders: PrintableOrder[] }) {
  const rows = buildPickList(orders);
  return (
    <section className="print-page">
      <header className="print-header">
        <div className="brand-lockup">
          <Image className="brand-logo" src="/brand/htc-logo.png" alt="Hammer Trading Company logo" width={58} height={58} unoptimized />
          <div>
            <p className="brand">Hammer Trading Company</p>
            <h1>Combined Pick List</h1>
            <p className="muted">{orders.length} selected orders</p>
          </div>
        </div>
      </header>
      <table>
        <thead>
          <tr><th>Product</th><th>SKU</th><th>Variation</th><th>Total quantity</th><th>Shelf/Bin</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.sku}-${row.variation}`}>
              <td>{row.name}</td>
              <td>{row.sku}</td>
              <td>{row.variation}</td>
              <td>{row.quantity}</td>
              <td>{row.shelf}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export const OrderBulkPrintSurface = forwardRef<HTMLDivElement, { orders: PrintableOrder[]; kind: PrintDocumentKind }>(
  function OrderBulkPrintSurface({ orders, kind }, ref) {
    return (
      <div ref={ref} className="bulk-print-root">
        <style>{`
          .bulk-print-root { color: #111827; font-family: Arial, Helvetica, sans-serif; line-height: 1.35; }
          .print-page { background: #fff; min-height: 287mm; padding: 10mm; page-break-after: always; break-after: page; }
          .print-page:last-child { page-break-after: auto; break-after: auto; }
          .print-header { align-items: flex-start; border-bottom: 2px solid #111827; display: flex; justify-content: space-between; gap: 18px; padding-bottom: 12px; }
          .premium-slip { border-top: 8px solid #991b1b; }
          .brand-lockup { align-items: center; display: flex; gap: 13px; min-width: 0; }
          .brand-logo { height: 58px; object-fit: contain; width: 58px; }
          .brand { font-size: 12px; font-weight: 800; letter-spacing: .12em; margin: 0; text-transform: uppercase; }
          h1 { font-size: 26px; margin: 6px 0; }
          h2 { font-size: 14px; margin: 0 0 8px; text-transform: uppercase; }
          p { margin: 4px 0; }
          .muted { color: #64748b; font-size: 12px; }
          .stamp { border: 2px solid #111827; border-radius: 8px; font-size: 13px; font-weight: 900; padding: 8px 12px; text-transform: uppercase; }
          .qr-card { align-items: center; border: 1px solid #cbd5e1; border-radius: 12px; display: grid; gap: 5px; justify-items: center; padding: 8px; text-align: center; }
          .info-grid { display: grid; gap: 10px; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 14px 0; }
          .info-grid div, .label-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 9px; }
          .info-grid span { color: #64748b; display: block; font-size: 11px; text-transform: uppercase; }
          .two-col { display: grid; gap: 12px; grid-template-columns: 1fr 1fr; margin: 14px 0; }
          .two-col > div { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
          .status-strip { background: #111827; border-radius: 10px; color: #fff; display: grid; gap: 8px; grid-template-columns: repeat(3, 1fr); margin: 12px 0; padding: 10px 12px; }
          table { border-collapse: collapse; margin-top: 14px; width: 100%; }
          th, td { border: 1px solid #cbd5e1; font-size: 12px; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f1f5f9; font-size: 11px; text-transform: uppercase; }
          .print-totals { margin-left: auto; margin-top: 14px; width: 310px; }
          .print-totals div { display: flex; justify-content: space-between; padding: 4px 0; }
          .print-totals .grand { border-top: 2px solid #111827; font-size: 18px; font-weight: 900; margin-top: 4px; padding-top: 8px; }
          .print-totals .cod { color: #b91c1c; font-weight: 900; }
          .slip-footer { border-top: 1px dashed #94a3b8; display: grid; gap: 12px; grid-template-columns: 1fr 1fr; margin-top: 22px; padding-top: 12px; }
          .label-page { min-height: 140mm; }
          .label-box { font-size: 18px; margin-top: 18px; }
          .qr { height: 116px; width: 116px; }
          .return-address { border-top: 1px dashed #94a3b8; margin-top: 20px; padding-top: 10px; }
          @page { margin: 8mm; size: A4; }
          @media print {
            body { margin: 0 !important; }
            .bulk-print-root { display: block !important; }
          }
        `}</style>
        {kind === "pick-list" ? <PickList orders={orders} /> : null}
        {kind === "order-slips" ? orders.map((order) => <OrderSlip key={order.id} order={order} title="Order Slip" />) : null}
        {kind === "invoices" ? orders.map((order) => <OrderSlip key={order.id} order={order} title="Invoice" />) : null}
        {kind === "packing-slips" ? orders.map((order) => <PackingSlip key={order.id} order={order} />) : null}
        {kind === "delivery-labels" ? orders.map((order) => <DeliveryLabel key={order.id} order={order} />) : null}
      </div>
    );
  }
);

export async function downloadOrderSlipsPdf(orders: PrintableOrder[]) {
  const renderer = await import("@react-pdf/renderer");
  const React = await import("react");
  const { Document, Page, Text, View, StyleSheet, pdf } = renderer;

  const styles = StyleSheet.create({
    page: { padding: 28, fontSize: 10, color: "#111827", fontFamily: "Helvetica" },
    header: { borderBottomWidth: 2, borderBottomColor: "#111827", marginBottom: 12, paddingBottom: 8 },
    brand: { fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase" },
    title: { fontSize: 22, fontWeight: 700, marginTop: 5 },
    grid: { display: "flex", flexDirection: "row", gap: 8, marginBottom: 10 },
    box: { borderWidth: 1, borderColor: "#cbd5e1", padding: 7, flexGrow: 1, flexBasis: 0 },
    label: { color: "#64748b", fontSize: 8, textTransform: "uppercase" },
    table: { borderWidth: 1, borderColor: "#cbd5e1", marginTop: 8 },
    row: { display: "flex", flexDirection: "row" },
    th: { backgroundColor: "#f1f5f9", fontWeight: 700 },
    cell: { borderRightWidth: 1, borderRightColor: "#cbd5e1", padding: 6, flexGrow: 1, flexBasis: 0 },
    total: { alignSelf: "flex-end", marginTop: 12, width: 190 }
  });

  const doc = (
    <Document>
      {orders.map((order) => (
        <Page key={order.id} size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.brand}>Hammer Trading Company</Text>
            <Text style={styles.title}>Order Slip</Text>
            <Text>Order {order.orderNumber} | {formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.grid}>
            <View style={styles.box}><Text style={styles.label}>Customer</Text><Text>{order.customerName}</Text><Text>{order.customerPhone}</Text></View>
            <View style={styles.box}><Text style={styles.label}>Address</Text><Text>{fullAddress(order)}</Text></View>
            <View style={styles.box}><Text style={styles.label}>Payment</Text><Text>{order.paymentMethod} / {order.paymentStatus}</Text><Text>COD: {order.paymentMethod === "COD" ? money(valueNumber(order.codAmount || order.total)) : "-"}</Text></View>
          </View>
          <View style={styles.table}>
            <View style={[styles.row, styles.th]}><Text style={styles.cell}>Product</Text><Text style={styles.cell}>SKU</Text><Text style={styles.cell}>Qty</Text><Text style={styles.cell}>Total</Text></View>
            {order.items.map((item) => (
              <View key={item.id} style={styles.row}><Text style={styles.cell}>{item.name}{variationText(item) !== "-" ? ` (${variationText(item)})` : ""}</Text><Text style={styles.cell}>{item.sku}</Text><Text style={styles.cell}>{item.quantity}</Text><Text style={styles.cell}>{money(valueNumber(item.total))}</Text></View>
            ))}
          </View>
          <View style={styles.total}>
            <Text>Subtotal: {money(valueNumber(order.subtotal))}</Text>
            <Text>Discount: {money(valueNumber(order.discountTotal) + valueNumber(order.manualDiscount))}</Text>
            <Text>Delivery: {money(valueNumber(order.manualDeliveryCharge ?? order.deliveryCharge))}</Text>
            <Text>Grand total: {money(valueNumber(order.total))}</Text>
          </View>
        </Page>
      ))}
    </Document>
  );

  const blob = await pdf(React.createElement(() => doc)).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hammer-order-slips-${new Date().toISOString().slice(0, 10)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
