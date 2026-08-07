import { unstable_cache } from "next/cache";
import { tryDatabaseRead } from "@/lib/db-fallback";
import { prisma } from "@/lib/prisma";
import { resolveStoreImage } from "@/lib/store-image";
import { loadNeonStorefrontProducts } from "@/lib/storefront-neon";

export type WholesaleCatalogVariant = {
  id: string;
  title: string;
  sku: string;
  stock: number;
  imageUrl: string | null;
  wholesalePrice: number | null;
  minQuantity: number;
  options: Record<string, string>;
};

export type WholesaleCatalogProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  category: string;
  image: string;
  stock: number;
  wholesalePrice: number | null;
  minQuantity: number;
  variants: WholesaleCatalogVariant[];
};

function options(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, String(entry)]));
}

async function loadWholesaleCatalog() {
  const neonProducts = await loadNeonStorefrontProducts();
  const products = neonProducts || await tryDatabaseRead(() => prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      stock: true,
      wholesalePrice: true,
      minWholesaleQuantity: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
      images: { select: { id: true, url: true }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }], take: 1 },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          sku: true,
          stock: true,
          imageUrl: true,
          wholesalePrice: true,
          minWholesaleQuantity: true,
          options: true
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
      }
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }]
  }), 10_000, 2);
  return (products || []).map((product) => {
    const image = product.images[0]?.url;
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      brand: product.brand?.name || "Hammer Trading",
      category: product.category?.name || "General",
      image: image?.startsWith("data:") ? `/api/product-images/${product.images[0]?.id}` : resolveStoreImage(image || "/brand/htc-logo.png"),
      stock: product.stock,
      wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
      minQuantity: product.minWholesaleQuantity,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        stock: variant.stock,
        imageUrl: variant.imageUrl ? resolveStoreImage(variant.imageUrl) : null,
        wholesalePrice: variant.wholesalePrice ? Number(variant.wholesalePrice) : product.wholesalePrice ? Number(product.wholesalePrice) : null,
        minQuantity: variant.minWholesaleQuantity || product.minWholesaleQuantity,
        options: options(variant.options)
      }))
    } satisfies WholesaleCatalogProduct;
  });
}

export const getWholesaleCatalog = unstable_cache(loadWholesaleCatalog, ["wholesale-catalog-v2"], {
  revalidate: 300,
  tags: ["storefront-products"]
});
