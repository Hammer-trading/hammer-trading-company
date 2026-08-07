import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getSupportConversation, updateSupportConversation } from "@/lib/support-conversations";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const conversation = await prisma.supportTicket.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    await prisma.supportTicket.update({ where: { id }, data: { unreadByAdmin: 0 } }).catch(() => undefined);
    return NextResponse.json({ conversation, source: "database" });
  } catch {
    const conversation = await getSupportConversation(id);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    await updateSupportConversation(id, { unreadByAdmin: 0 });
    return NextResponse.json({ conversation: { ...conversation, unreadByAdmin: 0 }, source: "fallback" });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const status = String(body.status || "OPEN");
  try {
    const conversation = await prisma.supportTicket.update({ where: { id }, data: { status }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    await prisma.activityLog.create({ data: { actorId: admin.id, action: "SUPPORT_CONVERSATION_STATUS_UPDATED", entity: "SupportTicket", entityId: id, newValue: { status } } }).catch(() => undefined);
    return NextResponse.json({ conversation, source: "database" });
  } catch {
    const conversation = await updateSupportConversation(id, { status });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json({ conversation, source: "fallback" });
  }
}
