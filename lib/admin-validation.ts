import { z } from "zod";

const productImageSourceSchema = z.string().trim().min(1).max(1_100_000).refine((value) => (
  (value.startsWith("/") && !value.startsWith("//")) ||
  /^https?:\/\//i.test(value) ||
  /^data:image\/(?:avif|jpeg|jpg|png|webp);base64,/i.test(value)
), "Use a valid product image URL or supported image upload");

export const productImageInputSchema = z.object({
  id: z.string().optional(),
  url: productImageSourceSchema,
  alt: z.string().optional(),
  isMain: z.boolean().default(false),
  sortOrder: z.number().int().default(0)
});

export const productSpecInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  value: z.string().min(1)
});

export const productVariantInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  price: z.coerce.number().min(0),
  compareAtPrice: z.coerce.number().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).default(0),
  wholesalePrice: z.coerce.number().min(0).optional().nullable(),
  minWholesaleQuantity: z.coerce.number().int().min(1).optional().nullable(),
  stock: z.coerce.number().int().default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  imageUrl: productImageSourceSchema.optional().nullable(),
  modelUrl: z.string().url().optional().nullable(),
  options: z.record(z.string(), z.string()).default({}),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

export const productInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  brandId: z.string().min(1),
  categoryId: z.string().min(1),
  description: z.string().min(1),
  shortDescription: z.string().optional().default(""),
  price: z.coerce.number().min(0),
  compareAtPrice: z.coerce.number().min(0).optional().nullable(),
  costPrice: z.coerce.number().min(0).default(0),
  dealerPrice: z.coerce.number().min(0).optional().nullable(),
  wholesalePrice: z.coerce.number().min(0).optional().nullable(),
  minWholesaleQuantity: z.coerce.number().int().min(1).default(1),
  stock: z.coerce.number().int().default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  weightKg: z.coerce.number().min(0).default(0),
  dimensions: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  returnPolicy: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  isHeavyItem: z.boolean().default(false),
  isBulky: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isActive: z.boolean().default(true),
  modelUrl: z.string().url().optional().nullable(),
  modelPosterUrl: z.string().url().optional().nullable(),
  images: z.array(productImageInputSchema).max(4, "A product can have up to 4 gallery images").default([]),
  specs: z.array(productSpecInputSchema).default([]),
  variants: z.array(productVariantInputSchema).max(100).default([])
}).superRefine((value, context) => {
  const imageCharacters = value.images.reduce((sum, image) => sum + image.url.length, 0) +
    value.variants.reduce((sum, variant) => sum + (variant.imageUrl?.length || 0), 0);
  if (imageCharacters > 3_600_000) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["images"],
      message: "Product images are too large. Re-upload them so they can be optimized."
    });
  }
  if (value.modelUrl && !/\.(glb|gltf)(\?.*)?$/i.test(value.modelUrl)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["modelUrl"],
      message: "3D model URL must point to a .glb or .gltf file."
    });
  }
});

export const categoryInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  banner: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true)
});

export const brandInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  logo: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  isActive: z.boolean().default(true)
});

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "MANUAL_ADJUSTMENT"]),
  quantity: z.coerce.number().int(),
  reason: z.string().min(2)
});

export const couponInputSchema = z.object({
  code: z.string().min(2),
  description: z.string().optional().nullable(),
  percentOff: z.coerce.number().int().min(0).max(100).optional().nullable(),
  amountOff: z.coerce.number().min(0).optional().nullable(),
  maxDiscount: z.coerce.number().min(0).optional().nullable(),
  freeDelivery: z.boolean().default(false),
  minOrderAmount: z.coerce.number().min(0).default(0),
  usageLimit: z.coerce.number().int().min(1).optional().nullable(),
  perCustomerLimit: z.coerce.number().int().min(1).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  startsAt: z.coerce.date().default(() => new Date()),
  expiresAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true)
});

export const bannerInputSchema = z.object({
  title: z.string().min(2).max(80),
  subtitle: z.string().max(180).optional().nullable(),
  image: z.string().min(1),
  mobileImage: z.string().optional().nullable(),
  type: z.string().min(2).max(24).default("HERO"),
  href: z.string().max(300).optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  startsAt: z.coerce.date().default(() => new Date()),
  endsAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true)
});

export const roomPackageItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  quantity: z.coerce.number().int().min(1).max(999),
  unit: z.string().trim().min(1).max(30).default("pcs"),
  note: z.string().trim().max(160).optional().nullable()
});

export const roomPackageInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120),
  roomType: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(1200),
  image: z.string().min(1).optional().nullable(),
  items: z.array(roomPackageItemSchema).min(1).max(60),
  price: z.coerce.number().min(0).max(99_999_999),
  compareAtPrice: z.coerce.number().min(0).max(99_999_999).optional().nullable(),
  durationDays: z.coerce.number().int().min(1).max(90).default(1),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0)
});

export const roomServiceAdminUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "SITE_VISIT", "QUOTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
  estimatedTotal: z.coerce.number().min(0).max(99_999_999).optional().nullable(),
  adminNote: z.string().trim().max(2000).optional().nullable()
});

export const supportTicketSchema = z.object({
  userId: z.string().optional().nullable(),
  orderId: z.string().optional().nullable(),
  type: z.string().min(2),
  status: z.string().min(2).default("OPEN"),
  title: z.string().min(2),
  description: z.string().min(2),
  internalNotes: z.string().optional().nullable(),
  evidenceUrl: z.string().optional().nullable()
});
