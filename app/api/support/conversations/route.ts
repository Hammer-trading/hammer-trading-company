import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { adminRoles } from "@/lib/permissions";
import { createSupportConversation, getCustomerConversations } from "@/lib/support-conversations";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  orderNumber: z.string().optional().or(z.literal("")),
  type: z.string().min(2).default("CHAT"),
  title: z.string().min(2).default("Customer chat"),
  message: z.string().min(1)
});

async function requireCustomerSession() {
  const session = await getSession();
  if (!session || adminRoles.includes(session.role)) return null;
  return {
    customerPublicId: `HTC-USER-${session.id}`,
    customerName: session.name,
    customerEmail: session.email
  };
}

export async function GET() {
  const customer = await requireCustomerSession();
  if (!customer) return NextResponse.json({ error: "Login required for customer chat" }, { status: 401 });
  const customerPublicId = customer.customerPublicId;
  try {
    const conversations = await prisma.supportTicket.findMany({
      where: { customerPublicId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" }
    });
    return NextResponse.json({ items: conversations, source: "database" });
  } catch {
    return NextResponse.json({ items: await getCustomerConversations(customerPublicId), source: "fallback" });
  }
}

export async function POST(request: Request) {
  const customer = await requireCustomerSession();
  if (!customer) return NextResponse.json({ error: "Login required for customer chat" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid conversation", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  try {
    const ticket = await prisma.supportTicket.create({
      data: {
        customerPublicId: customer.customerPublicId,
        customerName: customer.customerName,
        customerPhone: "",
        customerEmail: customer.customerEmail,
        orderId: null,
        type: data.type,
        status: "OPEN",
        title: data.title,
        description: data.message,
        unreadByAdmin: 1,
        unreadByCustomer: 0,
        lastMessageAt: new Date(),
        messages: {
          create: {
            senderType: "CUSTOMER",
            senderName: customer.customerName,
            body: data.message
          }
        }
      },
      include: { messages: { orderBy: { createdAt: "asc" } } }
    });
    await prisma.adminNotification.create({
      data: {
        title: "New customer message",
        message: `${customer.customerName}: ${data.title}`,
        href: "/admin/support"
      }
    }).catch(() => undefined);
    return NextResponse.json({ conversation: ticket, source: "database" }, { status: 201 });
  } catch {
    const conversation = await createSupportConversation({
      customerPublicId: customer.customerPublicId,
      customerName: customer.customerName,
      customerPhone: "",
      customerEmail: customer.customerEmail,
      orderNumber: data.orderNumber || null,
      type: data.type,
      title: data.title,
      message: data.message
    });
    return NextResponse.json({ conversation, source: "fallback" }, { status: 201 });
  }
}
