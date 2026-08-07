import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { activityActorId, requirePermission } from "@/lib/auth";
import { chatMessageSchema, conversationUpdateSchema } from "@/lib/chat-validation";
import { ChatForbiddenError, conversationPayload, getAdminConversation, getAdminConversationProfile, sendAdminMessage, updateAdminConversation } from "@/lib/customer-chat";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function GET(_: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;
  try {
    const conversation = await getAdminConversation(conversationId);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    const profile = await getAdminConversationProfile(conversationId);
    return NextResponse.json({ conversation: conversationPayload(conversation), profile });
  } catch (error) {
    console.error("Admin message detail failed", error);
    return NextResponse.json({ error: "Messages database is not ready. Please try again shortly." }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;
  try {
    const ip = getClientIp(request);
    if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    if (!rateLimit(`chat:admin:${admin.id}:${conversationId}:${ip}`, 20, 60_000)) {
      return NextResponse.json({ error: "Too many replies. Please wait a moment and try again." }, { status: 429 });
    }
    const parsed = chatMessageSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid reply", details: parsed.error.flatten() }, { status: 400 });
    const conversation = await sendAdminMessage(conversationId, admin, parsed.data);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    await prisma.activityLog.create({
      data: {
        actorId: activityActorId(admin),
        action: "CUSTOMER_MESSAGE_REPLY",
        entity: "ChatConversation",
        entityId: conversationId,
        metadata: {
          customerId: conversation.customerId,
          customerPublicId: conversation.customer?.customerPublicId,
          messagePreview: parsed.data.messageText.slice(0, 160),
          attachmentName: parsed.data.attachmentName
        },
        ipAddress: ip
      }
    }).catch(() => undefined);
    const profile = await getAdminConversationProfile(conversationId);
    return NextResponse.json({ conversation: conversationPayload(conversation), profile }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatForbiddenError) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("Admin message reply failed", error);
    return NextResponse.json({ error: "Reply could not be saved. Please try again." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params;
  try {
    const ip = getClientIp(request);
    if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    if (!rateLimit(`chat:update:${admin.id}:${conversationId}:${ip}`, 30, 60_000)) {
      return NextResponse.json({ error: "Too many updates. Please wait a moment." }, { status: 429 });
    }
    const parsed = conversationUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid conversation update", details: parsed.error.flatten() }, { status: 400 });
    const conversation = await updateAdminConversation(conversationId, parsed.data);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    await prisma.activityLog.create({
      data: {
        actorId: activityActorId(admin),
        action: "CUSTOMER_CONVERSATION_UPDATE",
        entity: "ChatConversation",
        entityId: conversationId,
        metadata: parsed.data,
        ipAddress: ip
      }
    }).catch(() => undefined);
    const profile = await getAdminConversationProfile(conversationId);
    return NextResponse.json({ conversation: conversationPayload(conversation), profile });
  } catch (error) {
    console.error("Admin conversation update failed", error);
    return NextResponse.json({ error: "Conversation could not be updated. Please try again." }, { status: 503 });
  }
}
