import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
if (process.env.DATABASE_URL_UNPOOLED) process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient();

function slugify(value) {
  return String(value || "room-package").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);
}

function status(value) {
  const normalized = String(value || "NEW").toUpperCase();
  return ["NEW", "CONTACTED", "INSPECTION_REQUIRED", "QUOTATION_SENT", "APPROVED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].includes(normalized)
    ? normalized
    : "NEW";
}

async function uniquePackageIdentity(legacy) {
  const baseSlug = slugify(legacy.slug || legacy.name);
  const baseSku = `ROOM-${baseSlug.replaceAll("-", "_").toUpperCase()}`.slice(0, 90);
  const [slugMatch, skuMatch] = await Promise.all([
    prisma.productPackage.findUnique({ where: { slug: baseSlug }, select: { id: true, legacyRoomPackageId: true } }),
    prisma.productPackage.findUnique({ where: { sku: baseSku }, select: { id: true, legacyRoomPackageId: true } })
  ]);
  const suffix = legacy.id.slice(-6).toLowerCase();
  return {
    slug: slugMatch && slugMatch.legacyRoomPackageId !== legacy.id ? `${baseSlug}-${suffix}` : baseSlug,
    sku: skuMatch && skuMatch.legacyRoomPackageId !== legacy.id ? `${baseSku}-${suffix.toUpperCase()}` : baseSku
  };
}

async function main() {
  const [legacyPackages, legacyRequests, products] = await Promise.all([
    prisma.roomPackage.findMany({ include: { canonicalPackage: true }, orderBy: { createdAt: "asc" } }),
    prisma.roomServiceRequest.findMany({ include: { canonicalBooking: true, package: { include: { canonicalPackage: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ where: { isActive: true }, include: { variants: true } })
  ]);

  const productLookup = new Map();
  for (const product of products) {
    productLookup.set(product.name.trim().toLowerCase(), { product, variant: null });
    productLookup.set(product.sku.trim().toLowerCase(), { product, variant: null });
    for (const variant of product.variants) {
      productLookup.set(variant.sku.trim().toLowerCase(), { product, variant });
      productLookup.set(`${product.name} ${variant.title}`.trim().toLowerCase(), { product, variant });
    }
  }

  const pendingPackages = legacyPackages.filter((item) => !item.canonicalPackage);
  const pendingRequests = legacyRequests.filter((item) => !item.canonicalBooking);
  const report = {
    mode: apply ? "apply" : "dry-run",
    legacyPackages: legacyPackages.length,
    packagesToCreate: pendingPackages.length,
    legacyRequests: legacyRequests.length,
    requestsToCreate: pendingRequests.length,
    unresolvedPackageItems: []
  };

  for (const legacy of pendingPackages) {
    const items = Array.isArray(legacy.items) ? legacy.items : [];
    const unresolved = [];
    for (const item of items) {
      const key = String(item?.sku || item?.name || "").trim().toLowerCase();
      if (!key || !productLookup.has(key)) unresolved.push(String(item?.name || item?.sku || "Unnamed item"));
    }
    if (unresolved.length) report.unresolvedPackageItems.push({ packageId: legacy.id, packageName: legacy.name, items: unresolved });
  }

  console.log(JSON.stringify(report, null, 2));
  if (!apply) {
    console.log("Dry run only. Re-run with --apply after reviewing unresolved items.");
    return;
  }

  const serviceCategory = await prisma.serviceCategory.upsert({
    where: { slug: "room-installation" },
    create: { name: "Room Installation", slug: "room-installation", description: "Complete room hardware planning, supply and fitting.", isActive: true },
    update: { isActive: true }
  });
  const packageCategory = await prisma.packageCategory.upsert({
    where: { slug: "room-packages" },
    create: { name: "Room Packages", slug: "room-packages", description: "Complete hardware packages for rooms and interior installations.", isActive: true },
    update: { isActive: true }
  });
  const service = await prisma.homeService.upsert({
    where: { slug: "complete-room-installation" },
    create: {
      name: "Complete Room Hardware Installation",
      slug: "complete-room-installation",
      categoryId: serviceCategory.id,
      shortDescription: "Room survey, product planning, supply, fitting and verified handover.",
      description: "HTC plans the required room hardware, confirms exact products and quantities, supplies the approved material and completes professional installation.",
      requestQuoteEnabled: true,
      bookingEnabled: true,
      whatsappEnabled: true,
      includedWork: ["Site review", "Hardware planning", "Supply coordination", "Professional fitting", "Verified handover"],
      status: "PUBLISHED",
      isActive: true,
      isFeatured: true,
      showOnHomepage: true
    },
    update: { categoryId: serviceCategory.id, status: "PUBLISHED", isActive: true }
  });

  for (const legacy of pendingPackages) {
    const rawItems = Array.isArray(legacy.items) ? legacy.items : [];
    const mapped = rawItems.map((item, index) => {
      const key = String(item?.sku || item?.name || "").trim().toLowerCase();
      const match = productLookup.get(key);
      if (!match) return null;
      return {
        productId: match.product.id,
        variantId: match.variant?.id || null,
        quantity: Math.max(1, Number(item?.quantity || 1)),
        sortOrder: index
      };
    }).filter(Boolean);
    const unresolvedCount = rawItems.length - mapped.length;
    const identity = await uniquePackageIdentity(legacy);
    const originalPrice = Number(legacy.compareAtPrice || legacy.price);
    await prisma.productPackage.create({
      data: {
        name: legacy.name,
        slug: identity.slug,
        sku: identity.sku,
        categoryId: packageCategory.id,
        coverImage: legacy.image,
        shortDescription: legacy.description.slice(0, 300),
        description: legacy.description,
        originalPrice,
        fixedDiscount: Math.max(0, originalPrice - Number(legacy.price)),
        finalPrice: Number(legacy.price),
        installationServiceId: service.id,
        legacyRoomPackageId: legacy.id,
        legacyItems: legacy.items,
        migrationStatus: unresolvedCount === 0 && mapped.length ? "MAPPED" : mapped.length ? "PARTIAL" : "NEEDS_MAPPING",
        isFeatured: legacy.isFeatured,
        isActive: legacy.isActive,
        status: unresolvedCount === 0 && mapped.length && legacy.isActive ? "PUBLISHED" : "DRAFT",
        sortOrder: legacy.sortOrder,
        items: mapped.length ? { create: mapped } : undefined
      }
    });
  }

  for (const legacy of pendingRequests) {
    const canonicalPackage = legacy.package?.canonicalPackage || null;
    const packageItems = canonicalPackage ? await prisma.packageItem.findMany({
      where: { packageId: canonicalPackage.id },
      include: { product: true, variant: true },
      orderBy: { sortOrder: "asc" }
    }) : [];
    const user = legacy.email ? await prisma.user.findUnique({ where: { email: legacy.email.toLowerCase() }, select: { id: true } }) : null;
    await prisma.serviceBooking.create({
      data: {
        requestNumber: legacy.requestNumber,
        serviceId: service.id,
        packageId: canonicalPackage?.id || null,
        packageSnapshot: legacy.package ? {
          legacyId: legacy.package.id,
          name: legacy.package.name,
          price: Number(legacy.package.price),
          items: legacy.package.items
        } : undefined,
        userId: user?.id || null,
        customerName: legacy.customerName,
        phone: legacy.phone,
        email: legacy.email,
        address: legacy.address,
        city: legacy.city,
        preferredDate: legacy.preferredDate,
        projectDetails: [legacy.roomType, legacy.roomSize].filter(Boolean).join(" · "),
        customerNote: legacy.note,
        internalNote: legacy.adminNote,
        materialSubtotal: canonicalPackage?.finalPrice || legacy.estimatedTotal || 0,
        quotedTotal: legacy.estimatedTotal,
        quotationAmount: legacy.estimatedTotal,
        status: status(legacy.status),
        legacyRoomServiceRequestId: legacy.id,
        createdAt: legacy.createdAt,
        items: packageItems.length ? {
          create: packageItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.product.name,
            sku: item.variant?.sku || item.product.sku,
            variantTitle: item.variant?.title || null,
            variantOptions: item.variant?.options || undefined,
            quantity: item.quantity,
            unitPrice: item.variant?.price || item.product.price,
            costPrice: item.variant?.costPrice || item.product.costPrice,
            total: Number(item.variant?.price ?? item.product.price) * item.quantity,
            sortOrder: item.sortOrder
          }))
        } : undefined
      }
    });
  }

  await prisma.activityLog.create({
    data: {
      action: "LEGACY_ROOM_SERVICES_MIGRATED",
      entity: "PlatformMigration",
      metadata: {
        packagesCreated: pendingPackages.length,
        requestsCreated: pendingRequests.length,
        unresolvedPackageCount: report.unresolvedPackageItems.length
      }
    }
  });
  console.log(`Migration complete: ${pendingPackages.length} packages, ${pendingRequests.length} requests.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
