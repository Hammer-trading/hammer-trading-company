import { OrderStatus, type PrismaClient } from "@prisma/client";
import { enqueueNotification } from "@/lib/integrations";

export const orderStatuses: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "READY_FOR_DISPATCH",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
  "REFUNDED",
  "DELIVERY_FAILED",
  "DISPUTED"
];

export function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function createAdminNotification(prisma: PrismaClient, title: string, message: string, href?: string) {
  await prisma.adminNotification.create({ data: { title, message, href } }).catch(() => undefined);
}

export async function notifyOrderStatus(order: { orderNumber: string; customerPhone: string; customerEmail?: string | null }, status: OrderStatus) {
  const message = `Order ${order.orderNumber} status updated: ${statusLabel(status)}.`;
  await Promise.all([
    enqueueNotification("WHATSAPP", { to: order.customerPhone, subject: "Order status", message }),
    enqueueNotification("SMS", { to: order.customerPhone, subject: "Order status", message }),
    order.customerEmail ? enqueueNotification("EMAIL", { to: order.customerEmail, subject: "Order status", message }) : Promise.resolve()
  ]);
}

export function isRestorativeStatus(status: OrderStatus) {
  return ["CANCELLED", "RETURNED", "REFUNDED"].includes(status);
}

export function isTerminalBlockedForQr(status: OrderStatus) {
  return ["CANCELLED", "RETURNED", "REFUNDED", "DELIVERY_FAILED", "DISPUTED"].includes(status);
}
