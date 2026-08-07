import { Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { duplicateFallbackProduct } from "@/lib/fallback-products";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.PRODUCTS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const actorId = admin.id === "dev-admin" ? null : admin.id;
  try {
    const product = await prisma.product.findUnique({ where: { id }, include: { images: true, specs: true, variants: true } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const stamp = Date.now().toString().slice(-6);
    const copy = await prisma.product.create({
      data: {
        name: `${product.name} Copy`,
        slug: `${product.slug}-copy-${stamp}`,
        sku: `${product.sku}-COPY-${stamp}`,
        barcode: null,
        brandId: product.brandId,
        categoryId: product.categoryId,
        description: product.description,
        shortDescription: product.shortDescription,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        costPrice: product.costPrice,
        dealerPrice: product.dealerPrice,
        wholesalePrice: product.wholesalePrice,
        minWholesaleQuantity: product.minWholesaleQuantity,
        stock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        weightKg: product.weightKg,
        dimensions: product.dimensions,
        warranty: product.warranty,
        returnPolicy: product.returnPolicy,
        tags: product.tags,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        isHeavyItem: product.isHeavyItem,
        isBulky: product.isBulky,
        isBestSeller: false,
        isFeatured: false,
        isNewArrival: false,
        isActive: false,
        modelUrl: product.modelUrl,
        modelPosterUrl: product.modelPosterUrl,
        images: { create: product.images.map((image) => ({ url: image.url, alt: image.alt, isMain: image.isMain, sortOrder: image.sortOrder })) },
        specs: { create: product.specs.map((spec) => ({ name: spec.name, value: spec.value })) },
        variants: {
          create: product.variants.map((variant) => ({
            title: variant.title,
            sku: `${variant.sku}-COPY-${stamp}`,
            barcode: null,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice,
            costPrice: variant.costPrice,
            stock: variant.stock,
            lowStockThreshold: variant.lowStockThreshold,
            imageUrl: variant.imageUrl,
            modelUrl: variant.modelUrl,
            options: (variant.options || {}) as Prisma.InputJsonValue,
            isDefault: variant.isDefault,
            isActive: false
          }))
        },
        inventory: { create: { currentStock: product.stock, minStockLevel: product.lowStockThreshold } }
      }
    });
    await prisma.activityLog.create({ data: { actorId, action: "PRODUCT_DUPLICATED", metadata: { sourceId: id, productId: copy.id } } });
    return NextResponse.json(copy, { status: 201 });
  } catch {
    const copy = await duplicateFallbackProduct(id);
    if (!copy) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ ...copy, source: "fallback" }, { status: 201 });
  }
}
