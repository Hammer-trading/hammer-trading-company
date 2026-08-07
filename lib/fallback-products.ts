import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { brands as catalogBrands, catalogProducts, categories as catalogCategories } from "@/lib/catalog";
import { readFallbackCategoryLookups } from "@/lib/fallback-taxonomy";
import { assertLocalFallbackEnabled } from "@/lib/db-fallback";
import { normalizeProductVariants, variantParentSummary } from "@/lib/product-variant-utils";
import { slugify } from "@/lib/utils";
import type { productInputSchema } from "@/lib/admin-validation";
import type { z } from "zod";

type ProductInput = z.infer<typeof productInputSchema>;

export type FallbackLookup = { id: string; name: string; slug: string };

export type FallbackProduct = ProductInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
  brand: FallbackLookup;
  category: FallbackLookup;
  inventory: { currentStock: number; minStockLevel: number; allowNegativeStock: boolean };
};

const storePath = path.join(process.cwd(), "data", "fallback-products.json");

export const fallbackCategories: FallbackLookup[] = catalogCategories.map((name) => ({ id: slugify(name), name, slug: slugify(name) }));
export const fallbackBrands: FallbackLookup[] = catalogBrands.map((name) => ({ id: slugify(name), name, slug: slugify(name) }));

function lookup(rows: FallbackLookup[], idOrName: string, fallbackName: string) {
  return rows.find((row) => row.id === idOrName || row.name === idOrName) || { id: slugify(fallbackName), name: fallbackName, slug: slugify(fallbackName) };
}

function titleFromSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function catalogFallbackProducts(): FallbackProduct[] {
  const now = new Date().toISOString();
  return catalogProducts.map((product) => {
    const brand = lookup(fallbackBrands, product.brand, product.brand);
    const category = lookup(fallbackCategories, product.category, product.category);
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: "",
      brandId: brand.id,
      categoryId: category.id,
      brand,
      category,
      description: product.shortDescription,
      shortDescription: product.shortDescription,
      price: product.price,
      compareAtPrice: product.compareAtPrice || null,
      costPrice: Math.round(product.price * 0.72),
      dealerPrice: Math.round(product.price * 0.9),
      wholesalePrice: Math.round(product.price * 0.84),
      minWholesaleQuantity: 5,
      stock: product.stock,
      lowStockThreshold: 5,
      weightKg: product.weightKg,
      dimensions: "",
      warranty: "Supplier warranty applies.",
      returnPolicy: "Return accepted for unopened or defective products according to store policy.",
      tags: [slugify(product.category), slugify(product.brand)],
      seoTitle: product.name,
      seoDescription: product.shortDescription,
      isHeavyItem: Boolean(product.isHeavyItem),
      isBulky: false,
      isBestSeller: Boolean(product.isBestSeller),
      isFeatured: Boolean(product.isFeatured),
      isNewArrival: false,
      isActive: true,
      images: [{ url: product.image, alt: product.name, isMain: true, sortOrder: 0 }],
      specs: product.specs,
      variants: [{
        title: "Default",
        sku: product.sku,
        barcode: "",
        price: product.price,
        compareAtPrice: product.compareAtPrice || null,
        costPrice: Math.round(product.price * 0.72),
        stock: product.stock,
        lowStockThreshold: 5,
        imageUrl: product.image,
        options: {},
        isDefault: true,
        isActive: true
      }],
      inventory: { currentStock: product.stock, minStockLevel: 5, allowNegativeStock: false },
      createdAt: now,
      updatedAt: now
    };
  });
}

async function ensureStore() {
  await mkdir(path.dirname(storePath), { recursive: true });
}

async function writeFallbackProducts(products: FallbackProduct[]) {
  await ensureStore();
  await writeFile(storePath, JSON.stringify(products, null, 2), "utf8");
}

export async function readFallbackProducts() {
  assertLocalFallbackEnabled();
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FallbackProduct[]) : catalogFallbackProducts();
  } catch {
    return catalogFallbackProducts();
  }
}

export async function saveFallbackProduct(input: ProductInput, id?: string) {
  const products = await readFallbackProducts();
  const categoryLookups = await readFallbackCategoryLookups();
  const now = new Date().toISOString();
  const brand = lookup(fallbackBrands, input.brandId, titleFromSlug(input.brandId) || "Hammer Trading");
  const category = lookup(categoryLookups, input.categoryId, titleFromSlug(input.categoryId) || "General");
  const variants = normalizeProductVariants(input);
  const parent = variantParentSummary(input, variants);
  const product: FallbackProduct = {
    ...input,
    id: id || `fallback-${slugify(input.slug || input.name)}-${Date.now()}`,
    brand,
    category,
    brandId: brand.id,
    categoryId: category.id,
    barcode: input.barcode || "",
    price: parent.price,
    compareAtPrice: parent.compareAtPrice,
    costPrice: parent.costPrice,
    dealerPrice: input.dealerPrice || null,
    wholesalePrice: input.wholesalePrice || null,
    stock: parent.stock,
    lowStockThreshold: parent.lowStockThreshold,
    dimensions: input.dimensions || "",
    warranty: input.warranty || "",
    returnPolicy: input.returnPolicy || "",
    seoTitle: input.seoTitle || "",
    seoDescription: input.seoDescription || "",
    images: input.images.map((image, index) => ({ ...image, alt: image.alt || input.name, isMain: image.isMain || index === 0, sortOrder: index })),
    variants,
    inventory: { currentStock: parent.stock, minStockLevel: parent.lowStockThreshold, allowNegativeStock: false },
    createdAt: products.find((item) => item.id === id)?.createdAt || now,
    updatedAt: now
  };
  const next = [product, ...products.filter((item) => item.id !== product.id)];
  await writeFallbackProducts(next);
  return product;
}

export async function updateFallbackProductStock(id: string, delta: number) {
  const products = await readFallbackProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) return null;
  const nextStock = products[index].stock + delta;
  products[index] = {
    ...products[index],
    stock: nextStock,
    inventory: {
      ...products[index].inventory,
      currentStock: nextStock
    },
    updatedAt: new Date().toISOString()
  };
  await writeFallbackProducts(products);
  return products[index];
}

export async function getFallbackProduct(id: string) {
  const products = await readFallbackProducts();
  return products.find((product) => product.id === id) || null;
}

export async function deleteFallbackProduct(id: string) {
  const products = await readFallbackProducts();
  const next = products.filter((product) => product.id !== id);
  await writeFallbackProducts(next);
  return next.length !== products.length;
}

export async function duplicateFallbackProduct(id: string) {
  const product = await getFallbackProduct(id);
  if (!product) return null;
  const stamp = Date.now().toString().slice(-6);
  return saveFallbackProduct(
    {
      ...product,
      name: `${product.name} Copy`,
      slug: `${product.slug}-copy-${stamp}`,
      sku: `${product.sku}-COPY-${stamp}`,
      barcode: "",
      variants: product.variants.map((variant) => ({ ...variant, id: undefined, sku: `${variant.sku}-COPY-${stamp}`, barcode: "", isActive: false })),
      isActive: false,
      isFeatured: false,
      isBestSeller: false,
      isNewArrival: false
    },
    `fallback-${product.slug}-copy-${stamp}`
  );
}

export function filterFallbackProducts(
  products: FallbackProduct[],
  filters: { q?: string; categoryId?: string; brandId?: string; active?: string; stock?: string; sort?: string }
) {
  const q = filters.q?.trim().toLowerCase();
  const filtered = products.filter((product) => {
    const matchesQ = !q || [product.name, product.sku, product.barcode || ""].some((value) => value.toLowerCase().includes(q));
    const matchesCategory = !filters.categoryId || product.categoryId === filters.categoryId;
    const matchesBrand = !filters.brandId || product.brandId === filters.brandId;
    const matchesActive = !filters.active || product.isActive === (filters.active === "true");
    const matchesStock = filters.stock === "low" ? product.stock > 0 && product.stock <= product.lowStockThreshold : filters.stock === "out" ? product.stock <= 0 : true;
    return matchesQ && matchesCategory && matchesBrand && matchesActive && matchesStock;
  });
  const [field = "updatedAt", direction = "desc"] = (filters.sort || "updatedAt:desc").split(":");
  return filtered.sort((a, b) => {
    const left = a[field as keyof FallbackProduct] ?? "";
    const right = b[field as keyof FallbackProduct] ?? "";
    const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
    return direction === "asc" ? result : -result;
  });
}
