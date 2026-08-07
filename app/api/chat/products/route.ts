import { Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/security";

function imageUrl(product: { images: Array<{ id: string; url: string; isMain: boolean; sortOrder: number }> }) {
  const image = product.images.slice().sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder)[0];
  if (!image?.url) return "/brand/htc-logo.png";
  if (image.url.startsWith("data:")) return `/api/product-images/${image.id}`;
  return image.url;
}

export async function GET(request: Request) {
  const session = await getSession();
  const admin = session ? await requirePermission(Permission.SUPPORT_READ) : null;
  if (!session || (session.role !== "CUSTOMER" && !admin)) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }
  if (!rateLimit(`chat-products:${session.id}:${getClientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many product searches" }, { status: 429 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(20, Math.max(6, Number(url.searchParams.get("limit") || 12)));
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { category: { name: { contains: q, mode: "insensitive" } } },
      { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
      { variants: { some: { title: { contains: q, mode: "insensitive" } } } }
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      images: { orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] },
      variants: { where: { isActive: true }, orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }] }
    },
    orderBy: [{ isFeatured: "desc" }, { isBestSeller: "desc" }, { updatedAt: "desc" }],
    take: limit
  });

  return NextResponse.json({
    products: products.map((product) => {
      const variants = product.variants;
      const fallbackVariant = {
        id: null,
        title: "Default",
        sku: product.sku,
        price: Number(product.price),
        stock: product.stock,
        imageUrl: imageUrl(product)
      };
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        brand: product.brand?.name || "Hammer Trading",
        category: product.category?.name || "General",
        image: imageUrl(product),
        price: Number(product.price),
        stock: product.stock,
        variants: variants.length
          ? variants.map((variant) => ({
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              price: Number(variant.price),
              stock: variant.stock,
              imageUrl: variant.imageUrl && !variant.imageUrl.startsWith("data:") ? variant.imageUrl : imageUrl(product)
            }))
          : [fallbackVariant]
      };
    })
  });
}
