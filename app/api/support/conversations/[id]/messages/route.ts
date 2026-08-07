import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { adminRoles } from "@/lib/permissions";
import { addSupportMessage, getSupportConversation, updateSupportConversation } from "@/lib/support-conversations";
import { prisma } from "@/lib/prisma";

const messageSchema = z.object({
  body: z.string().min(1),
  attachmentUrl: z.string().optional().nullable()
});

async function requireCustomerSession() {
  const session = await getSession();
  if (!session || adminRoles.includes(session.role)) return null;
  return {
    customerPublicId: `HTC-USER-${session.id}`,
    customerName: session.name
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await requireCustomerSession();
  if (!customer) return NextResponse.json({ error: "Login required for customer chat" }, { status: 401 });
  const customerPublicId = customer.customerPublicId;
  try {
    const conversation = await prisma.supportTicket.findFirst({
      where: { id, customerPublicId },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    await prisma.supportTicket.update({ where: { id }, data: { unreadByCustomer: 0 } }).catch(() => undefined);
    return NextResponse.json({ conversation, source: "database" });
  } catch {
    const conversation = await getSupportConversation(id);
    if (!conversation || conversation.customerPublicId !== customerPublicId) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    await updateSupportConversation(id, { unreadByCustomer: 0 });
    return NextResponse.json({ conversation: { ...conversation, unreadByCustomer: 0 }, source: "fallback" });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await requireCustomerSession();
  if (!customer) return NextResponse.json({ error: "Login required for customer chat" }, { status: 401 });
  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid message", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  try {
    const conversation = await prisma.supportTicket.findFirst({ where: { id, customerPublicId: customer.customerPublicId } });
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const message = await prisma.supportMessage.create({
      data: {
        ticketId: id,
        senderType: "CUSTOMER",
        senderName: customer.customerName,
        body: data.body,
        attachmentUrl: data.attachmentUrl || null
      }
    });
    await prisma.supportTicket.update({
      where: { id },
      data: { status: conversation.status === "CLOSED" ? "OPEN" : conversation.status, unreadByAdmin: { increment: 1 }, lastMessageAt: new Date() }
    });
    await prisma.adminNotification.create({
      data: {
        title: "Customer replied",
        message: `${customer.customerName}: ${data.body.slice(0, 80)}`,
        href: "/admin/support"
      }
    }).catch(() => undefined);
    return NextResponse.json({ message, source: "database" }, { status: 201 });
  } catch {
    const conversation = await getSupportConversation(id);
    if (!conversation || conversation.customerPublicId !== customer.customerPublicId) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const result = await addSupportMessage(id, { senderType: "CUSTOMER", senderName: customer.customerName, body: data.body, attachmentUrl: data.attachmentUrl });
    return NextResponse.json({ message: result?.message, source: "fallback" }, { status: 201 });
  }
}
