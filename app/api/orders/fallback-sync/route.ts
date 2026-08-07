import { NextResponse } from "next/server";
import { saveFallbackOrder, type FallbackOrder } from "@/lib/fallback-orders";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_FALLBACK_ORDER_SYNC !== "true") {
    return NextResponse.json({ error: "Fallback order sync is disabled" }, { status: 403 });
  }
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`fallback-order-sync:${getClientIp(request)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many sync requests" }, { status: 429 });
  }
  try {
    const body = await request.json();
    if (!body?.orderNumber || !body?.customerName || !Array.isArray(body?.timeline) || !Array.isArray(body?.items)) {
      return NextResponse.json({ error: "Invalid fallback order" }, { status: 400 });
    }
    const now = new Date().toISOString();
    const order: FallbackOrder = {
      id: String(body.id || `fallback-${body.orderNumber}`),
      orderNumber: String(body.orderNumber),
      invoiceNumber: String(body.invoiceNumber || `INV-${body.orderNumber}`),
      status: String(body.status || "PENDING"),
      paymentMethod: String(body.paymentMethod || "COD"),
      paymentStatus: String(body.paymentStatus || "PENDING"),
      subtotal: Number(body.subtotal || body.summary?.subtotal || 0),
      discountTotal: Number(body.discountTotal || body.summary?.discount || 0),
      manualDiscount: Number(body.manualDiscount || 0),
      deliveryCharge: Number(body.deliveryCharge || body.summary?.deliveryCharge || 0),
      manualDeliveryCharge: body.manualDeliveryCharge === undefined ? null : Number(body.manualDeliveryCharge),
      codAmount: body.codAmount === undefined ? Number(body.total || 0) : Number(body.codAmount),
      total: Number(body.total || 0),
      customerName: String(body.customerName),
      customerPhone: String(body.customerPhone || ""),
      customerEmail: body.customerEmail || null,
      province: String(body.province || ""),
      city: String(body.city || ""),
      area: body.area || null,
      addressLine: String(body.addressLine || ""),
      nearestLandmark: body.nearestLandmark || null,
      courierId: body.courierId || null,
      assignedRiderId: body.assignedRiderId || null,
      courierName: body.courierName || null,
      trackingNumber: body.trackingNumber || null,
      courierBookingId: body.courierBookingId || null,
      internalNotes: body.internalNotes || "Synced from browser fallback storage.",
      customerNotes: body.customerNotes || null,
      deliveredAt: body.deliveredAt || null,
      confirmationMethod: body.confirmationMethod || null,
      confirmationGps: body.confirmationGps || null,
      confirmationPhotoUrl: body.confirmationPhotoUrl || null,
      deliveryOtp: body.deliveryOtp || null,
      deliveryDisputeStatus: body.deliveryDisputeStatus || null,
      createdAt: body.createdAt || now,
      updatedAt: body.updatedAt || now,
      qrcodes: Array.isArray(body.qrcodes) ? body.qrcodes : [],
      timeline: body.timeline,
      items: body.items,
      summary: body.summary
    };
    await saveFallbackOrder(order);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Fallback sync failed" }, { status: 400 });
  }
}
