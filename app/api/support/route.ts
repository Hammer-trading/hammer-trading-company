import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupportConversation } from "@/lib/support-conversations";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

const publicSupportSchema = z.object({
  type: z.string().min(2).default("WHOLESALE"),
  title: z.string().min(2),
  description: z.string().min(5),
  customerName: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().optional(),
  customerPublicId: z.string().optional()
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`public:support:${ip}`, 5, 15 * 60_000)) return NextResponse.json({ error: "Too many support requests. Please wait and try again." }, { status: 429 });
  const parsed = publicSupportSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const data = parsed.data;
    const ticket = await prisma.supportTicket.create({
      data: {
        type: data.type,
        status: "OPEN",
        title: data.title,
        description: [
          `Customer: ${data.customerName}`,
          `Phone: ${data.phone}`,
          data.email ? `Email: ${data.email}` : null,
          data.city ? `City: ${data.city}` : null,
          "",
          data.description
        ].filter(Boolean).join("\n")
      }
    });
    return NextResponse.json({ id: ticket.id, ok: true }, { status: 201 });
  } catch {
    const data = parsed.data;
    const conversation = await createSupportConversation({
      customerPublicId: data.customerPublicId || `HTC-CUS-${data.phone.replace(/\D/g, "").slice(-8) || Date.now()}`,
      customerName: data.customerName,
      customerPhone: data.phone,
      customerEmail: data.email || null,
      type: data.type,
      title: data.title,
      message: [data.city ? `City: ${data.city}` : null, data.description].filter(Boolean).join("\n")
    });
    return NextResponse.json({ id: conversation.id, ok: true, source: "fallback" }, { status: 201 });
  }
}
