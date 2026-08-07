import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { type CatalogProduct, type ProductCardSummary } from "@/lib/catalog";
import { localFallbackEnabled, tryDatabaseRead } from "@/lib/db-fallback";
import { hasProductVariantSchema } from "@/lib/product-variant-schema";
import { storefrontFallbackProducts } from "@/lib/storefront-fallback";
import { resolveStoreImage } from "@/lib/store-image";
import {
  loadNeonStorefrontBrands,
  loadNeonStorefrontCategories,
  loadNeonStorefrontProduct,
  loadNeonStorefrontProducts
} from "@/lib/storefront-neon";

function localFallbackProducts() {
  return localFallbackEnabled() ? storefrontFallbackProducts : [];
}

type StorefrontProductSource = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  price: number | { toString(): string };
  compareAtPrice?: number | { toString(): string } | null;
  stock: number;
  lowStockThreshold?: number;
  weightKg: number | { toString(): string };
  isHeavyItem: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  modelUrl?: string | null;
  modelPosterUrl?: string | null;
  brand?: { name: string } | null;
  category?: { name: string } | null;
  images?: Array<{ id?: string; url: string; alt?: string | null; isMain: boolean; sortOrder: number }>;
  specs?: Array<{ name: string; value: string }>;
  reviews?: Array<{ rating: number }>;
  variants?: Array<{
    id?: string;
    title: string;
    sku: string;
    barcode?: string | null;
    price: number | { toString(): string };
    compareAtPrice?: number | { toString(): string } | null;
    stock: number;
    imageUrl?: string | null;
    modelUrl?: string | null;
    options?: unknown;
    isDefault: boolean;
    isActive: boolean;
  }>;
};

type StorefrontCategorySource = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  banner?: string | null;
  sortOrder?: number | null;
};

export type StorefrontCategorySection = StorefrontCategorySource & {
  products: CatalogProduct[];
};

function variantOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, option]) => option !== null && option !== undefined && String(option).trim())
      .map(([key, option]) => [key, String(option)])
  );
}

function publicImageUrl(image: { id?: string; url: string } | undefined) {
  if (!image?.url) return "/brand/htc-logo.png";
  if (image.url.startsWith("data:")) return image.id ? `/api/product-images/${image.id}` : "/brand/htc-logo.png";
  return resolveStoreImage(image.url);
}

export function toCatalogProduct(product: StorefrontProductSource): CatalogProduct {
  const images = (product.images || [])
    .slice()
    .sort((a, b) => Number(b.isMain) - Number(a.isMain) || a.sortOrder - b.sortOrder)
    .map((image, index) => ({
      url: publicImageUrl(image),
      alt: image.alt || product.name,
      isMain: image.isMain || index === 0,
      sortOrder: index
    }));
  const mainImage = images[0];
  const activeVariants = (product.variants || [])
    .filter((variant) => variant.isActive)
    .map((variant) => ({
      id: variant.id || `${product.id}:${variant.sku}`,
      title: variant.title,
      sku: variant.sku,
      barcode: variant.barcode || undefined,
      price: Number(variant.price),
      compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : undefined,
      stock: variant.stock,
      imageUrl: variant.imageUrl?.startsWith("data:") ? mainImage?.url : variant.imageUrl || undefined,
      modelUrl: variant.modelUrl || undefined,
      options: variantOptions(variant.options),
      isDefault: variant.isDefault,
      isActive: variant.isActive
    }));
  const variants = activeVariants.length
    ? activeVariants
    : [{
        id: `${product.id}:default`,
        title: "Default",
        sku: product.sku,
        barcode: undefined,
        price: Number(product.price),
        compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : undefined,
        stock: product.stock,
        imageUrl: mainImage?.url,
        options: {},
        isDefault: true,
        isActive: true
      }];
  const defaultVariant = variants.find((variant) => variant.isDefault) || variants[0];
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: defaultVariant.sku || product.sku,
    category: product.category?.name || "General",
    brand: product.brand?.name || "Hammer Trading",
    price: defaultVariant.price,
    compareAtPrice: defaultVariant.compareAtPrice,
    stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    rating: product.reviews?.length ? Number((product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length).toFixed(1)) : 0,
    reviewCount: product.reviews?.length || 0,
    lowStockThreshold: product.lowStockThreshold || 5,
    image: mainImage?.url || "/brand/htc-logo.png",
    images: images.length ? images : [{ url: "/brand/htc-logo.png", alt: product.name, isMain: true, sortOrder: 0 }],
    shortDescription: product.shortDescription || product.description,
    seoTitle: product.seoTitle || product.name,
    seoDescription: product.seoDescription || product.shortDescription || product.description,
    specs: product.specs?.length ? product.specs.map((spec) => ({ name: spec.name, value: spec.value })) : [{ name: "SKU", value: product.sku }],
    isBestSeller: product.isBestSeller,
    isFeatured: product.isFeatured,
    weightKg: Number(product.weightKg),
    isHeavyItem: product.isHeavyItem,
    modelUrl: product.modelUrl || undefined,
    modelPosterUrl: product.modelPosterUrl || undefined,
    variants
  };
}

export function toProductCardSummary(product: CatalogProduct): ProductCardSummary {
  const lightVariants = product.variants
    .slice(0, product.variants.length > 1 ? 2 : 1)
    .map(({ id, title, options, isActive }) => ({ id, title, options, isActive }));

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    stock: product.stock,
    rating: product.rating,
    reviewCount: product.reviewCount,
    lowStockThreshold: product.lowStockThreshold,
    image: product.image,
    galleryImages: Array.from(new Set([
      product.image,
      ...product.images.map((image) => image.url),
      ...product.variants.map((variant) => variant.imageUrl).filter((image): image is string => Boolean(image))
    ])).slice(0, 4),
    isBestSeller: product.isBestSeller,
    variantCount: product.variants.length,
    variants: lightVariants
  };
}

async function loadStorefrontProducts() {
  const neonProducts = await loadNeonStorefrontProducts();
  if (neonProducts) return neonProducts.map(toCatalogProduct);

  const supportsVariants = await hasProductVariantSchema();
  const products = await tryDatabaseRead(() => prisma.product.findMany({
      relationLoadStrategy: "join",
      where: { isActive: true },
        include: { brand: true, category: true, images: true, reviews: { where: { isApproved: true }, select: { rating: true } }, ...(supportsVariants ? { variants: { orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }] } } : {}) },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }]
    }), 20_000);
  if (products?.length) return products.map(toCatalogProduct);
  return localFallbackProducts();
}

export const getStorefrontProducts = unstable_cache(loadStorefrontProducts, ["storefront-products-v5"], {
  revalidate: 300,
  tags: ["storefront-products"]
});

async function loadStorefrontProduct(slug: string) {
  const neonProducts = await loadNeonStorefrontProduct(slug);
  if (neonProducts) return neonProducts[0] ? toCatalogProduct(neonProducts[0]) : undefined;

  const supportsVariants = await hasProductVariantSchema();
  const product = await tryDatabaseRead(() => prisma.product.findFirst({
      relationLoadStrategy: "join",
      where: { slug, isActive: true },
      include: { brand: true, category: true, images: true, specs: true, reviews: { where: { isApproved: true }, select: { rating: true } }, ...(supportsVariants ? { variants: { orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }] } } : {}) }
    }), 20_000);
  if (product) return toCatalogProduct(product);
  return localFallbackProducts().find((item) => item.slug === slug);
}

const getCachedStorefrontProduct = unstable_cache(loadStorefrontProduct, ["storefront-product-v5"], {
  revalidate: 300,
  tags: ["storefront-products"]
});

export async function getStorefrontProduct(slug: string) {
  return getCachedStorefrontProduct(slug);
}

async function loadStorefrontCategories() {
  const neonRows = await loadNeonStorefrontCategories();
  if (neonRows) return neonRows.map((row) => row.name);

  const rows = await tryDatabaseRead(() => prisma.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }), 10_000);
  if (rows?.length) return rows.map((row) => row.name);
  return Array.from(new Set(localFallbackProducts().map((product) => product.category)));
}

export const getStorefrontCategories = unstable_cache(loadStorefrontCategories, ["storefront-categories-v5"], {
  revalidate: 600,
  tags: ["storefront-products"]
});

async function loadStorefrontBrands() {
  const neonBrands = await loadNeonStorefrontBrands();
  if (neonBrands) return neonBrands;

  const rows = await tryDatabaseRead(() => prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }), 10_000);
  return rows?.length ? rows.map((row) => row.name) : Array.from(new Set(localFallbackProducts().map((product) => product.brand)));
}

export const getStorefrontBrands = unstable_cache(loadStorefrontBrands, ["storefront-brands-v5"], {
  revalidate: 600,
  tags: ["storefront-products"]
});

export function filterStorefrontProducts(products: CatalogProduct[], query?: string, category?: string, brand?: string, best?: string, discount?: string) {
  const term = query?.toLowerCase().trim();
  return products.filter((product) => {
    const matchesQuery = !term || [product.name, product.sku, product.brand, product.category].join(" ").toLowerCase().includes(term);
    const matchesCategory = !category || category === "all" || product.category === category;
    const matchesBrand = !brand || brand === "all" || product.brand === brand;
    const matchesBest = best !== "true" || Boolean(product.isBestSeller);
    const matchesDiscount = discount !== "true" || Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
    return matchesQuery && matchesCategory && matchesBrand && matchesBest && matchesDiscount;
  });
}

async function loadStorefrontCategorySections(limit = 3, productsPerCategory = 4): Promise<StorefrontCategorySection[]> {
  const [neonCategories, neonProducts] = await Promise.all([loadNeonStorefrontCategories(), loadNeonStorefrontProducts()]);
  if (neonCategories && neonProducts) {
    const products = neonProducts.map(toCatalogProduct);
    return neonCategories
      .map((category) => ({
        ...category,
        image: resolveStoreImage(category.image),
        banner: category.banner ? resolveStoreImage(category.banner) : category.banner,
        products: products.filter((product) => product.category === category.name).slice(0, productsPerCategory)
      }))
      .filter((section) => section.products.length > 0)
      .slice(0, limit);
  }

  const supportsVariants = await hasProductVariantSchema();
  const rows = await tryDatabaseRead(() => prisma.category.findMany({
    relationLoadStrategy: "join",
    where: { isActive: true },
    include: {
      products: {
        where: { isActive: true },
        include: { brand: true, category: true, images: { orderBy: { sortOrder: "asc" } }, specs: true, reviews: { where: { isApproved: true }, select: { rating: true } }, ...(supportsVariants ? { variants: { orderBy: [{ isDefault: "desc" as const }, { createdAt: "asc" as const }] } } : {}) },
        orderBy: [{ isFeatured: "desc" }, { isBestSeller: "desc" }, { createdAt: "desc" }],
        take: productsPerCategory
      }
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: limit * 4
  }), 20_000);

  const databaseSections = rows
    ?.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: resolveStoreImage(category.image),
      banner: category.banner ? resolveStoreImage(category.banner) : category.banner,
      sortOrder: category.sortOrder,
      products: category.products.map(toCatalogProduct)
    }))
    .filter((section) => section.products.length > 0)
    .slice(0, limit);

  if (databaseSections?.length) return databaseSections;
  const fallbackProducts = localFallbackProducts();
  return Array.from(new Set(fallbackProducts.map((product) => product.category)))
    .map((name) => ({
      id: `fallback-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: `${name} selected for professional and home projects.`,
      image: fallbackProducts.find((product) => product.category === name)?.image || null,
      banner: null,
      sortOrder: 0,
      products: fallbackProducts.filter((product) => product.category === name).slice(0, productsPerCategory)
    }))
    .filter((section) => section.products.length > 0)
    .slice(0, limit);
}

const getCachedStorefrontCategorySections = unstable_cache(loadStorefrontCategorySections, ["storefront-category-sections-v5"], {
  revalidate: 300,
  tags: ["storefront-products"]
});

export async function getStorefrontCategorySections(limit = 3, productsPerCategory = 4): Promise<StorefrontCategorySection[]> {
  return getCachedStorefrontCategorySections(limit, productsPerCategory);
}
