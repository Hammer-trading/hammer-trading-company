import { OrderStatus, Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getFallbackOrder, updateFallbackOrder } from "@/lib/fallback-orders";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.ORDERS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const note = String(body.note || "").trim();
  const createdAt = body.createdAt ? new Date(body.createdAt) : new Date();
  const actorId = admin.id === "dev-admin" ? null : admin.id;

  if (!note) return NextResponse.json({ error: "Timeline note is required." }, { status: 400 });
  if (Number.isNaN(createdAt.getTime())) return NextResponse.json({ error: "Invalid timeline date." }, { status: 400 });

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const status = Object.values(OrderStatus).includes(body.status) ? body.status : order.status;
    const timeline = await prisma.orderTimeline.create({
      data: {
        orderId: id,
        status,
        note,
        actorId,
        createdAt
      }
    });
    await prisma.activityLog.create({
      data: {
        actorId,
        orderId: id,
        action: "ORDER_TIMELINE_ADDED",
        metadata: { status, note, createdAt: createdAt.toISOString() }
      }
    });
    return NextResponse.json(timeline, { status: 201 });
  } catch {
    const order = await getFallbackOrder(id);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const status = Object.values(OrderStatus).includes(body.status) ? body.status : order.status;
    const timeline = {
      id: `${order.orderNumber}-timeline-${Date.now()}`,
      status,
      note,
      createdAt: createdAt.toISOString()
    };
    const updated = await updateFallbackOrder(id, { timeline: [...order.timeline, timeline] });
    return NextResponse.json(updated ? timeline : { error: "Unable to add timeline" }, { status: updated ? 201 : 500 });
  }
}
