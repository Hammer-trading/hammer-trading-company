import { z } from "zod";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

const returnRequestSchema = z.object({
  orderNumber: z.string().trim().min(3).max(80),
  reason: z.enum(["DAMAGED", "WRONG_ITEM", "DEFECTIVE", "MISSING_ITEM", "OTHER"]),
  description: z.string().trim().min(10).max(3000),
  evidenceUrl: z.string().url().max(1000).optional().nullable().or(z.literal(""))
});

async function customerSession() {
  const session = await getSession();
  return session?.role === "CUSTOMER" ? session : null;
}

export async function GET() {
  const customer = await customerSession();
  if (!customer) return NextResponse.json({ error: "Customer login required" }, { status: 401 });
  try {
    const items = await prisma.supportTicket.findMany({
      where: { userId: customer.id, type: "RETURN_REQUEST" },
      select: {
        id: true,
        orderId: true,
        title: true,
        description: true,
        status: true,
        evidenceUrl: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Return request list failed", error);
    return NextResponse.json({ error: "Return requests are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const customer = await customerSession();
  if (!customer) return NextResponse.json({ error: "Customer login required" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`return-request:${customer.id}:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many return requests. Please wait before trying again." }, { status: 429 });
  }
  const parsed = returnRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Complete all return request fields.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const order = await prisma.order.findFirst({
      where: { orderNumber: parsed.data.orderNumber, userId: customer.id },
      select: { id: true, orderNumber: true, status: true, deliveredAt: true, customerName: true, customerPhone: true, customerEmail: true }
    });
    if (!order) return NextResponse.json({ error: "This order was not found in your customer account." }, { status: 404 });
    if (order.status !== "DELIVERED" || !order.deliveredAt) {
      return NextResponse.json({ error: "A return request can be opened after the order is delivered." }, { status: 409 });
    }
    const returnWindowDays = 14;
    if (Date.now() - order.deliveredAt.getTime() > returnWindowDays * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: `The ${returnWindowDays}-day return request window has closed.` }, { status: 409 });
    }
    const existing = await prisma.supportTicket.findFirst({
      where: {
        userId: customer.id,
        orderId: order.id,
        type: "RETURN_REQUEST",
        status: { in: ["OPEN", "APPROVED", "REFUNDED"] }
      },
      select: { id: true }
    });
    if (existing) return NextResponse.json({ error: "An active return request already exists for this order." }, { status: 409 });

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: customer.id,
        orderId: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        type: "RETURN_REQUEST",
        status: "OPEN",
        title: `${parsed.data.reason.replaceAll("_", " ")} / ${order.orderNumber}`,
        description: parsed.data.description,
        evidenceUrl: parsed.data.evidenceUrl || null,
        unreadByAdmin: 1
      }
    });
    await prisma.adminNotification.create({
      data: {
        title: "New return request",
        message: `${order.orderNumber}: ${parsed.data.reason.replaceAll("_", " ")}`,
        href: `/admin/support?id=${ticket.id}`
      }
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, item: ticket }, { status: 201 });
  } catch (error) {
    console.error("Return request failed", error);
    return NextResponse.json({ error: "Return request could not be saved." }, { status: 503 });
  }
}
