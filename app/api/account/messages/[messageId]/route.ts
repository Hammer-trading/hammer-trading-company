import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { chatMessageActionSchema } from "@/lib/chat-validation";
import {
  ChatBlockedError,
  ChatForbiddenError,
  ChatMessageActionError,
  conversationPayload,
  ensureCustomerRecord,
  updateCustomerMessage
} from "@/lib/customer-chat";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const customer = await ensureCustomerRecord(await getSession());
  if (!customer) return NextResponse.json({ error: "Customer login required" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const ip = getClientIp(request);
  if (!rateLimit(`chat:customer-action:${customer.id}:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many message updates. Please wait a moment." }, { status: 429 });
  }
  const parsed = chatMessageActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message action", details: parsed.error.flatten() }, { status: 400 });

  try {
    const { messageId } = await params;
    const conversation = await updateCustomerMessage(customer.id, messageId, parsed.data);
    return NextResponse.json({ conversation: conversationPayload(conversation), customerPublicId: customer.customerPublicId });
  } catch (error) {
    if (error instanceof ChatBlockedError || error instanceof ChatForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ChatMessageActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Customer message action failed", error);
    return NextResponse.json({ error: "Message could not be updated. Please try again." }, { status: 503 });
  }
}
