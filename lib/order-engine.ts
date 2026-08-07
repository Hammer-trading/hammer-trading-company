import type { OrderStatus } from "@prisma/client";

type RiskInput = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  addressLine: string;
  paymentMethod: string;
  total: number | string;
  codAmount?: number | string | null;
  status: string;
  trackingNumber?: string | null;
  courierId?: string | null;
  assignedRiderId?: string | null;
  createdAt?: Date | string | null;
  estimatedDeliveryAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  deliveryFailedAt?: Date | string | null;
  activityLogs?: Array<{ action: string; createdAt?: Date | string | null }>;
  items?: Array<{ sku: string; quantity: number; name?: string }>;
  _count?: {
    customerPhoneMatches?: number;
    customerFailedDeliveries?: number;
    customerCancelledOrders?: number;
  };
};

export type OrderRiskFlag = {
  code: "HIGH_COD" | "INCOMPLETE_ADDRESS" | "REPEAT_CUSTOMER" | "PAST_FAILED_DELIVERY" | "PAST_CANCELLED" | "DELAYED" | "UNASSIGNED_DELIVERY" | "NOT_PRINTED";
  label: string;
  severity: "low" | "medium" | "high";
  note: string;
};

export type OrderEngineSummary = {
  riskScore: number;
  riskLevel: "low" | "medium" | "high";
  riskFlags: OrderRiskFlag[];
  recommendedAction: string;
  slaStatus: "on_track" | "due_today" | "delayed" | "complete";
  searchTokens: string;
};

const workflow: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "READY_FOR_DISPATCH",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED"
];

function toNumber(value: number | string | null | undefined) {
  return Number(value || 0);
}

function toDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPrinted(order: RiskInput) {
  return Boolean(order.activityLogs?.some((log) => log.action === "ORDER_BULK_PRINTED"));
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function nextWorkflowStatus(status: string): OrderStatus | null {
  const index = workflow.indexOf(status as OrderStatus);
  if (index < 0 || index >= workflow.length - 1) return null;
  return workflow[index + 1];
}

export function buildOrderEngineSummary(order: RiskInput): OrderEngineSummary {
  const flags: OrderRiskFlag[] = [];
  const cod = toNumber(order.codAmount || order.total);
  const estimatedDeliveryAt = toDate(order.estimatedDeliveryAt);
  const now = new Date();
  const address = `${order.addressLine || ""} ${order.city || ""}`.trim();
  const printed = isPrinted(order);
  const closed = ["DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"].includes(order.status);

  if (order.paymentMethod === "COD" && cod >= 50000) {
    flags.push({ code: "HIGH_COD", label: "High COD", severity: "high", note: "Large cash collection needs confirmation before dispatch." });
  }

  if (address.length < 18 || !order.city) {
    flags.push({ code: "INCOMPLETE_ADDRESS", label: "Address check", severity: "high", note: "Delivery address looks short or incomplete." });
  }

  if ((order._count?.customerPhoneMatches || 0) >= 3) {
    flags.push({ code: "REPEAT_CUSTOMER", label: "Repeat customer", severity: "low", note: "Customer has multiple orders on this phone number." });
  }

  if ((order._count?.customerFailedDeliveries || 0) > 0) {
    flags.push({ code: "PAST_FAILED_DELIVERY", label: "Past failed delivery", severity: "high", note: "This phone number has previous delivery failure history." });
  }

  if ((order._count?.customerCancelledOrders || 0) > 0) {
    flags.push({ code: "PAST_CANCELLED", label: "Past cancellation", severity: "medium", note: "This phone number has previous cancelled orders." });
  }

  if (!closed && estimatedDeliveryAt && estimatedDeliveryAt < now) {
    flags.push({ code: "DELAYED", label: "Delayed", severity: "high", note: "Estimated delivery date has passed." });
  }

  if (!closed && ["PACKED", "READY_FOR_DISPATCH", "SHIPPED", "OUT_FOR_DELIVERY"].includes(order.status) && !order.assignedRiderId && !order.courierId) {
    flags.push({ code: "UNASSIGNED_DELIVERY", label: "Unassigned", severity: "medium", note: "Order is moving but courier/rider is not assigned." });
  }

  if (!closed && !printed) {
    flags.push({ code: "NOT_PRINTED", label: "Not printed", severity: "low", note: "Packing slip has not been printed yet." });
  }

  const riskScore = flags.reduce((score, flag) => score + (flag.severity === "high" ? 3 : flag.severity === "medium" ? 2 : 1), 0);
  const riskLevel = riskScore >= 5 ? "high" : riskScore >= 3 ? "medium" : "low";
  const nextStatus = nextWorkflowStatus(order.status);
  const hasHighRisk = flags.some((flag) => flag.severity === "high");
  const recommendedAction = closed
    ? "No action needed"
    : hasHighRisk
      ? "Review before dispatch"
      : !printed
        ? "Print and pack"
        : nextStatus
          ? `Move to ${statusLabel(nextStatus)}`
          : "Review order";
  const slaStatus = closed
    ? "complete"
    : estimatedDeliveryAt && estimatedDeliveryAt < now
      ? "delayed"
      : estimatedDeliveryAt && estimatedDeliveryAt.toDateString() === now.toDateString()
        ? "due_today"
        : "on_track";
  const searchTokens = [
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.city,
    order.trackingNumber,
    order.items?.map((item) => `${item.sku} ${item.name || ""}`).join(" ")
  ].filter(Boolean).join(" ").toLowerCase();

  return { riskScore, riskLevel, riskFlags: flags, recommendedAction, slaStatus, searchTokens };
}
