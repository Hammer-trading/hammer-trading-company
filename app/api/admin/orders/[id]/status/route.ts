import { OrderStatus, Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { updateFallbackProductStock } from "@/lib/fallback-products";
import { getFallbackOrder, updateFallbackOrder } from "@/lib/fallback-orders";
import { createAdminNotification, isRestorativeStatus, notifyOrderStatus } from "@/lib/order-automation";
import { prisma } from "@/lib/prisma";
import { deductOrderStock, restoreOrderStock } from "@/lib/order-stock";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.ORDERS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status, note } = await request.json();
  const actorId = admin.id === "dev-admin" ? null : admin.id;
  if (!Object.values(OrderStatus).includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  try {
    const order = await prisma.order.findUnique({ where: { id }, include: { items: { include: { product: true, variant: true } } } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const restore = isRestorativeStatus(status) && !isRestorativeStatus(order.status);
    const rededuct = !isRestorativeStatus(status) && isRestorativeStatus(order.status);
    await prisma.$transaction(async (tx) => {
      if (restore) await restoreOrderStock(tx, order.items, { orderId: order.id, orderNumber: order.orderNumber, actorId }, `Order ${order.orderNumber} ${status.toLowerCase()}`);
      if (rededuct) await deductOrderStock(tx, order.items, { orderId: order.id, orderNumber: order.orderNumber, actorId }, `Order ${order.orderNumber} reopened as ${status.toLowerCase()}`);
      await tx.order.update({
        where: { id },
        data: {
          status,
          deliveredAt: status === "DELIVERED" ? new Date() : undefined,
          deliveryFailedAt: status === "DELIVERY_FAILED" ? new Date() : undefined,
          returnApprovedAt: status === "RETURNED" ? new Date() : undefined,
          paymentStatus: status === "REFUNDED"
            ? "REFUNDED"
            : status === "DELIVERED" && order.paymentMethod === "COD"
              ? "PAID"
              : undefined
        }
      });
      await tx.orderTimeline.create({ data: { orderId: id, status, note: note || `Status changed to ${status}`, actorId } });
      await tx.activityLog.create({ data: { actorId, orderId: id, action: "ORDER_STATUS_UPDATED", metadata: { from: order.status, to: status, restoredStock: restore, deductedStock: rededuct } } });
    });
    await createAdminNotification(prisma, "Order status updated", `${order.orderNumber}: ${order.status} -> ${status}`, `/admin/orders?order=${order.orderNumber}`);
    await notifyOrderStatus(order, status).catch((notificationError) => {
      console.error("Order status notification failed", notificationError);
    });
    return NextResponse.json({ ok: true, restoredStock: restore, deductedStock: rededuct });
  } catch (error) {
    console.error("Order status update failed", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Database order update failed. Nothing was changed; please retry." }, { status: 503 });
    }
    const order = await getFallbackOrder(id);
    if (!order) return NextResponse.json({ error: "Order status update failed. Please refresh and try again." }, { status: 500 });
    const restore = isRestorativeStatus(status) && !isRestorativeStatus(order.status as OrderStatus);
    if (restore) {
      for (const item of order.items) {
        await updateFallbackProductStock(item.productId, item.quantity);
      }
    }
    const rededuct = !isRestorativeStatus(status) && isRestorativeStatus(order.status as OrderStatus);
    if (rededuct) {
      for (const item of order.items) await updateFallbackProductStock(item.productId, -item.quantity);
    }
    const updated = await updateFallbackOrder(id, {
      status,
      deliveredAt: status === "DELIVERED" ? new Date().toISOString() : order.deliveredAt,
      paymentStatus: status === "REFUNDED"
        ? "REFUNDED"
        : status === "DELIVERED" && order.paymentMethod === "COD"
          ? "PAID"
          : order.paymentStatus,
      timeline: [
        ...order.timeline,
        {
          id: `${order.orderNumber}-${status}-${Date.now()}`,
          status,
          note: note || `Status changed to ${status}`,
          createdAt: new Date().toISOString()
        }
      ]
    });
    return NextResponse.json({ ok: Boolean(updated), restoredStock: restore, deductedStock: rededuct, source: "fallback" });
  }
}
