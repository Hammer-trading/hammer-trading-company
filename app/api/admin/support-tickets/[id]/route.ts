import { OrderStatus, Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const before = await prisma.supportTicket.findUnique({ where: { id } });
  const ticket = await prisma.supportTicket.update({ where: { id }, data: { status: body.status, internalNotes: body.internalNotes, evidenceUrl: body.evidenceUrl } });
  if (ticket.orderId && ["APPROVED", "REFUNDED"].includes(ticket.status)) {
    await prisma.order.update({ where: { id: ticket.orderId }, data: { status: ticket.status === "REFUNDED" ? OrderStatus.REFUNDED : OrderStatus.RETURNED, returnApprovedAt: new Date() } }).catch(() => undefined);
  }
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "SUPPORT_TICKET_UPDATED", entity: "SupportTicket", entityId: id, previousValue: before as never, newValue: ticket as never } });
  return NextResponse.json(ticket);
}
