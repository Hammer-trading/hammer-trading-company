import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { supportTicketSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.SUPPORT_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status") || "";
  return NextResponse.json(await prisma.supportTicket.findMany({ where: status ? { status } : undefined, include: { user: { select: { name: true, phone: true, email: true } } }, orderBy: { updatedAt: "desc" } }));
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.SUPPORT_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = supportTicketSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid support ticket", details: parsed.error.flatten() }, { status: 400 });
  const ticket = await prisma.supportTicket.create({ data: parsed.data });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "SUPPORT_TICKET_CREATED", entity: "SupportTicket", entityId: ticket.id, newValue: ticket as never } });
  return NextResponse.json(ticket, { status: 201 });
}
