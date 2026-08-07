import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { deleteFallbackOrder, getFallbackOrder, updateFallbackOrder } from "@/lib/fallback-orders";
import { prisma } from "@/lib/prisma";
import { restoreOrderStock } from "@/lib/order-stock";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.ORDERS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, timeline: { orderBy: { createdAt: "asc" } }, qrcodes: true, courier: true, assignedRider: true, activityLogs: { orderBy: { createdAt: "desc" } } }
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  } catch {
    const order = await getFallbackOrder(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.ORDERS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const actorId = admin.id === "dev-admin" ? null : admin.id;
  try {
    const order = await prisma.order.update({
      where: { id },
      data: {
        internalNotes: body.internalNotes ?? undefined,
        customerNotes: body.customerNotes ?? undefined,
        customerName: body.customerName ?? undefined,
        customerPhone: body.customerPhone ?? undefined,
        customerEmail: body.customerEmail ?? undefined,
        province: body.province ?? undefined,
        city: body.city ?? undefined,
        area: body.area ?? undefined,
        addressLine: body.addressLine ?? undefined,
        nearestLandmark: body.nearestLandmark ?? undefined,
        manualDeliveryCharge: body.manualDeliveryCharge === undefined ? undefined : Number(body.manualDeliveryCharge),
        manualDiscount: body.manualDiscount === undefined ? undefined : Number(body.manualDiscount),
        deliveryCharge: body.deliveryCharge === undefined ? undefined : Number(body.deliveryCharge),
        discountTotal: body.discountTotal === undefined ? undefined : Number(body.discountTotal),
        total: body.total === undefined ? undefined : Number(body.total),
        codAmount: body.codAmount === undefined ? undefined : Number(body.codAmount),
        trackingNumber: body.trackingNumber ?? undefined,
        courierBookingId: body.courierBookingId ?? undefined,
        courierId: body.courierId === undefined ? undefined : body.courierId || null,
        assignedRiderId: body.assignedRiderId === undefined ? undefined : body.assignedRiderId || null
      }
    });
    await prisma.activityLog.create({ data: { actorId, orderId: id, action: "ORDER_UPDATED", metadata: body } });
    return NextResponse.json(order);
  } catch {
    const order = await updateFallbackOrder(id, {
      ...body,
      deliveryCharge: body.deliveryCharge === undefined ? undefined : Number(body.deliveryCharge),
      discountTotal: body.discountTotal === undefined ? undefined : Number(body.discountTotal),
      manualDeliveryCharge: body.manualDeliveryCharge === undefined ? undefined : Number(body.manualDeliveryCharge),
      manualDiscount: body.manualDiscount === undefined ? undefined : Number(body.manualDiscount),
      codAmount: body.codAmount === undefined ? undefined : Number(body.codAmount),
      total: body.total === undefined ? undefined : Number(body.total)
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json(order);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.ORDERS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const restoreStock = body.restoreStock !== false;
  const actorId = admin.id === "dev-admin" ? null : admin.id;

  try {
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true, variant: true } } } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const shouldRestoreStock = restoreStock && !["CANCELLED", "RETURNED", "REFUNDED", "DELIVERED"].includes(order.status);

    await prisma.$transaction(async (tx) => {
      if (shouldRestoreStock) {
        await restoreOrderStock(tx, order.items, { orderNumber: order.orderNumber, actorId }, `Order ${order.orderNumber} deleted`);
      }
      await tx.activityLog.create({
        data: {
          actorId,
          action: "ORDER_DELETED",
          entity: "Order",
          entityId: order.id,
          previousValue: { orderNumber: order.orderNumber, status: order.status, total: Number(order.total) },
          metadata: { restoreStock: shouldRestoreStock }
        }
      });
      await tx.review.updateMany({ where: { orderId: id }, data: { orderId: null, isVerifiedPurchase: false } });
      await tx.quoteRequest.updateMany({ where: { convertedOrderId: id }, data: { convertedOrderId: null } });
      await tx.order.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true, restoredStock: shouldRestoreStock });
  } catch (error) {
    console.error("Order delete failed", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Database order delete failed. Nothing was deleted; please retry." }, { status: 503 });
    }
    const deleted = await deleteFallbackOrder(id);
    if (!deleted) return NextResponse.json({ error: "Order delete failed. Check linked records or try again." }, { status: 500 });
    return NextResponse.json({ ok: true, source: "fallback" });
  }
}
