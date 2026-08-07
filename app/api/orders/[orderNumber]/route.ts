import { NextResponse } from "next/server";
import { getFallbackOrder } from "@/lib/fallback-orders";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/security";

function publicOrder(order: {
  orderNumber: string;
  status: string;
  total: unknown;
  trackingNumber?: string | null;
  courierName?: string | null;
  timeline: Array<{ id: string; status: string; createdAt: Date | string }>;
}) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    total: Number(order.total),
    trackingNumber: order.trackingNumber || null,
    courierName: order.courierName || null,
    timeline: order.timeline.map((event) => ({
      id: event.id,
      status: event.status,
      createdAt: event.createdAt
    }))
  };
}

function response(order: Parameters<typeof publicOrder>[0]) {
  return NextResponse.json(publicOrder(order), {
    headers: { "Cache-Control": "no-store, private" }
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  if (!/^[a-z0-9-]{6,64}$/i.test(orderNumber)) {
    return NextResponse.json({ error: "Invalid order number" }, { status: 400 });
  }
  if (!rateLimit(`public-order:${getClientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many tracking requests" }, { status: 429 });
  }
  try {
    const order = await prisma.order.findUnique({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        total: true,
        trackingNumber: true,
        courierName: true,
        timeline: {
          orderBy: { createdAt: "asc" },
          select: { id: true, status: true, createdAt: true }
        }
      }
    });
    if (!order) {
      const fallbackOrder = await getFallbackOrder(orderNumber);
      if (fallbackOrder) return response(fallbackOrder);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return response(order);
  } catch {
    const order = await getFallbackOrder(orderNumber);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return response(order);
  }
}
