import { Permission, Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  aboutPageSchema,
  homeServiceSchema,
  homepageSectionSchema,
  mediaAssetSchema,
  navigationItemSchema,
  platformCategorySchema,
  productPackageSchema,
  projectSchema
} from "@/lib/platform-validation";

export const platformResources = [
  "services",
  "service-categories",
  "packages",
  "package-categories",
  "projects",
  "project-categories",
  "about",
  "media",
  "navigation",
  "sections"
] as const;

export type PlatformResource = (typeof platformResources)[number];

export function isPlatformResource(value: string): value is PlatformResource {
  return (platformResources as readonly string[]).includes(value);
}

export function platformPermission(resource: PlatformResource): Permission {
  if (resource === "services" || resource === "service-categories") return "SERVICES_MANAGE";
  if (resource === "packages" || resource === "package-categories") return "PACKAGES_MANAGE";
  if (resource === "projects" || resource === "project-categories") return "PROJECTS_MANAGE";
  if (resource === "media") return "MEDIA_MANAGE";
  return "CONTENT_MANAGE";
}

export function parsePlatformPayload(resource: PlatformResource, payload: unknown) {
  if (resource === "services") return homeServiceSchema.safeParse(payload);
  if (resource === "packages") return productPackageSchema.safeParse(payload);
  if (resource === "projects") return projectSchema.safeParse(payload);
  if (resource === "about") return aboutPageSchema.safeParse(payload);
  if (resource === "media") return mediaAssetSchema.safeParse(payload);
  if (resource === "navigation") return navigationItemSchema.safeParse(payload);
  if (resource === "sections") return homepageSectionSchema.safeParse(payload);
  return platformCategorySchema.safeParse(payload);
}

function textSearch(query: string) {
  return query ? { contains: query, mode: "insensitive" as const } : undefined;
}

export async function listPlatformResource(resource: PlatformResource, query = "") {
  const q = query.trim();
  if (resource === "services") return prisma.homeService.findMany({
    where: q ? { OR: [{ name: textSearch(q) }, { description: textSearch(q) }] } : undefined,
    include: { category: true, products: { include: { product: { select: { id: true, name: true, sku: true } } }, orderBy: { sortOrder: "asc" } }, _count: { select: { bookings: true, packages: true, projects: true } } },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }]
  });
  if (resource === "service-categories") return prisma.serviceCategory.findMany({ where: q ? { name: textSearch(q) } : undefined, include: { _count: { select: { services: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  if (resource === "packages") return prisma.productPackage.findMany({
    where: q ? { OR: [{ name: textSearch(q) }, { sku: textSearch(q) }] } : undefined,
    include: { category: true, installationService: { select: { id: true, name: true } }, items: { include: { product: { select: { id: true, name: true, sku: true, price: true, stock: true } }, variant: { select: { id: true, title: true, sku: true, price: true, stock: true, options: true } } }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }]
  });
  if (resource === "package-categories") return prisma.packageCategory.findMany({ where: q ? { name: textSearch(q) } : undefined, include: { _count: { select: { packages: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  if (resource === "projects") return prisma.project.findMany({
    where: q ? { OR: [{ title: textSearch(q) }, { description: textSearch(q) }, { location: textSearch(q) }] } : undefined,
    include: {
      category: true,
      service: { select: { id: true, name: true } },
      media: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" } },
      updates: { orderBy: [{ occurredAt: "desc" }, { sortOrder: "asc" }] },
      products: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
          variant: { select: { id: true, title: true, sku: true, options: true } }
        },
        orderBy: { sortOrder: "asc" }
      }
    },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }]
  });
  if (resource === "about") return prisma.aboutPage.findMany({
    where: q ? { OR: [{ heroTitle: textSearch(q) }, { introTitle: textSearch(q) }, { introBody: textSearch(q) }] } : undefined,
    orderBy: { updatedAt: "desc" }
  });
  if (resource === "project-categories") return prisma.projectCategory.findMany({ where: q ? { name: textSearch(q) } : undefined, include: { _count: { select: { projects: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  if (resource === "media") return prisma.mediaAsset.findMany({
    where: q ? { OR: [{ name: textSearch(q) }, { altText: textSearch(q) }] } : undefined,
    include: { _count: { select: { projectMedia: true } } },
    orderBy: { createdAt: "desc" },
    take: 250
  });
  if (resource === "navigation") return prisma.navigationItem.findMany({ where: q ? { label: textSearch(q) } : undefined, include: { children: { orderBy: { sortOrder: "asc" } } }, orderBy: [{ location: "asc" }, { sortOrder: "asc" }] });
  return prisma.homepageSection.findMany({ where: q ? { OR: [{ heading: textSearch(q) }, { key: textSearch(q) }] } : undefined, orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] });
}

type PackagePayload = z.infer<typeof productPackageSchema>;

async function calculatePackage(payload: PackagePayload) {
  const productIds = Array.from(new Set(payload.items.map((item) => item.productId)));
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, isActive: true }, include: { variants: true } });
  if (products.length !== productIds.length) throw new Error("One or more package products are unavailable");
  let originalPrice = 0;
  for (const item of payload.items) {
    const product = products.find((candidate) => candidate.id === item.productId);
    const variant = item.variantId ? product?.variants.find((candidate) => candidate.id === item.variantId && candidate.isActive) : null;
    if (!product || (item.variantId && !variant)) throw new Error("A selected package variant is unavailable");
    originalPrice += Number(variant?.price ?? product.price) * item.quantity;
  }
  const percentageAmount = originalPrice * (payload.percentageDiscount / 100);
  const finalPrice = Math.max(0, originalPrice - Number(payload.fixedDiscount) - percentageAmount);
  return { originalPrice, finalPrice };
}

function nullable(value: string | null | undefined) {
  return value || null;
}

export async function createPlatformResource(resource: PlatformResource, data: Record<string, unknown>, actorId: string | null) {
  if (resource === "services") {
    const payload = homeServiceSchema.parse(data);
    const { productIds, ...service } = payload;
    return prisma.homeService.create({ data: { ...service, categoryId: nullable(service.categoryId), coverImage: nullable(service.coverImage), products: { create: productIds.map((productId, sortOrder) => ({ productId, sortOrder })) } }, include: { category: true, products: { include: { product: true }, orderBy: { sortOrder: "asc" } } } });
  }
  if (resource === "packages") {
    const payload = productPackageSchema.parse(data);
    const { items, ...packageData } = payload;
    const pricing = await calculatePackage(payload);
    return prisma.productPackage.create({ data: { ...packageData, ...pricing, categoryId: nullable(packageData.categoryId), installationServiceId: nullable(packageData.installationServiceId), coverImage: nullable(packageData.coverImage), items: { create: items.map((item) => ({ ...item, variantId: nullable(item.variantId) })) } }, include: { items: { include: { product: true, variant: true } } } });
  }
  if (resource === "projects") {
    const payload = projectSchema.parse(data);
    const { media, productIds, productItems, updates, ...project } = payload;
    const lines = productItems.length
      ? productItems
      : productIds.map((productId, sortOrder) => ({ productId, variantId: null, quantity: 1, note: null, sortOrder }));
    return prisma.project.create({
      data: {
        ...project,
        categoryId: nullable(project.categoryId),
        serviceId: nullable(project.serviceId),
        coverImage: nullable(project.coverImage),
        media: { create: media.map((entry) => ({ ...entry, mediaAssetId: nullable(entry.mediaAssetId), posterUrl: nullable(entry.posterUrl) })) },
        updates: { create: updates.map((entry) => ({ ...entry, media: entry.media as Prisma.InputJsonValue })) },
        products: { create: lines.map((entry) => ({ ...entry, variantId: nullable(entry.variantId), note: nullable(entry.note) })) }
      },
      include: { media: true, updates: true, products: { include: { product: true, variant: true } } }
    });
  }
  if (resource === "about") {
    const payload = aboutPageSchema.parse(data);
    const existing = await prisma.aboutPage.findUnique({ where: { slug: payload.slug } });
    if (existing) throw new Error("An About page with this slug already exists");
    return prisma.aboutPage.create({
      data: {
        ...payload,
        heroImage: nullable(payload.heroImage),
        heroVideo: nullable(payload.heroVideo),
        stats: payload.stats as Prisma.InputJsonValue,
        milestones: payload.milestones as Prisma.InputJsonValue,
        gallery: payload.gallery as Prisma.InputJsonValue
      }
    });
  }
  if (resource === "media") {
    const payload = mediaAssetSchema.parse(data);
    return prisma.mediaAsset.create({ data: { ...payload, metadata: payload.metadata as Prisma.InputJsonValue, uploadedById: actorId } });
  }
  if (resource === "navigation") {
    const payload = navigationItemSchema.parse(data);
    return prisma.navigationItem.create({ data: { ...payload, parentId: nullable(payload.parentId) } });
  }
  if (resource === "sections") {
    const payload = homepageSectionSchema.parse(data);
    return prisma.homepageSection.create({ data: { ...payload, configuration: payload.configuration as Prisma.InputJsonValue } });
  }
  const payload = platformCategorySchema.parse(data);
  if (resource === "service-categories") return prisma.serviceCategory.create({ data: { ...payload, image: nullable(payload.image) } });
  if (resource === "package-categories") return prisma.packageCategory.create({ data: { ...payload, image: nullable(payload.image) } });
  return prisma.projectCategory.create({ data: payload });
}

export async function updatePlatformResource(resource: PlatformResource, id: string, data: Record<string, unknown>) {
  if (resource === "services") {
    const payload = homeServiceSchema.parse(data);
    const { productIds, ...service } = payload;
    return prisma.$transaction(async (tx) => {
      await tx.serviceProduct.deleteMany({ where: { serviceId: id } });
      return tx.homeService.update({ where: { id }, data: { ...service, categoryId: nullable(service.categoryId), coverImage: nullable(service.coverImage), products: { create: productIds.map((productId, sortOrder) => ({ productId, sortOrder })) } }, include: { category: true, products: { include: { product: true }, orderBy: { sortOrder: "asc" } } } });
    });
  }
  if (resource === "packages") {
    const payload = productPackageSchema.parse(data);
    const { items, ...packageData } = payload;
    const pricing = await calculatePackage(payload);
    return prisma.$transaction(async (tx) => {
      const existing = await tx.productPackage.findUnique({ where: { id }, select: { legacyRoomPackageId: true, legacyItems: true, migrationStatus: true } });
      const legacyItemCount = Array.isArray(existing?.legacyItems) ? existing.legacyItems.length : 0;
      const migrationStatus = existing?.legacyRoomPackageId
        ? legacyItemCount === 0 || items.length >= legacyItemCount ? "MAPPED" : items.length ? "PARTIAL" : "NEEDS_MAPPING"
        : existing?.migrationStatus;
      await tx.packageItem.deleteMany({ where: { packageId: id } });
      return tx.productPackage.update({ where: { id }, data: { ...packageData, ...pricing, migrationStatus, categoryId: nullable(packageData.categoryId), installationServiceId: nullable(packageData.installationServiceId), coverImage: nullable(packageData.coverImage), items: { create: items.map((item) => ({ ...item, variantId: nullable(item.variantId) })) } }, include: { items: { include: { product: true, variant: true } } } });
    });
  }
  if (resource === "projects") {
    const payload = projectSchema.parse(data);
    const { media, productIds, productItems, updates, ...project } = payload;
    const lines = productItems.length
      ? productItems
      : productIds.map((productId, sortOrder) => ({ productId, variantId: null, quantity: 1, note: null, sortOrder }));
    return prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.projectMedia.deleteMany({ where: { projectId: id } }),
        tx.projectProduct.deleteMany({ where: { projectId: id } }),
        tx.projectUpdate.deleteMany({ where: { projectId: id } })
      ]);
      return tx.project.update({
        where: { id },
        data: {
          ...project,
          categoryId: nullable(project.categoryId),
          serviceId: nullable(project.serviceId),
          coverImage: nullable(project.coverImage),
          media: { create: media.map((entry) => ({ ...entry, mediaAssetId: nullable(entry.mediaAssetId), posterUrl: nullable(entry.posterUrl) })) },
          updates: { create: updates.map((entry) => ({ ...entry, media: entry.media as Prisma.InputJsonValue })) },
          products: { create: lines.map((entry) => ({ ...entry, variantId: nullable(entry.variantId), note: nullable(entry.note) })) }
        },
        include: { media: true, updates: true, products: { include: { product: true, variant: true } } }
      });
    });
  }
  if (resource === "about") {
    const payload = aboutPageSchema.parse(data);
    return prisma.aboutPage.update({
      where: { id },
      data: {
        ...payload,
        heroImage: nullable(payload.heroImage),
        heroVideo: nullable(payload.heroVideo),
        stats: payload.stats as Prisma.InputJsonValue,
        milestones: payload.milestones as Prisma.InputJsonValue,
        gallery: payload.gallery as Prisma.InputJsonValue
      }
    });
  }
  if (resource === "media") {
    const payload = mediaAssetSchema.parse(data);
    return prisma.mediaAsset.update({ where: { id }, data: { ...payload, metadata: payload.metadata as Prisma.InputJsonValue } });
  }
  if (resource === "navigation") {
    const payload = navigationItemSchema.parse(data);
    if (payload.parentId === id) throw new Error("A navigation item cannot be its own parent");
    return prisma.navigationItem.update({ where: { id }, data: { ...payload, parentId: nullable(payload.parentId) } });
  }
  if (resource === "sections") {
    const payload = homepageSectionSchema.parse(data);
    return prisma.homepageSection.update({ where: { id }, data: { ...payload, configuration: payload.configuration as Prisma.InputJsonValue } });
  }
  const payload = platformCategorySchema.parse(data);
  if (resource === "service-categories") return prisma.serviceCategory.update({ where: { id }, data: { ...payload, image: nullable(payload.image) } });
  if (resource === "package-categories") return prisma.packageCategory.update({ where: { id }, data: { ...payload, image: nullable(payload.image) } });
  return prisma.projectCategory.update({ where: { id }, data: payload });
}

export async function deletePlatformResource(resource: PlatformResource, id: string) {
  if (resource === "services") {
    const bookingCount = await prisma.serviceBooking.count({ where: { serviceId: id } });
    return bookingCount
      ? prisma.homeService.update({ where: { id }, data: { status: "ARCHIVED", isActive: false, showOnHomepage: false } })
      : prisma.homeService.delete({ where: { id } });
  }
  if (resource === "packages") return prisma.productPackage.delete({ where: { id } });
  if (resource === "projects") return prisma.project.delete({ where: { id } });
  if (resource === "about") {
    const about = await prisma.aboutPage.findUnique({ where: { id }, select: { status: true } });
    if (!about) throw new Error("About page not found");
    return about.status === "PUBLISHED"
      ? prisma.aboutPage.update({ where: { id }, data: { status: "ARCHIVED" } })
      : prisma.aboutPage.delete({ where: { id } });
  }
  if (resource === "media") {
    const asset = await prisma.mediaAsset.findUnique({ where: { id }, include: { _count: { select: { projectMedia: true } } } });
    if (!asset) throw new Error("Media not found");
    const [services, packages, projects] = await Promise.all([
      prisma.homeService.findMany({ select: { coverImage: true, gallery: true, beforeAfter: true, videos: true } }),
      prisma.productPackage.findMany({ select: { coverImage: true, gallery: true } }),
      prisma.project.findMany({ select: { coverImage: true, videos: true } })
    ]);
    const referenced = asset._count.projectMedia > 0 || [...services, ...packages, ...projects]
      .some((entry) => JSON.stringify(entry).includes(asset.url));
    if (referenced) throw new Error("Media is still used by published or draft content");
    if (asset.url.includes(".blob.vercel-storage.com")) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Vercel Blob is not configured");
      const { del } = await import("@vercel/blob");
      await del(asset.url);
    }
    return prisma.mediaAsset.delete({ where: { id } });
  }
  if (resource === "navigation") return prisma.navigationItem.delete({ where: { id } });
  if (resource === "sections") return prisma.homepageSection.delete({ where: { id } });
  if (resource === "service-categories") return prisma.serviceCategory.delete({ where: { id } });
  if (resource === "package-categories") return prisma.packageCategory.delete({ where: { id } });
  return prisma.projectCategory.delete({ where: { id } });
}

export async function logPlatformChange(actorId: string | null, action: string, resource: PlatformResource, entityId?: string, metadata?: Prisma.InputJsonValue) {
  await prisma.activityLog.create({ data: { actorId, action, entity: resource, entityId, metadata } }).catch(() => undefined);
}
