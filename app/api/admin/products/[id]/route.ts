import { Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { deleteFallbackProduct, fallbackBrands, getFallbackProduct, readFallbackProducts, saveFallbackProduct } from "@/lib/fallback-products";
import { readFallbackCategoryLookups } from "@/lib/fallback-taxonomy";
import { hasProductVariantSchema } from "@/lib/product-variant-schema";
import { normalizeProductVariants, numberOrNull, variantParentSummary } from "@/lib/product-variant-utils";
import { productInputSchema } from "@/lib/admin-validation";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

function titleFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.PRODUCTS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const supportsVariants = await hasProductVariantSchema();
    const product = await prisma.product.findUnique({ where: { id }, include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" } }, specs: true, ...(supportsVariants ? { variants: { orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }] } } : {}), inventory: true } });
    if (product) return NextResponse.json(product);
  } catch {
    // PostgreSQL is optional in development; local fallback keeps admin CRUD usable.
  }
  const product = await getFallbackProduct(id);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ ...product, source: "fallback" });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.PRODUCTS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
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
      where: { id: { not: id }, OR: [{ sku: data.sku }, { slug: data.slug }, ...(data.barcode ? [{ barcode: data.barcode }] : [])] }
    });
    if (duplicate) return NextResponse.json({ error: "SKU, slug, or barcode already exists" }, { status: 409 });
    if (supportsVariants) {
      const variantDuplicate = await prisma.productVariant.findFirst({
        where: {
          productId: { not: id },
          OR: [{ sku: { in: variantSkus } }, ...variants.filter((variant) => variant.barcode).map((variant) => ({ barcode: variant.barcode || "" }))]
        }
      });
      if (variantDuplicate) return NextResponse.json({ error: "Variant SKU or barcode already exists" }, { status: 409 });
    }

    const current = await prisma.product.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const product = await prisma.$transaction(async (tx) => {
      const [brandId, categoryId] = await Promise.all([resolveBrandId(tx, data.brandId), resolveCategoryId(tx, data.categoryId)]);
      await tx.productImage.deleteMany({ where: { productId: id } });
      await tx.productSpecification.deleteMany({ where: { productId: id } });
      const updated = await tx.product.update({
        where: { id },
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
          inventory: { upsert: { update: { currentStock: parent.stock, minStockLevel: parent.lowStockThreshold }, create: { currentStock: parent.stock, minStockLevel: parent.lowStockThreshold } } }
        },
        include: { brand: true, category: true, images: true, specs: true, ...(supportsVariants ? { variants: true } : {}), inventory: true }
      });
      if (supportsVariants) {
        const keepVariantIds = variants.map((variant) => variant.id).filter(Boolean) as string[];
        for (const variant of variants) {
          const variantData = {
            title: variant.title,
            sku: variant.sku,
            barcode: variant.barcode,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            costPrice: variant.costPrice,
            wholesalePrice: variant.wholesalePrice,
            minWholesaleQuantity: variant.minWholesaleQuantity,
            stock: variant.stock,
            lowStockThreshold: variant.lowStockThreshold,
            imageUrl: variant.imageUrl,
            modelUrl: variant.modelUrl,
            options: variant.options,
            isDefault: variant.isDefault,
            isActive: variant.isActive
          };
          if (variant.id) {
            await tx.productVariant.update({ where: { id: variant.id }, data: variantData });
          } else {
            const created = await tx.productVariant.create({ data: { ...variantData, productId: id } });
            keepVariantIds.push(created.id);
          }
        }
        await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: keepVariantIds } } });
      }
      if (current.stock !== parent.stock) {
        await tx.inventoryLog.create({ data: { productId: id, type: "MANUAL_ADJUSTMENT", quantity: parent.stock - current.stock, previousStock: current.stock, newStock: parent.stock, reason: "Product variant stock edited", actorId } });
      }
      await tx.activityLog.create({ data: { actorId, action: "PRODUCT_UPDATED", metadata: { productId: updated.id, sku: updated.sku } } });
      return await tx.product.findUnique({
        where: { id },
        include: { brand: true, category: true, images: true, specs: true, ...(supportsVariants ? { variants: true } : {}), inventory: true }
      }) || updated;
    }, { maxWait: 15_000, timeout: 20_000 });

    revalidateTag("storefront-products");
    return NextResponse.json(product);
  } catch (error) {
    console.error("Product update failed", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Database product update failed. Nothing was changed; please retry." }, { status: 503 });
    }
    const products = await readFallbackProducts();
    const current = products.find((product) => product.id === id);
    if (!current) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const duplicate = products.find((product) => product.id !== id && (product.sku === data.sku || product.slug === data.slug || (data.barcode && product.barcode === data.barcode)));
    if (duplicate) return NextResponse.json({ error: "SKU, slug, or barcode already exists" }, { status: 409 });
    const product = await saveFallbackProduct(data, id);
    revalidateTag("storefront-products");
    return NextResponse.json({ ...product, source: "fallback" });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.PRODUCTS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const actorId = admin.id === "dev-admin" ? null : admin.id;
  try {
    await prisma.$transaction([
      prisma.product.delete({ where: { id } }),
      prisma.activityLog.create({ data: { actorId, action: "PRODUCT_DELETED", entity: "Product", entityId: id, metadata: { productId: id } } })
    ]);
    revalidateTag("storefront-products");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      const linkedPackages = await prisma.packageItem.findMany({
        where: { productId: id },
        select: { packageId: true }
      });
      const packageIds = Array.from(new Set(linkedPackages.map((item) => item.packageId)));
      const archiveOperations: Prisma.PrismaPromise<unknown>[] = [
        prisma.product.update({ where: { id }, data: { isActive: false } }),
        prisma.productVariant.updateMany({ where: { productId: id }, data: { isActive: false } }),
        prisma.activityLog.create({
          data: {
            actorId,
            action: "PRODUCT_ARCHIVED",
            entity: "Product",
            entityId: id,
            metadata: { productId: id, reason: "Linked order or package records must be preserved" }
          }
        })
      ];
      if (packageIds.length) {
        archiveOperations.push(prisma.productPackage.updateMany({
          where: { id: { in: packageIds } },
          data: { isActive: false, status: "DRAFT" }
        }));
      }
      await prisma.$transaction(archiveOperations);
      revalidateTag("storefront-products");
      return NextResponse.json({ ok: true, archived: true });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    console.error("Product delete failed", error);
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Database product delete failed. Nothing was changed; please retry." }, { status: 503 });
    }
    const deleted = await deleteFallbackProduct(id);
    if (!deleted) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    revalidateTag("storefront-products");
    return NextResponse.json({ ok: true, source: "fallback" });
  }
}
