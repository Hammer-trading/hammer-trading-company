import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { addSupportMessage, getSupportConversation } from "@/lib/support-conversations";
import { prisma } from "@/lib/prisma";

const replySchema = z.object({
  body: z.string().min(1),
  attachmentUrl: z.string().optional().nullable()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = replySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid reply", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  try {
    const conversation = await prisma.supportTicket.findUnique({ where: { id } });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const message = await prisma.supportMessage.create({
      data: {
        ticketId: id,
        senderType: "ADMIN",
        senderName: admin.name,
        body: data.body,
        attachmentUrl: data.attachmentUrl || null
      }
    });
    await prisma.supportTicket.update({
      where: { id },
      data: { unreadByCustomer: { increment: 1 }, unreadByAdmin: 0, status: conversation.status === "OPEN" ? "PENDING_CUSTOMER" : conversation.status, lastMessageAt: new Date() }
    });
    await prisma.activityLog.create({ data: { actorId: admin.id, action: "SUPPORT_REPLY_SENT", entity: "SupportTicket", entityId: id } }).catch(() => undefined);
    return NextResponse.json({ message, source: "database" }, { status: 201 });
  } catch {
    const conversation = await getSupportConversation(id);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const result = await addSupportMessage(id, { senderType: "ADMIN", senderName: admin.name, body: data.body, attachmentUrl: data.attachmentUrl });
    return NextResponse.json({ message: result?.message, source: "fallback" }, { status: 201 });
  }
}
