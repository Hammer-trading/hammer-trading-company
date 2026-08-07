import crypto from "crypto";
import bcrypt from "bcryptjs";
import { del } from "@vercel/blob";
import { ChatMessageType, ChatSenderRole, ConversationStatus, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { adminRoles, permissionsFor } from "@/lib/permissions";

const messageLimit = 240;
let schemaReady: Promise<void> | null = null;

const replyPreviewSelect = {
  id: true,
  senderRole: true,
  messageType: true,
  messageText: true,
  attachmentName: true,
  deletedAt: true
};

const conversationInclude = {
  customer: { select: { id: true, name: true, email: true, phone: true, customerPublicId: true } },
  admin: { select: { id: true, name: true, email: true } },
  messages: {
    orderBy: { createdAt: "asc" as const },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      replyTo: { select: replyPreviewSelect }
    }
  }
};

const listInclude = {
  customer: { select: { id: true, name: true, email: true, phone: true, customerPublicId: true } },
  admin: { select: { id: true, name: true, email: true } }
};

export type ChatConversationDetail = Prisma.ChatConversationGetPayload<{ include: typeof conversationInclude }>;
export type ChatConversationListItem = Prisma.ChatConversationGetPayload<{ include: typeof listInclude }>;
export type AdminConversationFilter = "all" | "unread" | "replied" | "not-replied" | "pinned" | "archived";
export type AdminConversationSort = "latest" | "oldest";

export type ChatMessageInput = {
  conversationId?: string;
  clientMessageId?: string;
  messageText: string;
  messageType?: "TEXT" | "IMAGE" | "VOICE" | "PRODUCT" | "SYSTEM";
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  voiceDuration?: number | null;
  voiceWaveform?: number[] | null;
  replyToId?: string | null;
  productId?: string | null;
  productVariantId?: string | null;
};

export type AdminConversationUpdate = {
  status?: ConversationStatus;
  isPinned?: boolean;
  isArchived?: boolean;
  isBlocked?: boolean;
  internalNotes?: string | null;
};

export type ChatMessageAction =
  | { action: "edit"; messageText: string }
  | { action: "delete" }
  | { action: "pin"; isPinned: boolean };

export class ChatBlockedError extends Error {
  constructor() {
    super("Messaging has been disabled for this account. Please contact support by phone or email.");
    this.name = "ChatBlockedError";
  }
}

export class ChatForbiddenError extends Error {
  constructor() {
    super("You do not have access to this conversation.");
    this.name = "ChatForbiddenError";
  }
}

export class ChatMessageActionError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "ChatMessageActionError";
  }
}

export type AdminConversationProfile = {
  orderCount: number;
  lifetimeSpend: number;
  lastOrderAt: Date | null;
  latestOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentMethod: string;
    total: number;
    createdAt: Date;
  }>;
};

function cleanMessage(value: string) {
  return value.replace(/\s+\n/g, "\n").trim();
}

function preview(value: string) {
  return cleanMessage(value).slice(0, messageLimit);
}

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

type ChatProductSnapshot = {
  id: string;
  variantId: string | null;
  name: string;
  slug: string;
  image: string;
  price: number;
  sku: string;
  variantName: string | null;
  stock: number;
  brand: string;
  category: string;
};

function publicProductImage(product: {
  name: string;
  images: Array<{ id: string; url: string; alt: string | null; isMain: boolean; sortOrder: number }>;
}) {
  const image = product.images
    .slice()
    .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder)[0];
  if (!image?.url) return "/brand/htc-logo.png";
  if (image.url.startsWith("data:")) return `/api/product-images/${image.id}`;
  return image.url;
}

async function buildProductSnapshot(input: ChatMessageInput): Promise<ChatProductSnapshot | null> {
  if (!input.productId) return null;
  const product = await prisma.product.findFirst({
    where: { id: input.productId, isActive: true },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] },
      variants: { where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }
    }
  });
  if (!product) throw new Error("Selected product is unavailable");
  const selectedVariant = input.productVariantId
    ? product.variants.find((variant) => variant.id === input.productVariantId)
    : product.variants.find((variant) => variant.isDefault) || product.variants[0] || null;
  if (input.productVariantId && !selectedVariant) throw new Error("Selected product variant is unavailable");
  const image = selectedVariant?.imageUrl && !selectedVariant.imageUrl.startsWith("data:")
    ? selectedVariant.imageUrl
    : publicProductImage(product);
  return {
    id: product.id,
    variantId: selectedVariant?.id || null,
    name: product.name,
    slug: product.slug,
    image,
    price: Number(selectedVariant?.price ?? product.price),
    sku: selectedVariant?.sku || product.sku,
    variantName: selectedVariant?.title || null,
    stock: Number(selectedVariant?.stock ?? product.stock),
    brand: product.brand?.name || "Hammer Trading",
    category: product.category?.name || "General"
  };
}

function messageTypeFor(input: ChatMessageInput, product: ChatProductSnapshot | null) {
  if (product) return ChatMessageType.PRODUCT;
  if (input.voiceDuration) return ChatMessageType.VOICE;
  if (input.attachmentType?.startsWith("image/")) return ChatMessageType.IMAGE;
  return ChatMessageType.TEXT;
}

function messagePreview(body: string, input: ChatMessageInput, product: ChatProductSnapshot | null) {
  if (product) return preview(body || `Shared product: ${product.name}`);
  return preview(body || input.attachmentName || "Attachment");
}

async function assertReplyTarget(conversationId: string, replyToId?: string | null) {
  if (!replyToId) return null;
  const replyTarget = await prisma.chatMessage.findFirst({
    where: { id: replyToId, conversationId, deletedAt: null },
    select: { id: true }
  });
  if (!replyTarget) throw new ChatForbiddenError();
  return replyTarget.id;
}

async function refreshConversationSummary(conversationId: string) {
  const latest = await prisma.chatMessage.findFirst({
    where: { conversationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { messageText: true, attachmentName: true, messageType: true, createdAt: true, productSnapshot: true }
  });
  let lastMessage: string | null = null;
  if (latest) {
    const product = latest.productSnapshot && typeof latest.productSnapshot === "object" && !Array.isArray(latest.productSnapshot)
      ? latest.productSnapshot as Record<string, unknown>
      : null;
    lastMessage = preview(
      latest.messageText ||
      (latest.messageType === ChatMessageType.PRODUCT ? `Shared product: ${String(product?.name || "Product")}` : "") ||
      latest.attachmentName ||
      "Attachment"
    );
  }
  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { lastMessage, lastMessageAt: latest?.createdAt || null }
  });
}

export async function ensureChatSchema() {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const statements = [
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customerPublicId" TEXT`,
      `UPDATE "User" SET "customerPublicId" = 'HTC-CUS-' || upper(substr(md5("id"), 1, 10)) WHERE "role" = 'CUSTOMER' AND "customerPublicId" IS NULL`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "User_customerPublicId_key" ON "User"("customerPublicId")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatSenderRole') THEN CREATE TYPE "ChatSenderRole" AS ENUM ('CUSTOMER', 'ADMIN'); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConversationStatus') THEN CREATE TYPE "ConversationStatus" AS ENUM ('NEW', 'OPEN', 'PENDING', 'RESOLVED', 'CLOSED'); END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChatMessageType') THEN CREATE TYPE "ChatMessageType" AS ENUM ('TEXT', 'IMAGE', 'VOICE', 'PRODUCT', 'SYSTEM'); END IF; END $$`,
      `CREATE TABLE IF NOT EXISTS "ChatConversation" ("id" TEXT NOT NULL, "customerId" TEXT NOT NULL, "adminId" TEXT, "lastMessage" TEXT, "lastMessageAt" TIMESTAMP(3), "customerUnreadCount" INTEGER NOT NULL DEFAULT 0, "adminUnreadCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id"))`,
      `CREATE TABLE IF NOT EXISTS "ChatMessage" ("id" TEXT NOT NULL, "conversationId" TEXT NOT NULL, "senderId" TEXT, "senderRole" "ChatSenderRole" NOT NULL, "messageText" TEXT NOT NULL, "isRead" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id"))`,
      `ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "status" "ConversationStatus" NOT NULL DEFAULT 'NEW'`,
      `ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "isBlocked" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT`,
      `ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "lastCustomerMessageAt" TIMESTAMP(3)`,
      `ALTER TABLE "ChatConversation" ADD COLUMN IF NOT EXISTS "lastAdminMessageAt" TIMESTAMP(3)`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "attachmentType" TEXT`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "messageType" "ChatMessageType" NOT NULL DEFAULT 'TEXT'`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "voiceDuration" INTEGER`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "voiceWaveform" JSONB`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "replyToId" TEXT`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3)`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "productId" TEXT`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "productVariantId" TEXT`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "productSnapshot" JSONB`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3)`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3)`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "receiverId" TEXT`,
      `ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "clientMessageId" TEXT`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ChatConversation_customerId_key" ON "ChatConversation"("customerId")`,
      `CREATE INDEX IF NOT EXISTS "ChatConversation_lastMessageAt_idx" ON "ChatConversation"("lastMessageAt")`,
      `CREATE INDEX IF NOT EXISTS "ChatConversation_adminUnreadCount_idx" ON "ChatConversation"("adminUnreadCount")`,
      `CREATE INDEX IF NOT EXISTS "ChatConversation_customerUnreadCount_idx" ON "ChatConversation"("customerUnreadCount")`,
      `CREATE INDEX IF NOT EXISTS "ChatConversation_customerId_lastMessageAt_idx" ON "ChatConversation"("customerId", "lastMessageAt")`,
      `CREATE INDEX IF NOT EXISTS "ChatConversation_status_lastMessageAt_idx" ON "ChatConversation"("status", "lastMessageAt")`,
      `CREATE INDEX IF NOT EXISTS "ChatConversation_isPinned_isArchived_idx" ON "ChatConversation"("isPinned", "isArchived")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_senderId_idx" ON "ChatMessage"("senderId")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_receiverId_idx" ON "ChatMessage"("receiverId")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "ChatMessage_clientMessageId_key" ON "ChatMessage"("clientMessageId")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_senderRole_isRead_idx" ON "ChatMessage"("senderRole", "isRead")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_isPinned_idx" ON "ChatMessage"("conversationId", "isPinned")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_senderRole_isRead_idx" ON "ChatMessage"("conversationId", "senderRole", "isRead")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_productId_idx" ON "ChatMessage"("productId")`,
      `CREATE INDEX IF NOT EXISTS "ChatMessage_productVariantId_idx" ON "ChatMessage"("productVariantId")`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatConversation_customerId_fkey') THEN ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatConversation_adminId_fkey') THEN ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_conversationId_fkey') THEN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_senderId_fkey') THEN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_receiverId_fkey') THEN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChatMessage_replyToId_fkey') THEN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE; END IF; END $$`,
      `UPDATE "ChatConversation" SET "adminId" = (SELECT "id" FROM "User" WHERE "isActive" = true AND "role" IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT_STAFF') ORDER BY CASE WHEN "role" = 'SUPER_ADMIN' THEN 0 WHEN "role" = 'ADMIN' THEN 1 ELSE 2 END, "createdAt" ASC LIMIT 1) WHERE "adminId" IS NULL`,
      `UPDATE "ChatMessage" AS message SET "receiverId" = CASE WHEN message."senderRole" = 'CUSTOMER' THEN conversation."adminId" ELSE conversation."customerId" END FROM "ChatConversation" AS conversation WHERE message."conversationId" = conversation."id" AND message."receiverId" IS NULL`
    ];
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement);
    }
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

function idSafe(value: string) {
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return cleaned ? cleaned.slice(-10).padStart(6, "0") : crypto.randomBytes(5).toString("hex").toUpperCase();
}

async function assignCustomerPublicId(userId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0
      ? `HTC-CUS-${idSafe(userId)}`
      : `HTC-CUS-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { customerPublicId: candidate }
      });
      return user.customerPublicId || candidate;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new Error("Unable to allocate customer ID");
}

export async function ensureCustomerRecord(session: SessionUser | null) {
  if (!session || adminRoles.includes(session.role)) return null;
  await ensureChatSchema();

  let user = await prisma.user.findUnique({ where: { id: session.id } });
  if (!user) user = await prisma.user.findUnique({ where: { email: session.email } });
  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 10);
    user = await prisma.user.create({
      data: {
        id: session.id,
        name: session.name,
        email: session.email,
        passwordHash,
        role: Role.CUSTOMER,
        isActive: true,
        customerPublicId: `HTC-CUS-${idSafe(session.id)}`
      }
    }).catch(async (error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const passwordHashRetry = await bcrypt.hash(crypto.randomUUID(), 10);
        return prisma.user.create({
          data: {
            name: session.name,
            email: session.email,
            passwordHash: passwordHashRetry,
            role: Role.CUSTOMER,
            isActive: true
          }
        });
      }
      throw error;
    });
  }

  if (!user.isActive || user.role !== Role.CUSTOMER) return null;
  if (!user.customerPublicId) {
    const customerPublicId = await assignCustomerPublicId(user.id);
    return { ...user, customerPublicId };
  }
  return user;
}

export async function ensureCustomerConversation(customerId: string) {
  const primaryAdmin = await prisma.user.findFirst({
    where: { isActive: true, role: { in: [Role.SUPER_ADMIN, Role.ADMIN, Role.SUPPORT_STAFF] } },
    select: { id: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });
  const conversation = await prisma.chatConversation.upsert({
    where: { customerId },
    update: {},
    create: { customerId, adminId: primaryAdmin?.id || null },
    include: conversationInclude
  });
  if (!conversation.adminId && primaryAdmin?.id) {
    return prisma.chatConversation.update({
      where: { id: conversation.id },
      data: { adminId: primaryAdmin.id },
      include: conversationInclude
    });
  }
  return conversation;
}

export async function getCustomerConversation(customerId: string, requestedConversationId?: string | null) {
  const conversation = await ensureCustomerConversation(customerId);
  if (requestedConversationId && requestedConversationId !== conversation.id) throw new ChatForbiddenError();
  const now = new Date();
  await prisma.chatMessage.updateMany({
    where: { conversationId: conversation.id, senderRole: ChatSenderRole.ADMIN, isRead: false },
    data: { isRead: true, readAt: now, deliveredAt: now }
  });
  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: { customerUnreadCount: 0 }
  });
  return prisma.chatConversation.findUniqueOrThrow({
    where: { id: conversation.id },
    include: conversationInclude
  });
}

export async function sendCustomerMessage(customerId: string, input: ChatMessageInput) {
  const body = cleanMessage(input.messageText);
  const productSnapshot = await buildProductSnapshot(input);
  if (!body && !input.attachmentUrl && !productSnapshot) throw new Error("Message, attachment, or product is required");
  const conversation = await ensureCustomerConversation(customerId);
  if (input.conversationId && input.conversationId !== conversation.id) throw new ChatForbiddenError();
  if (conversation.isBlocked) throw new ChatBlockedError();
  const replyToId = await assertReplyTarget(conversation.id, input.replyToId);
  if (input.clientMessageId) {
    const duplicate = await prisma.chatMessage.findUnique({ where: { clientMessageId: input.clientMessageId }, select: { conversationId: true } });
    if (duplicate) {
      if (duplicate.conversationId !== conversation.id) throw new ChatForbiddenError();
      return prisma.chatConversation.findUniqueOrThrow({ where: { id: conversation.id }, include: conversationInclude });
    }
  }
  const now = new Date();
  const type = messageTypeFor(input, productSnapshot);
  try {
    await prisma.$transaction([
      prisma.chatMessage.create({
      data: {
        clientMessageId: input.clientMessageId || null,
        conversationId: conversation.id,
        senderId: customerId,
        receiverId: conversation.adminId,
        senderRole: ChatSenderRole.CUSTOMER,
        messageType: type,
        messageText: body,
        attachmentUrl: input.attachmentUrl || null,
        attachmentName: input.attachmentName || null,
        attachmentType: input.attachmentType || null,
        voiceDuration: input.voiceDuration || null,
        voiceWaveform: input.voiceWaveform ? input.voiceWaveform as Prisma.InputJsonValue : undefined,
        replyToId,
        productId: productSnapshot?.id || null,
        productVariantId: productSnapshot?.variantId || null,
        productSnapshot: productSnapshot ? productSnapshot as Prisma.InputJsonValue : undefined,
        deliveredAt: now,
        isRead: false,
        createdAt: now
      }
      }),
      prisma.chatConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: messagePreview(body, input, productSnapshot),
        lastMessageAt: now,
        lastCustomerMessageAt: now,
        status: ConversationStatus.OPEN,
        isArchived: false,
        customerUnreadCount: 0,
        adminUnreadCount: { increment: 1 }
      }
      })
    ]);
  } catch (error) {
    if (!input.clientMessageId || !isUniqueConflict(error)) throw error;
    const duplicate = await prisma.chatMessage.findUnique({ where: { clientMessageId: input.clientMessageId }, select: { conversationId: true } });
    if (!duplicate || duplicate.conversationId !== conversation.id) throw error;
  }
  return prisma.chatConversation.findUniqueOrThrow({ where: { id: conversation.id }, include: conversationInclude });
}

function buildAdminConversationWhere(query = "", filter: AdminConversationFilter = "all"): Prisma.ChatConversationWhereInput {
  const q = query.trim();
  const where: Prisma.ChatConversationWhereInput = {};
  if (filter === "archived") where.isArchived = true;
  else where.isArchived = false;
  if (q) {
    where.OR = [
      { customer: { name: { contains: q, mode: "insensitive" } } },
      { customer: { email: { contains: q, mode: "insensitive" } } },
      { customer: { phone: { contains: q, mode: "insensitive" } } },
      { customer: { customerPublicId: { contains: q, mode: "insensitive" } } },
      { lastMessage: { contains: q, mode: "insensitive" } },
      { messages: { some: { messageText: { contains: q, mode: "insensitive" } } } }
    ];
  }
  if (filter === "unread") where.adminUnreadCount = { gt: 0 };
  if (filter === "replied") where.messages = { some: { senderRole: ChatSenderRole.ADMIN } };
  if (filter === "not-replied") where.messages = { none: { senderRole: ChatSenderRole.ADMIN } };
  if (filter === "pinned") where.isPinned = true;
  return where;
}

export async function getAdminConversations(
  query = "",
  options: { page?: number; pageSize?: number; filter?: AdminConversationFilter; sort?: AdminConversationSort } = {}
) {
  await ensureChatSchema();
  const page = Math.max(1, Number(options.page || 1));
  const pageSize = Math.min(50, Math.max(10, Number(options.pageSize || 30)));
  const where = buildAdminConversationWhere(query, options.filter || "all");
  const order = options.sort === "oldest" ? "asc" : "desc";
  const [items, total] = await Promise.all([
    prisma.chatConversation.findMany({
      where,
      include: listInclude,
      orderBy: [{ isPinned: "desc" }, { lastMessageAt: order }, { updatedAt: order }],
      skip: (page - 1) * pageSize,
      take: pageSize
    }),
    prisma.chatConversation.count({ where })
  ]);
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total
  };
}

export async function getAdminConversationProfile(conversationId: string): Promise<AdminConversationProfile | null> {
  await ensureChatSchema();
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: { customer: { select: { id: true, email: true, phone: true } } }
  });
  if (!conversation) return null;

  const orderWhere: Prisma.OrderWhereInput = {
    OR: [
      { userId: conversation.customerId },
      ...(conversation.customer.email ? [{ customerEmail: conversation.customer.email }] : []),
      ...(conversation.customer.phone ? [{ customerPhone: conversation.customer.phone }] : [])
    ]
  };
  const [orderCount, spend, latestOrders] = await Promise.all([
    prisma.order.count({ where: orderWhere }),
    prisma.order.aggregate({ where: orderWhere, _sum: { total: true } }),
    prisma.order.findMany({
      where: orderWhere,
      select: { id: true, orderNumber: true, status: true, paymentMethod: true, total: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  return {
    orderCount,
    lifetimeSpend: Number(spend._sum.total || 0),
    lastOrderAt: latestOrders[0]?.createdAt || null,
    latestOrders: latestOrders.map((order) => ({
      ...order,
      status: String(order.status),
      paymentMethod: String(order.paymentMethod),
      total: Number(order.total)
    }))
  };
}

export async function getAdminConversation(conversationId: string) {
  await ensureChatSchema();
  const existing = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: { customer: true }
  });
  if (!existing) return null;
  const now = new Date();
  await prisma.chatMessage.updateMany({
    where: { conversationId, senderRole: ChatSenderRole.CUSTOMER, isRead: false },
    data: { isRead: true, readAt: now, deliveredAt: now }
  });
  await prisma.chatConversation.update({
    where: { id: conversationId },
    data: { adminUnreadCount: 0 }
  });
  return prisma.chatConversation.findUnique({
    where: { id: conversationId },
    include: conversationInclude
  });
}

export async function sendAdminMessage(conversationId: string, admin: SessionUser, input: ChatMessageInput) {
  await ensureChatSchema();
  const body = cleanMessage(input.messageText);
  const productSnapshot = await buildProductSnapshot(input);
  if (!body && !input.attachmentUrl && !productSnapshot) throw new Error("Message, attachment, or product is required");
  const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return null;
  if (input.conversationId && input.conversationId !== conversationId) throw new ChatForbiddenError();
  const replyToId = await assertReplyTarget(conversationId, input.replyToId);
  if (input.clientMessageId) {
    const duplicate = await prisma.chatMessage.findUnique({ where: { clientMessageId: input.clientMessageId }, select: { conversationId: true } });
    if (duplicate) {
      if (duplicate.conversationId !== conversationId) throw new ChatForbiddenError();
      return prisma.chatConversation.findUniqueOrThrow({ where: { id: conversationId }, include: conversationInclude });
    }
  }
  const senderId = admin.id === "dev-admin" ? null : admin.id;
  const now = new Date();
  const type = messageTypeFor(input, productSnapshot);
  try {
    await prisma.$transaction([
      prisma.chatMessage.create({
      data: {
        clientMessageId: input.clientMessageId || null,
        conversationId,
        senderId,
        receiverId: conversation.customerId,
        senderRole: ChatSenderRole.ADMIN,
        messageType: type,
        messageText: body,
        attachmentUrl: input.attachmentUrl || null,
        attachmentName: input.attachmentName || null,
        attachmentType: input.attachmentType || null,
        voiceDuration: input.voiceDuration || null,
        voiceWaveform: input.voiceWaveform ? input.voiceWaveform as Prisma.InputJsonValue : undefined,
        replyToId,
        productId: productSnapshot?.id || null,
        productVariantId: productSnapshot?.variantId || null,
        productSnapshot: productSnapshot ? productSnapshot as Prisma.InputJsonValue : undefined,
        deliveredAt: now,
        isRead: false,
        createdAt: now
      }
      }),
      prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        adminId: senderId,
        lastMessage: messagePreview(body, input, productSnapshot),
        lastMessageAt: now,
        lastAdminMessageAt: now,
        status: conversation.status === ConversationStatus.NEW ? ConversationStatus.OPEN : conversation.status,
        isArchived: false,
        adminUnreadCount: 0,
        customerUnreadCount: { increment: 1 }
      }
      })
    ]);
  } catch (error) {
    if (!input.clientMessageId || !isUniqueConflict(error)) throw error;
    const duplicate = await prisma.chatMessage.findUnique({ where: { clientMessageId: input.clientMessageId }, select: { conversationId: true } });
    if (!duplicate || duplicate.conversationId !== conversationId) throw error;
  }
  return prisma.chatConversation.findUniqueOrThrow({ where: { id: conversationId }, include: conversationInclude });
}

async function mutateMessage(
  conversationId: string,
  messageId: string,
  actor: { id: string; role: "CUSTOMER" | "ADMIN" },
  action: ChatMessageAction
) {
  await ensureChatSchema();
  const message = await prisma.chatMessage.findFirst({
    where: { id: messageId, conversationId },
    select: {
      id: true,
      senderId: true,
      senderRole: true,
      createdAt: true,
      deletedAt: true,
      attachmentUrl: true
    }
  });
  if (!message) throw new ChatMessageActionError("Message not found", 404);

  const ownsMessage = actor.role === "CUSTOMER"
    ? message.senderRole === ChatSenderRole.CUSTOMER && message.senderId === actor.id
    : message.senderRole === ChatSenderRole.ADMIN;

  if (action.action === "edit") {
    if (!ownsMessage) throw new ChatForbiddenError();
    if (message.deletedAt) throw new ChatMessageActionError("Deleted messages cannot be edited");
    if (Date.now() - message.createdAt.getTime() > 15 * 60_000) {
      throw new ChatMessageActionError("Messages can be edited for 15 minutes after sending");
    }
    await prisma.chatMessage.update({
      where: { id: message.id },
      data: { messageText: cleanMessage(action.messageText), editedAt: new Date() }
    });
  } else if (action.action === "delete") {
    if (!ownsMessage) throw new ChatForbiddenError();
    if (!message.deletedAt) {
      await prisma.chatMessage.update({
        where: { id: message.id },
        data: {
          messageText: "",
          attachmentUrl: null,
          attachmentName: null,
          attachmentType: null,
          voiceDuration: null,
          voiceWaveform: Prisma.JsonNull,
          productId: null,
          productVariantId: null,
          productSnapshot: Prisma.JsonNull,
          isPinned: false,
          deletedAt: new Date()
        }
      });
      if (message.attachmentUrl?.includes(".public.blob.vercel-storage.com")) {
        await del(message.attachmentUrl).catch(() => undefined);
      }
    }
  } else {
    if (message.deletedAt) throw new ChatMessageActionError("Deleted messages cannot be pinned");
    await prisma.chatMessage.update({
      where: { id: message.id },
      data: { isPinned: action.isPinned }
    });
  }

  await refreshConversationSummary(conversationId);
  return prisma.chatConversation.findUniqueOrThrow({
    where: { id: conversationId },
    include: conversationInclude
  });
}

export async function updateCustomerMessage(customerId: string, messageId: string, action: ChatMessageAction) {
  const conversation = await ensureCustomerConversation(customerId);
  if (conversation.isBlocked) throw new ChatBlockedError();
  return mutateMessage(conversation.id, messageId, { id: customerId, role: "CUSTOMER" }, action);
}

export async function updateAdminMessage(conversationId: string, messageId: string, admin: SessionUser, action: ChatMessageAction) {
  const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { id: true } });
  if (!conversation) throw new ChatMessageActionError("Conversation not found", 404);
  return mutateMessage(conversationId, messageId, { id: admin.id, role: "ADMIN" }, action);
}

export async function updateAdminConversation(conversationId: string, update: AdminConversationUpdate) {
  await ensureChatSchema();
  const existing = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { id: true } });
  if (!existing) return null;
  return prisma.chatConversation.update({
    where: { id: conversationId },
    data: {
      ...(update.status !== undefined ? { status: update.status } : {}),
      ...(update.isPinned !== undefined ? { isPinned: update.isPinned } : {}),
      ...(update.isArchived !== undefined ? { isArchived: update.isArchived } : {}),
      ...(update.isBlocked !== undefined ? { isBlocked: update.isBlocked } : {}),
      ...(update.internalNotes !== undefined ? { internalNotes: update.internalNotes?.trim() || null } : {})
    },
    include: conversationInclude
  });
}

export function customerSessionPayload(user: Awaited<ReturnType<typeof ensureCustomerRecord>>) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    customerPublicId: user.customerPublicId,
    permissions: permissionsFor(user.role)
  };
}

export function conversationPayload<T extends { customerId: string }>(conversation: T) {
  return { ...conversation, userId: conversation.customerId };
}
