import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { chatMessageSchema } from "@/lib/chat-validation";
import { ChatBlockedError, ChatForbiddenError, conversationPayload, ensureCustomerRecord, getCustomerConversation, sendCustomerMessage } from "@/lib/customer-chat";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

async function requireCustomer() {
  const session = await getSession();
  return ensureCustomerRecord(session);
}

export async function GET(request: Request) {
  try {
    const customer = await requireCustomer();
    if (!customer) return NextResponse.json({ error: "Customer login required" }, { status: 401 });
    const requestedConversationId = new URL(request.url).searchParams.get("conversationId");
    const conversation = await getCustomerConversation(customer.id, requestedConversationId);
    return NextResponse.json({ conversation: conversationPayload(conversation), customerPublicId: customer.customerPublicId });
  } catch (error) {
    if (error instanceof ChatForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Customer chat load failed", error);
    return NextResponse.json({ error: "Messages database is not ready. Please try again shortly." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const customer = await requireCustomer();
    if (!customer) return NextResponse.json({ error: "Customer login required" }, { status: 401 });
    const ip = getClientIp(request);
    if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    if (!rateLimit(`chat:customer:${customer.id}:${ip}`, 12, 60_000)) {
      return NextResponse.json({ error: "Too many messages. Please wait a moment and try again." }, { status: 429 });
    }
    const parsed = chatMessageSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid message", details: parsed.error.flatten() }, { status: 400 });
    const conversation = await sendCustomerMessage(customer.id, parsed.data);
    return NextResponse.json({ conversation: conversationPayload(conversation), customerPublicId: customer.customerPublicId }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatBlockedError) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error instanceof ChatForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Customer chat send failed", error);
    return NextResponse.json({ error: "Message could not be saved. Please try again." }, { status: 503 });
  }
}
