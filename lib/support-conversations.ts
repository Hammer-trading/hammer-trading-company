import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SupportSender = "CUSTOMER" | "ADMIN";

export type SupportMessageRow = {
  id: string;
  conversationId: string;
  senderType: SupportSender;
  senderName: string;
  body: string;
  attachmentUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type SupportConversation = {
  id: string;
  customerPublicId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  orderNumber?: string | null;
  type: string;
  status: string;
  title: string;
  description: string;
  unreadByAdmin: number;
  unreadByCustomer: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessageRow[];
};

const storePath = path.join(process.cwd(), "data", "support-conversations.json");

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function ensureStore() {
  await mkdir(path.dirname(storePath), { recursive: true });
}

async function writeConversations(conversations: SupportConversation[]) {
  await ensureStore();
  await writeFile(storePath, JSON.stringify(conversations, null, 2), "utf8");
}

export async function readSupportConversations() {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SupportConversation[]) : [];
  } catch {
    return [];
  }
}

export async function getCustomerConversations(customerPublicId: string) {
  const conversations = await readSupportConversations();
  return conversations
    .filter((conversation) => conversation.customerPublicId === customerPublicId)
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export async function getSupportConversation(conversationId: string) {
  const conversations = await readSupportConversations();
  return conversations.find((conversation) => conversation.id === conversationId) || null;
}

export async function createSupportConversation(input: {
  customerPublicId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  orderNumber?: string | null;
  type?: string;
  title: string;
  message: string;
}) {
  const now = new Date().toISOString();
  const conversationId = id("conv");
  const message: SupportMessageRow = {
    id: id("msg"),
    conversationId,
    senderType: "CUSTOMER",
    senderName: input.customerName,
    body: input.message,
    createdAt: now
  };
  const conversation: SupportConversation = {
    id: conversationId,
    customerPublicId: input.customerPublicId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail || null,
    orderNumber: input.orderNumber || null,
    type: input.type || "CHAT",
    status: "OPEN",
    title: input.title,
    description: input.message,
    unreadByAdmin: 1,
    unreadByCustomer: 0,
    lastMessageAt: now,
    createdAt: now,
    updatedAt: now,
    messages: [message]
  };
  const conversations = await readSupportConversations();
  await writeConversations([conversation, ...conversations]);
  return conversation;
}

export async function addSupportMessage(conversationId: string, input: { senderType: SupportSender; senderName: string; body: string; attachmentUrl?: string | null }) {
  const conversations = await readSupportConversations();
  const index = conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index === -1) return null;
  const now = new Date().toISOString();
  const message: SupportMessageRow = {
    id: id("msg"),
    conversationId,
    senderType: input.senderType,
    senderName: input.senderName,
    body: input.body,
    attachmentUrl: input.attachmentUrl || null,
    createdAt: now
  };
  conversations[index] = {
    ...conversations[index],
    status: conversations[index].status === "CLOSED" ? "OPEN" : conversations[index].status,
    unreadByAdmin: conversations[index].unreadByAdmin + (input.senderType === "CUSTOMER" ? 1 : 0),
    unreadByCustomer: conversations[index].unreadByCustomer + (input.senderType === "ADMIN" ? 1 : 0),
    lastMessageAt: now,
    updatedAt: now,
    messages: [...conversations[index].messages, message]
  };
  await writeConversations(conversations);
  return { conversation: conversations[index], message };
}

export async function updateSupportConversation(conversationId: string, patch: Partial<Pick<SupportConversation, "status" | "unreadByAdmin" | "unreadByCustomer">>) {
  const conversations = await readSupportConversations();
  const index = conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index === -1) return null;
  conversations[index] = { ...conversations[index], ...patch, updatedAt: new Date().toISOString() };
  await writeConversations(conversations);
  return conversations[index];
}
