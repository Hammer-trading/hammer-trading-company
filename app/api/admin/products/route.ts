import { Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { fallbackBrands, filterFallbackProducts, readFallbackProducts, saveFallbackProduct } from "@/lib/fallback-products";
import { readFallbackCategoryLookups } from "@/lib/fallback-taxonomy";
import { hasProductVariantSchema } from "@/lib/product-variant-schema";
import { normalizeProductVariants, numberOrNull, variantParentSummary } from "@/lib/product-variant-utils";
import { prisma } from "@/lib/prisma";
import { productInputSchema } from "@/lib/admin-validation";
import { slugify } from "@/lib/utils";

function titleFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function listImageUrl(url: string | null | undefined) {
  if (!url) return "/brand/htc-logo.png";
  return url.startsWith("data:") && url.length > 4096 ? "/brand/htc-logo.png" : url;
}

async function resolveBrandId(tx: Prisma.TransactionClient, brandId: string) {
  const existing = await tx.brand.findUnique({ where: { id: brandId }, select: { id: true } });
  if (existing) return existing.id;
  const fallback = fallbackBrands.find((brand) => brand.id === brandId || brand.slug === brandId);
  const name = fallback?.name || titleFromSlug(brandId) || "Hammer Trading";
  const brand = await tx.brand.upsert({
    where: { slug: slugify(fallback?.slug || name) },
    update: {},
    create: { name, slug: slugify(fallback?.slug || name) }
  });
  return brand.id;
}

async function resolveCategoryId(tx: Prisma.TransactionClient, categoryId: string) {
  const existing = await tx.category.findUnique({ where: { id: categoryId }, select: { id: true } });
  if (existing) return existing.id;
  const fallbackCategories = await readFallbackCategoryLookups();
  const fallback = fallbackCategories.find((category) => category.id === categoryId || category.slug === categoryId);
  const name = fallback?.name || titleFromSlug(categoryId) || "General";
  const category = await tx.category.upsert({
    where: { slug: slugify(fallback?.slug || name) },
    update: {},
    create: { name, slug: slugify(fallback?.slug || name), isActive: true }
  });
  return category.id;
}

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.PRODUCTS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const categoryId = url.searchParams.get("categoryId") || "";
  const brandId = url.searchParams.get("brandId") || "";
  const active = url.searchParams.get("active") || "";
  const stock = url.searchParams.get("stock") || "";
  const sort = url.searchParams.get("sort") || "updatedAt:desc";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 20)));
  const [sortField, sortDirection] = sort.split(":");

  const where: Prisma.ProductWhereInput = {
    AND: [
      q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { barcode: { contains: q, mode: "insensitive" } }] } : {},
      categoryId ? { categoryId } : {},
      brandId ? { brandId } : {},
      active ? { isActive: active === "true" } : {},
      stock === "low" ? { stock: { gt: 0, lte: 5 } } : {},
      stock === "out" ? { stock: { lte: 0 } } : {}
    ]
  };

  try {
    const supportsVariants = await hasProductVariantSchema();
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand: true,
          category: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          ...(supportsVariants ? {
            variants: {
              orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }],
              select: {
                id: true,
                title: true,
                sku: true,
                barcode: true,
                price: true,
                compareAtPrice: true,
                costPrice: true,
                stock: true,
                lowStockThreshold: true,
                imageUrl: true,
                options: true,
                isDefault: true,
                isActive: true
              }
            }
          } : {}),
          inventory: true
        },
        orderBy: { [sortField || "updatedAt"]: sortDirection === "asc" ? "asc" : "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.product.count({ where })
    ]);
    const listItems = items.map((item) => ({
      ...item,
      images: item.images.map((image) => ({ ...image, url: listImageUrl(image.url) })),
      variants: "variants" in item && Array.isArray(item.variants)
        ? item.variants.map((variant) => ({ ...variant, imageUrl: listImageUrl(variant.imageUrl) }))
        : []
    }));
    return NextResponse.json({ items: listItems, total, page, pageSize, pages: Math.ceil(total / pageSize), source: "database" });
  } catch {
    const all = filterFallbackProducts(await readFallbackProducts(), { q, categoryId, brandId, active, stock, sort });
    const total = all.length;
    const items = all.slice((page - 1) * pageSize, page * pageSize).map((item) => ({
      ...item,
      images: item.images.slice(0, 1).map((image) => ({ ...image, url: listImageUrl(image.url) })),
      variants: item.variants.map((variant) => ({ ...variant, imageUrl: listImageUrl(variant.imageUrl) }))
    }));
    return NextResponse.json({ items, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)), source: "fallback" });
  }
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.PRODUCTS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = productInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const actorId = admin.id === "dev-admin" ? null : admin.id;
  const variants = normalizeProductVariants(data);
  const parent = variantParentSummary(data, variants);
  const supportsVariants = await hasProductVariantSchema();
  const variantSkus = variants.map((variant) => variant.sku);
  const duplicateVariantSku = variantSkus.find((sku, index) => variantSkus.indexOf(sku) !== index);
  if (duplicateVariantSku) return NextResponse.json({ error: `Duplicate variant SKU: ${duplicateVariantSku}` }, { status: 409 });

  try {
    const duplicate = await prisma.product.findFirst({
      where: { OR: [{ sku: data.sku }, { slug: data.slug }, ...(data.barcode ? [{ barcode: data.barcode }] : [])] }
    });
    if (duplicate) return NextResponse.json({ error: "SKU, slug, or barcode already exists" }, { status: 409 });
    if (supportsVariants) {
      const variantDuplicate = await prisma.productVariant.findFirst({
        where: { OR: [{ sku: { in: variantSkus } }, ...variants.filter((variant) => variant.barcode).map((variant) => ({ barcode: variant.barcode || "" }))] }
      });
      if (variantDuplicate) return NextResponse.json({ error: "Variant SKU or barcode already exists" }, { status: 409 });
    }

    const product = await prisma.$transaction(async (tx) => {
      const [brandId, categoryId] = await Promise.all([resolveBrandId(tx, data.brandId), resolveCategoryId(tx, data.categoryId)]);
      const created = await tx.product.create({
        data: {
          name: data.name,
          slug: data.slug,
          sku: data.sku,
          barcode: data.barcode || null,
          brandId,
          categoryId,
          description: data.description,
          shortDescription: data.shortDescription || data.description.slice(0, 140),
          price: parent.price,
          compareAtPrice: parent.compareAtPrice,
          costPrice: parent.costPrice,
          dealerPrice: numberOrNull(data.dealerPrice),
          wholesalePrice: numberOrNull(data.wholesalePrice),
          minWholesaleQuantity: data.minWholesaleQuantity,
          stock: parent.stock,
          lowStockThreshold: parent.lowStockThreshold,
          weightKg: data.weightKg,
          dimensions: data.dimensions || null,
          warranty: data.warranty || null,
          returnPolicy: data.returnPolicy || null,
          tags: data.tags,
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
          isHeavyItem: data.isHeavyItem,
          isBulky: data.isBulky,
          isBestSeller: data.isBestSeller,
          isFeatured: data.isFeatured,
          isNewArrival: data.isNewArrival,
          isActive: data.isActive,
          modelUrl: data.modelUrl || null,
          modelPosterUrl: data.modelPosterUrl || null,
          images: { create: data.images.map((image, index) => ({ url: image.url, alt: image.alt || data.name, isMain: image.isMain || index === 0, sortOrder: index })) },
          specs: { create: data.specs.map((spec) => ({ name: spec.name, value: spec.value })) },
          ...(supportsVariants ? { variants: { create: variants } } : {}),
          inventory: { create: { currentStock: parent.stock, minStockLevel: parent.lowStockThreshold } },
          inventoryLogs: { create: { type: "MANUAL_ADJUSTMENT", quantity: parent.stock, previousStock: 0, newStock: parent.stock, reason: "Initial product stock", actorId } }
        },
        include: { brand: true, category: true, images: true, specs: true, ...(supportsVariants ? { variants: true } : {}), inventory: true }
      });
      await tx.activityLog.create({ data: { actorId, action: "PRODUCT_CREATED", metadata: { productId: created.id, sku: created.sku } } });
      return created;
    }, { maxWait: 15_000, timeout: 20_000 });

    revalidateTag("storefront-products");
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Product create failed", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Database product save failed. Nothing was saved; please retry." }, { status: 503 });
    }
    const products = await readFallbackProducts();
    const duplicate = products.find((product) => product.sku === data.sku || product.slug === data.slug || (data.barcode && product.barcode === data.barcode));
    if (duplicate) return NextResponse.json({ error: "SKU, slug, or barcode already exists" }, { status: 409 });
    const product = await saveFallbackProduct(data);
    revalidateTag("storefront-products");
    return NextResponse.json(product, { status: 201 });
  }
}
