import { ConversationStatus } from "@prisma/client";
import { z } from "zod";

const allowedAttachment = /^(https:\/\/|data:(image\/(jpeg|png|webp)|application\/pdf);base64,)/i;
const audioAttachmentTypes = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"] as const;

export const chatMessageSchema = z.object({
  conversationId: z.string().trim().min(1).max(120).optional(),
  clientMessageId: z.string().uuid().optional(),
  messageText: z.string().max(4000, "Message is too long").default(""),
  messageType: z.enum(["TEXT", "IMAGE", "VOICE", "PRODUCT", "SYSTEM"]).optional().default("TEXT"),
  attachmentUrl: z.string()
    .max(1_050_000, "Attachment is too large")
    .refine((value) => allowedAttachment.test(value), "Unsupported attachment URL")
    .optional(),
  attachmentName: z.string().trim().min(1).max(180).optional(),
  attachmentType: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    ...audioAttachmentTypes
  ]).optional(),
  voiceDuration: z.coerce.number().int().min(1).max(180).optional(),
  voiceWaveform: z.array(z.coerce.number().int().min(4).max(100)).min(12).max(64).optional(),
  replyToId: z.string().trim().min(1).max(120).optional(),
  productId: z.string().trim().min(1).max(120).optional(),
  productVariantId: z.string().trim().min(1).max(120).optional()
}).superRefine((value, context) => {
  if (!value.messageText.trim() && !value.attachmentUrl && !value.productId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["messageText"], message: "Message or attachment is required" });
  }
  if (value.messageType === "PRODUCT" && !value.productId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["productId"], message: "Select a product to share" });
  }
  if (value.attachmentUrl && (!value.attachmentName || !value.attachmentType)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["attachmentUrl"], message: "Attachment details are required" });
  }
  const isAudioAttachment = Boolean(value.attachmentType && audioAttachmentTypes.includes(value.attachmentType as typeof audioAttachmentTypes[number]));
  if (value.messageType === "VOICE" || isAudioAttachment || value.voiceDuration) {
    if (!value.attachmentUrl || !isAudioAttachment) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["attachmentUrl"], message: "A valid audio recording is required" });
    }
    if (!value.voiceDuration) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["voiceDuration"], message: "Voice message duration is required" });
    }
    if (value.messageType !== "VOICE") {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["messageType"], message: "Audio attachments must be sent as voice messages" });
    }
  }
});

export const conversationUpdateSchema = z.object({
  status: z.nativeEnum(ConversationStatus).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  internalNotes: z.string().max(4000).nullable().optional()
}).refine((value) => Object.keys(value).length > 0, "No conversation changes supplied");

export const chatMessageActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("edit"),
    messageText: z.string().trim().min(1, "Message cannot be empty").max(4000, "Message is too long")
  }),
  z.object({ action: z.literal("delete") }),
  z.object({ action: z.literal("pin"), isPinned: z.boolean() })
]);
