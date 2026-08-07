export type ChatSenderRole = "CUSTOMER" | "ADMIN";
export type ConversationStatus = "NEW" | "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";

export type ChatMessageDraft = {
  conversationId?: string;
  clientMessageId?: string;
  messageText: string;
  messageType?: "TEXT" | "IMAGE" | "VOICE" | "PRODUCT" | "SYSTEM";
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: string;
  voiceDuration?: number;
  voiceWaveform?: number[];
  replyToId?: string;
  productId?: string;
  productVariantId?: string | null;
};

export type ChatUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  customerPublicId?: string | null;
};

export type ChatMessage = {
  id: string;
  clientMessageId?: string | null;
  conversationId: string;
  senderId?: string | null;
  receiverId?: string | null;
  senderRole: ChatSenderRole;
  messageType?: "TEXT" | "IMAGE" | "VOICE" | "PRODUCT" | "SYSTEM";
  messageText: string;
  isRead: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  voiceDuration?: number | null;
  voiceWaveform?: number[] | null;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    senderRole: ChatSenderRole;
    messageType?: "TEXT" | "IMAGE" | "VOICE" | "PRODUCT" | "SYSTEM";
    messageText: string;
    attachmentName?: string | null;
    deletedAt?: string | null;
  } | null;
  isPinned?: boolean;
  editedAt?: string | null;
  deletedAt?: string | null;
  productId?: string | null;
  productVariantId?: string | null;
  productSnapshot?: {
    id: string;
    variantId?: string | null;
    name: string;
    slug: string;
    image: string;
    price: number;
    sku: string;
    variantName?: string | null;
    stock: number;
    brand: string;
    category: string;
  } | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
  sender?: ChatUser | null;
};

export type ChatMessageAction =
  | { action: "edit"; messageText: string }
  | { action: "delete" }
  | { action: "pin"; isPinned: boolean };

export type ChatConversation = {
  id: string;
  customerId: string;
  userId?: string;
  customer: ChatUser;
  admin?: ChatUser | null;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  customerUnreadCount: number;
  adminUnreadCount: number;
  status: ConversationStatus;
  isPinned: boolean;
  isArchived: boolean;
  isBlocked: boolean;
  internalNotes?: string | null;
  lastCustomerMessageAt?: string | null;
  lastAdminMessageAt?: string | null;
  messages?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type ChatCustomerProfile = {
  orderCount: number;
  lifetimeSpend: number;
  lastOrderAt?: string | null;
  latestOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentMethod: string;
    total: number;
    createdAt: string;
  }>;
};
