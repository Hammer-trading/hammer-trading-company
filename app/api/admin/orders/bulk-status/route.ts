import { OrderStatus, Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getFallbackOrder, updateFallbackOrder } from "@/lib/fallback-orders";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function PATCH(request: Request) {
  const admin = await requirePermission(Permission.ORDERS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ipAddress = getClientIp(request);
  if (!sameOrigin(request) || !rateLimit(`bulk-status:${admin.id}:${ipAddress}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many bulk status requests" }, { status: 429 });
  }

  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string").slice(0, 100) : [];
  const status = body.status as OrderStatus;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : `Bulk status update to ${status}`;
  const actorId = admin.id === "dev-admin" ? null : admin.id;

  if (!ids.length) return NextResponse.json({ error: "Select at least one order." }, { status: 400 });
  if (!Object.values(OrderStatus).includes(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  try {
    const orders = await prisma.order.findMany({ where: { id: { in: ids } } });
    const foundIds = new Set(orders.map((order) => order.id));
    const missing = ids.filter((id: string) => !foundIds.has(id));
    if (!orders.length) return NextResponse.json({ error: "No valid selected orders were found. Refresh orders and select again.", missing }, { status: 404 });

    await prisma.$transaction(
      orders.flatMap((order) => [
        prisma.order.update({
          where: { id: order.id },
          data: {
            status,
            deliveredAt: status === "DELIVERED" ? new Date() : undefined,
            deliveryFailedAt: status === "DELIVERY_FAILED" ? new Date() : undefined,
            returnApprovedAt: status === "RETURNED" ? new Date() : undefined,
            paymentStatus: status === "REFUNDED" ? "REFUNDED" : undefined
          }
        }),
        prisma.orderTimeline.create({ data: { orderId: order.id, status, note, actorId } }),
        prisma.activityLog.create({
          data: {
            actorId,
            orderId: order.id,
            action: "ORDER_BULK_STATUS_UPDATED",
            previousValue: { status: order.status },
            newValue: { status },
            metadata: { note, updatedBy: "admin" }
          }
        })
      ])
    );

    return NextResponse.json({ ok: true, count: orders.length, missing, source: "database" });
  } catch {
    let count = 0;
    const missing: string[] = [];
    for (const id of ids) {
      const order = await getFallbackOrder(id);
      if (!order) {
        missing.push(id);
        continue;
      }
      await updateFallbackOrder(id, {
        status,
        timeline: [
          ...order.timeline,
          {
            id: `${order.orderNumber}-${status}-${Date.now()}`,
            status,
            note,
            createdAt: new Date().toISOString()
          }
        ]
      });
      count += 1;
    }
    if (!count) return NextResponse.json({ error: "No valid selected orders were found. Refresh orders and select again.", missing }, { status: 404 });
    return NextResponse.json({ ok: true, count, missing, source: "fallback" });
  }
}
