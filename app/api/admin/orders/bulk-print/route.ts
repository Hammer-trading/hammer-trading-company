import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getFallbackOrder, updateFallbackOrder } from "@/lib/fallback-orders";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

const PRINT_ACTION = "ORDER_BULK_PRINTED";
const PRINT_NOTE = "Bulk order slips printed";

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.ORDERS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ipAddress = getClientIp(request);
  if (!sameOrigin(request) || !rateLimit(`bulk-print:${admin.id}:${ipAddress}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many bulk print requests" }, { status: 429 });
  }

  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string").slice(0, 100) : [];
  const documentType = typeof body.documentType === "string" ? body.documentType : "order-slips";
  const markPrinted = body.markPrinted !== false;
  const actorId = admin.id === "dev-admin" ? null : admin.id;

  if (!ids.length) return NextResponse.json({ error: "Select at least one order." }, { status: 400 });

  try {
    const orders = await prisma.order.findMany({
      where: { id: { in: ids } },
      include: {
        courier: true,
        assignedRider: true,
        qrcodes: true,
        timeline: { orderBy: { createdAt: "asc" } },
        activityLogs: { where: { action: PRINT_ACTION }, orderBy: { createdAt: "desc" }, take: 5 },
        items: {
          include: {
            product: {
              include: {
                inventory: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const foundIds = new Set(orders.map((order) => order.id));
    const missing = ids.filter((id: string) => !foundIds.has(id));
    if (!orders.length) return NextResponse.json({ error: "No valid selected orders were found. Refresh orders and select again.", missing }, { status: 404 });

    if (markPrinted) {
      await prisma.$transaction(
        orders.flatMap((order) => [
          prisma.orderTimeline.create({
            data: {
              orderId: order.id,
              status: order.status,
              actorId,
              note: `${PRINT_NOTE}. Old status: ${order.status}. New status: Printed.`
            }
          }),
          prisma.activityLog.create({
            data: {
              actorId,
              orderId: order.id,
              action: PRINT_ACTION,
              previousValue: { status: order.status },
              newValue: { status: "PRINTED" },
              metadata: {
                documentType,
                note: PRINT_NOTE,
                updatedBy: "admin",
                printedAt: new Date().toISOString()
              }
            }
          })
        ])
      );
    }

    const refreshed = await prisma.order.findMany({
      where: { id: { in: orders.map((order) => order.id) } },
      include: {
        courier: true,
        assignedRider: true,
        qrcodes: true,
        timeline: { orderBy: { createdAt: "asc" } },
        activityLogs: { where: { action: PRINT_ACTION }, orderBy: { createdAt: "desc" }, take: 5 },
        items: { include: { product: { include: { inventory: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ orders: refreshed, missing, printedAt: new Date().toISOString(), source: "database" });
  } catch (error) {
    console.error("Bulk print failed", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Database print preparation failed. Refresh orders and try again." }, { status: 503 });
    }
    const orders = (await Promise.all(ids.map((id: string) => getFallbackOrder(id)))).filter(Boolean);
    if (!orders.length) return NextResponse.json({ error: "No valid selected orders were found. Refresh orders and select again." }, { status: 404 });

    const printedAt = new Date().toISOString();
    const updated = [];
    for (const order of orders) {
      if (!order) continue;
      const next = markPrinted
        ? await updateFallbackOrder(order.id, {
            timeline: [
              ...order.timeline,
              {
                id: `${order.orderNumber}-printed-${Date.now()}`,
                status: order.status,
                note: `${PRINT_NOTE}. Old status: ${order.status}. New status: Printed.`,
                createdAt: printedAt
              }
            ],
            internalNotes: [order.internalNotes, `${PRINT_NOTE} at ${printedAt}`].filter(Boolean).join("\n")
          })
        : order;
      updated.push(next || order);
    }

    return NextResponse.json({ orders: updated, missing: ids.length - updated.length, printedAt, source: "fallback" });
  }
}
