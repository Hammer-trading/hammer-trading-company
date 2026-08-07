import { z } from "zod";

export const roomServiceRequestSchema = z.object({
  packageId: z.string().trim().min(1).optional().nullable(),
  customerName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(7).max(24),
  email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
  address: z.string().trim().min(8).max(500),
  city: z.string().trim().min(2).max(80),
  roomType: z.string().trim().min(2).max(80),
  roomSize: z.string().trim().max(80).optional().nullable(),
  preferredDate: z.coerce.date().optional().nullable(),
  note: z.string().trim().max(1200).optional().nullable()
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8).max(128),
  adminOnly: z.boolean().optional().default(false)
});

export const customerRegistrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z.string().trim().min(7).max(24).optional().or(z.literal("")),
  password: z.string().min(8).max(128)
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),
  confirmPassword: z.string().min(8).max(128)
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(128)
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),
  confirmPassword: z.string().min(8).max(128)
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const checkoutSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerPhone: z.string().min(10),
  province: z.string().min(2),
  city: z.string().min(2),
  area: z.string().optional(),
  addressLine: z.string().min(8),
  nearestLandmark: z.string().optional(),
  paymentMethod: z.enum(["COD", "BANK_TRANSFER"]),
  couponCode: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional().nullable(),
    packageId: z.string().optional().nullable(),
    quantity: z.number().int().positive()
  })).min(1)
});

export const quoteRequestItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive().max(100000),
  requestedTargetPrice: z.coerce.number().min(0).max(99_999_999).optional().nullable()
});

export const quoteRequestSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().min(2).optional(),
  quantity: z.coerce.number().int().positive().max(100000).optional(),
  items: z.array(quoteRequestItemSchema).min(1).max(100).optional(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerEmail: z.string().email().optional().or(z.literal("")),
  city: z.string().min(2),
  note: z.string().max(2000).optional().nullable()
}).superRefine((value, context) => {
  if (!value.items?.length && (!value.productName || !value.quantity)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Add at least one product" });
  }
});

export const quoteAdminUpdateSchema = z.object({
  status: z.enum(["PENDING", "REPLIED", "APPROVED", "REJECTED", "CONVERTED"]).optional(),
  adminReply: z.string().max(2000).optional().nullable(),
  quotedPrice: z.coerce.number().min(0).optional().nullable(),
  discountTotal: z.coerce.number().min(0).max(99_999_999).optional(),
  deliveryCharge: z.coerce.number().min(0).max(99_999_999).optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  terms: z.string().trim().max(4000).optional().nullable(),
  items: z.array(z.object({
    id: z.string().min(1),
    quotedUnitPrice: z.coerce.number().min(0).max(99_999_999)
  })).min(1).max(100).optional()
});

export const deliveryRuleSchema = z.object({
  name: z.string().min(2),
  city: z.string().optional(),
  area: z.string().optional(),
  zone: z.string().optional(),
  minWeightKg: z.coerce.number().optional(),
  maxWeightKg: z.coerce.number().optional(),
  minQuantity: z.coerce.number().int().optional(),
  maxQuantity: z.coerce.number().int().optional(),
  baseCharge: z.coerce.number().min(0),
  standardCharge: z.coerce.number().min(0).default(0),
  heavyItemCharge: z.coerce.number().min(0).default(0),
  bulkyItemCharge: z.coerce.number().min(0).default(0),
  sameDayCharge: z.coerce.number().min(0).default(0),
  storePickupEnabled: z.coerce.boolean().default(false),
  standardDeliveryEnabled: z.coerce.boolean().default(true),
  sameDayDeliveryEnabled: z.coerce.boolean().default(false),
  quotationRequiredForBulk: z.coerce.boolean().default(false),
  freeDeliveryThreshold: z.coerce.number().optional(),
  estimatedDaysMin: z.coerce.number().int().min(0),
  estimatedDaysMax: z.coerce.number().int().min(0),
  isActive: z.coerce.boolean().default(true)
});

export const otpSchema = z.object({
  token: z.string().min(16),
  otp: z.string().min(4).max(8),
  rating: z.coerce.number().min(1).max(5).optional(),
  review: z.string().max(1000).optional(),
  issue: z.string().max(1000).optional(),
  gps: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal(""))
});
