import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { OrderStatus } from "@prisma/client";
import { assertLocalFallbackEnabled } from "@/lib/db-fallback";

export type FallbackOrder = {
  id: string;
  orderNumber: string;
  invoiceNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  discountTotal: number;
  manualDiscount: number;
  deliveryCharge: number;
  manualDeliveryCharge?: number | null;
  codAmount?: number | null;
  total: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  province: string;
  city: string;
  area?: string | null;
  addressLine: string;
  nearestLandmark?: string | null;
  courierId?: string | null;
  assignedRiderId?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  courierBookingId?: string | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
  deliveredAt?: string | null;
  confirmationMethod?: string | null;
  confirmationGps?: string | null;
  confirmationPhotoUrl?: string | null;
  deliveryOtp?: string | null;
  deliveryDisputeStatus?: string | null;
  createdAt: string;
  updatedAt: string;
  qrcodes: Array<{ id: string; url: string; usedAt?: string | null; expiresAt?: string | null }>;
  timeline: Array<{ id: string; status: string; note?: string | null; createdAt: string }>;
  items: Array<{ id: string; productId: string; variantId?: string | null; name: string; sku: string; variantTitle?: string | null; variantOptions?: Record<string, string> | null; quantity: number; price: number; total: number }>;
  summary?: {
    subtotal: number;
    discount: number;
    deliveryCharge: number;
    estimatedDaysMin?: number;
    estimatedDaysMax?: number;
  };
};

const storePath = path.join(process.cwd(), "data", "fallback-orders.json");

async function ensureStore() {
  await mkdir(path.dirname(storePath), { recursive: true });
}

export async function readFallbackOrders() {
  assertLocalFallbackEnabled();
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FallbackOrder[]) : [];
  } catch {
    return [];
  }
}

async function writeFallbackOrders(orders: FallbackOrder[]) {
  await ensureStore();
  await writeFile(storePath, JSON.stringify(orders, null, 2), "utf8");
}

export async function saveFallbackOrder(order: FallbackOrder) {
  const orders = await readFallbackOrders();
  const next = [order, ...orders.filter((item) => item.id !== order.id && item.orderNumber !== order.orderNumber)];
  await writeFallbackOrders(next);
  return order;
}

export async function getFallbackOrder(idOrOrderNumber: string) {
  const orders = await readFallbackOrders();
  return orders.find((order) => order.id === idOrOrderNumber || order.orderNumber === idOrOrderNumber) || null;
}

export async function updateFallbackOrder(idOrOrderNumber: string, patch: Partial<FallbackOrder>) {
  const orders = await readFallbackOrders();
  const index = orders.findIndex((order) => order.id === idOrOrderNumber || order.orderNumber === idOrOrderNumber);
  if (index === -1) return null;
  orders[index] = { ...orders[index], ...patch, updatedAt: new Date().toISOString() };
  await writeFallbackOrders(orders);
  return orders[index];
}

export async function deleteFallbackOrder(idOrOrderNumber: string) {
  const orders = await readFallbackOrders();
  const order = orders.find((item) => item.id === idOrOrderNumber || item.orderNumber === idOrOrderNumber);
  if (!order) return null;
  await writeFallbackOrders(orders.filter((item) => item.id !== order.id && item.orderNumber !== order.orderNumber));
  return order;
}

export function filterFallbackOrders(
  orders: FallbackOrder[],
  filters: {
    q?: string;
    status?: string;
    city?: string;
    paymentMethod?: string;
    from?: string | null;
    to?: string | null;
    printStatus?: string;
  }
) {
  const q = filters.q?.trim().toLowerCase();
  const from = filters.from ? new Date(filters.from).getTime() : null;
  const to = filters.to ? new Date(filters.to).getTime() : null;
  return orders.filter((order) => {
    const created = new Date(order.createdAt).getTime();
    const matchesQ =
      !q ||
      [order.orderNumber, order.customerName, order.customerPhone, order.trackingNumber || ""].some((value) => value.toLowerCase().includes(q)) ||
      order.items.some((item) => [item.name, item.sku].some((value) => value.toLowerCase().includes(q)));
    const printed = order.timeline.some((event) => event.note?.toLowerCase().includes("bulk order slips printed"));
    const matchesStatus = !filters.status || order.status === filters.status;
    const matchesCity = !filters.city || order.city.toLowerCase().includes(filters.city.toLowerCase());
    const matchesPayment = !filters.paymentMethod || order.paymentMethod === filters.paymentMethod;
    const matchesFrom = from === null || created >= from;
    const matchesTo = to === null || created <= to;
    const matchesPrintStatus = !filters.printStatus || (filters.printStatus === "printed" ? printed : !printed);
    return matchesQ && matchesStatus && matchesCity && matchesPayment && matchesFrom && matchesTo && matchesPrintStatus;
  });
}

export const fallbackOrderStatuses = Object.values(OrderStatus);
