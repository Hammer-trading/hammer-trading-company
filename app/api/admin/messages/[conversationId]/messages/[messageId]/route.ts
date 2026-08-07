import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { chatMessageActionSchema } from "@/lib/chat-validation";
import {
  ChatForbiddenError,
  ChatMessageActionError,
  conversationPayload,
  getAdminConversationProfile,
  updateAdminMessage
} from "@/lib/customer-chat";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  const admin = await requirePermission(Permission.SUPPORT_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const { conversationId, messageId } = await params;
  const ip = getClientIp(request);
  if (!rateLimit(`chat:admin-message-action:${admin.id}:${conversationId}:${ip}`, 40, 60_000)) {
    return NextResponse.json({ error: "Too many message updates. Please wait a moment." }, { status: 429 });
  }
  const parsed = chatMessageActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message action", details: parsed.error.flatten() }, { status: 400 });

  try {
    const conversation = await updateAdminMessage(conversationId, messageId, admin, parsed.data);
    const profile = await getAdminConversationProfile(conversationId);
    return NextResponse.json({ conversation: conversationPayload(conversation), profile });
  } catch (error) {
    if (error instanceof ChatForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ChatMessageActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin message action failed", error);
    return NextResponse.json({ error: "Message could not be updated. Please try again." }, { status: 503 });
  }
}
