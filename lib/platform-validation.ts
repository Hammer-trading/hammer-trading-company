import { z } from "zod";

const slugSchema = z.string().trim().min(2).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens");
const optionalId = z.string().trim().min(1).optional().nullable().or(z.literal(""));
const optionalAsset = z.string().trim().max(5_500_000).optional().nullable().or(z.literal(""));
const stringList = z.array(z.string().trim().min(1).max(180)).max(100).default([]);

export const platformCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: slugSchema,
  description: z.string().trim().max(1200).optional().nullable(),
  image: optionalAsset,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true)
});

export const homeServiceSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: slugSchema,
  categoryId: optionalId,
  shortDescription: z.string().trim().max(300).default(""),
  description: z.string().trim().min(10).max(12_000),
  serviceMode: z.enum(["PRODUCT_INSTALLATION", "INSTALLATION_ONLY", "INSPECTION_REPAIR"]).default("PRODUCT_INSTALLATION"),
  siteVisitRequired: z.boolean().default(true),
  siteVisitFee: z.coerce.number().min(0).max(99_999_999).default(0),
  laborPricingNote: z.string().trim().max(1200).optional().nullable(),
  startingPrice: z.coerce.number().min(0).max(99_999_999).optional().nullable(),
  fixedPrice: z.coerce.number().min(0).max(99_999_999).optional().nullable(),
  requestQuoteEnabled: z.boolean().default(true),
  bookingEnabled: z.boolean().default(true),
  whatsappEnabled: z.boolean().default(true),
  coverImage: optionalAsset,
  gallery: z.array(z.string().min(1).max(5_500_000)).max(30).default([]),
  beforeAfter: z.array(z.object({ before: z.string().min(1).max(5_500_000), after: z.string().min(1).max(5_500_000), label: z.string().max(120).optional() })).max(20).default([]),
  videos: z.array(z.string().min(1).max(5_500_000)).max(20).default([]),
  estimatedCompletionTime: z.string().trim().max(120).optional().nullable(),
  availableDays: stringList,
  availableTimeSlots: stringList,
  cities: stringList,
  areas: stringList,
  warrantyInformation: z.string().trim().max(1200).optional().nullable(),
  includedWork: stringList,
  excludedWork: stringList,
  requiredMaterials: stringList,
  productIds: z.array(z.string().min(1)).max(100).default([]),
  isFeatured: z.boolean().default(false),
  showOnHomepage: z.boolean().default(false),
  isActive: z.boolean().default(true),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  seoTitle: z.string().trim().max(180).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
  imageAlt: z.string().trim().max(180).optional().nullable()
});

export const packageItemSchema = z.object({
  productId: z.string().min(1),
  variantId: optionalId,
  quantity: z.coerce.number().int().min(1).max(999),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
});

export const productPackageSchema = z.object({
  name: z.string().trim().min(2).max(140),
  slug: slugSchema,
  sku: z.string().trim().min(2).max(100),
  categoryId: optionalId,
  coverImage: optionalAsset,
  gallery: z.array(z.string().min(1).max(5_500_000)).max(30).default([]),
  shortDescription: z.string().trim().max(300).default(""),
  description: z.string().trim().min(10).max(12_000),
  roomType: z.string().trim().min(2).max(100).default("Complete room"),
  tier: z.enum(["ESSENTIAL", "STANDARD", "PREMIUM", "CUSTOM"]).default("STANDARD"),
  coverageSummary: z.string().trim().max(1200).optional().nullable(),
  customizationNotes: z.string().trim().max(1200).optional().nullable(),
  deliveryInformation: z.string().trim().max(1200).optional().nullable(),
  installationIncluded: z.literal(false).default(false),
  fixedDiscount: z.coerce.number().min(0).max(99_999_999).default(0),
  percentageDiscount: z.coerce.number().int().min(0).max(100).default(0),
  badge: z.string().trim().max(80).optional().nullable(),
  installationServiceId: optionalId,
  isFeatured: z.boolean().default(false),
  showOnHomepage: z.boolean().default(false),
  isActive: z.boolean().default(true),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  seoTitle: z.string().trim().max(180).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
  imageAlt: z.string().trim().max(180).optional().nullable(),
  items: z.array(packageItemSchema).min(1).max(60)
});

export const projectSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: slugSchema,
  categoryId: optionalId,
  serviceId: optionalId,
  customerOrCompany: z.string().trim().max(160).optional().nullable(),
  location: z.string().trim().max(180).optional().nullable(),
  shortDescription: z.string().trim().max(300).default(""),
  description: z.string().trim().min(10).max(20_000),
  progressPercent: z.coerce.number().int().min(0).max(100).default(0),
  isCustomerNamePublic: z.boolean().default(false),
  testimonial: z.string().trim().max(2400).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  expectedCompletionDate: z.coerce.date().optional().nullable(),
  actualCompletionDate: z.coerce.date().optional().nullable(),
  projectStatus: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "ON_HOLD", "CANCELLED"]).default("UPCOMING"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  showOnHomepage: z.boolean().default(false),
  coverImage: optionalAsset,
  videos: z.array(z.string().min(1).max(5_500_000)).max(20).default([]),
  seoTitle: z.string().trim().max(180).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
  imageAlt: z.string().trim().max(180).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  productIds: z.array(z.string().min(1)).max(100).default([]),
  productItems: z.array(z.object({
    productId: z.string().min(1),
    variantId: optionalId,
    quantity: z.coerce.number().int().min(1).max(999).default(1),
    note: z.string().trim().max(500).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
  })).max(100).default([]),
  media: z.array(z.object({
    type: z.enum(["GALLERY", "BEFORE", "AFTER", "VIDEO"]).default("GALLERY"),
    url: z.string().min(1).max(5_500_000),
    mediaAssetId: optionalId,
    altText: z.string().max(180).optional().nullable(),
    caption: z.string().max(500).optional().nullable(),
    posterUrl: optionalAsset,
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
  })).max(100).default([]),
  updates: z.array(z.object({
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(2400).optional().nullable(),
    progressPercent: z.coerce.number().int().min(0).max(100).optional().nullable(),
    milestone: z.string().trim().max(160).optional().nullable(),
    media: z.array(z.string().min(1).max(5_500_000)).max(12).default([]),
    isPublic: z.boolean().default(true),
    occurredAt: z.coerce.date(),
    sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
  })).max(100).default([])
});

const aboutStatSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(40)
});

const aboutMilestoneSchema = z.object({
  year: z.string().trim().min(1).max(20),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(500).optional().default("")
});

export const aboutPageSchema = z.object({
  slug: slugSchema.default("about"),
  eyebrow: z.string().trim().min(2).max(100).default("Hammer Trading Company"),
  heroTitle: z.string().trim().min(2).max(180),
  heroSubtitle: z.string().trim().max(600).default(""),
  heroImage: optionalAsset,
  heroVideo: optionalAsset,
  introTitle: z.string().trim().min(2).max(180),
  introBody: z.string().trim().min(10).max(12_000),
  mission: z.string().trim().max(4000).default(""),
  vision: z.string().trim().max(4000).default(""),
  values: stringList,
  serviceAreas: stringList,
  stats: z.array(aboutStatSchema).max(12).default([]),
  milestones: z.array(aboutMilestoneSchema).max(40).default([]),
  gallery: z.array(z.string().min(1).max(5_500_000)).max(30).default([]),
  ctaTitle: z.string().trim().max(180).optional().nullable(),
  ctaText: z.string().trim().max(1000).optional().nullable(),
  ctaLabel: z.string().trim().max(80).optional().nullable(),
  ctaHref: z.string().trim().max(500).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  seoTitle: z.string().trim().max(180).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable()
});

export const mediaAssetSchema = z.object({
  kind: z.enum(["IMAGE", "VIDEO", "PDF", "DOCUMENT", "MODEL"]),
  name: z.string().trim().min(2).max(180),
  url: z.string().trim().min(1).max(5_500_000),
  mimeType: z.string().trim().max(120).optional().nullable(),
  sizeBytes: z.coerce.number().int().min(0).max(250_000_000).optional().nullable(),
  altText: z.string().trim().max(180).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({})
}).superRefine((value, context) => {
  const size = Number(value.sizeBytes || 0);
  const max = value.kind === "VIDEO" ? 250_000_000 : value.kind === "IMAGE" ? 12_000_000 : value.kind === "MODEL" ? 20_000_000 : 25_000_000;
  if (size > max) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["sizeBytes"], message: `${value.kind.toLowerCase()} exceeds the upload limit` });
  }
});

export const navigationItemSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: z.string().trim().min(1).max(500).refine((value) => value.startsWith("/") || value.startsWith("https://"), "Use an internal path or HTTPS URL"),
  location: z.enum(["HEADER", "FOOTER_SHOP", "FOOTER_HELP", "FOOTER_LEGAL"]).default("HEADER"),
  icon: z.string().trim().max(80).optional().nullable(),
  parentId: optionalId,
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  desktopVisible: z.boolean().default(true),
  mobileVisible: z.boolean().default(true),
  openInNewTab: z.boolean().default(false)
});

export const homepageSectionSchema = z.object({
  key: slugSchema,
  heading: z.string().trim().min(1).max(180),
  subtitle: z.string().trim().max(240).optional().nullable(),
  description: z.string().trim().max(2400).optional().nullable(),
  backgroundImage: optionalAsset,
  backgroundVideo: optionalAsset,
  buttonText: z.string().trim().max(80).optional().nullable(),
  buttonLink: z.string().trim().max(500).optional().nullable(),
  layout: z.enum(["DEFAULT", "GRID", "CAROUSEL", "EDITORIAL", "SPLIT"]).default("DEFAULT"),
  configuration: z.record(z.string(), z.unknown()).default({}),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  desktopVisible: z.boolean().default(true),
  mobileVisible: z.boolean().default(true),
  animationEnabled: z.boolean().default(true),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED")
});

export const serviceBookingSchema = z.object({
  serviceId: z.string().min(1),
  packageId: optionalId,
  customerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(24),
  email: z.string().trim().email().max(160).optional().nullable().or(z.literal("")),
  address: z.string().trim().min(8).max(600),
  city: z.string().trim().min(2).max(100),
  area: z.string().trim().max(100).optional().nullable(),
  preferredDate: z.coerce.date().optional().nullable(),
  preferredTime: z.string().trim().max(80).optional().nullable(),
  projectDetails: z.string().trim().max(4000).optional().nullable(),
  attachments: z.array(z.string().min(1).max(5_500_000)).max(10).default([]),
  customerNote: z.string().trim().max(2000).optional().nullable()
});

export const serviceBookingItemInputSchema = z.object({
  productId: z.string().min(1),
  variantId: optionalId,
  quantity: z.coerce.number().int().min(1).max(999),
  unitPrice: z.coerce.number().min(0).max(99_999_999),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0)
});

export const serviceBookingUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "INSPECTION_REQUIRED", "QUOTATION_SENT", "APPROVED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  quotationAmount: z.coerce.number().min(0).max(99_999_999).optional().nullable(),
  serviceCharge: z.coerce.number().min(0).max(99_999_999).optional(),
  internalNote: z.string().trim().max(4000).optional().nullable(),
  items: z.array(serviceBookingItemInputSchema).min(1).max(100).optional()
});
