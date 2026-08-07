import type { productInputSchema } from "@/lib/admin-validation";
import type { z } from "zod";

type ProductInput = z.infer<typeof productInputSchema>;
type ProductVariantInput = ProductInput["variants"][number];

export function numberOrNull(value: number | null | undefined) {
  return value === undefined || value === null || Number.isNaN(value) ? null : value;
}

export function normalizeProductVariants(data: ProductInput) {
  const raw = data.variants.length
    ? data.variants
    : [{
        title: "Default",
        sku: data.sku,
        barcode: null,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        costPrice: data.costPrice,
        wholesalePrice: data.wholesalePrice,
        minWholesaleQuantity: data.minWholesaleQuantity,
        stock: data.stock,
        lowStockThreshold: data.lowStockThreshold,
        imageUrl: data.images.find((image) => image.isMain)?.url || data.images[0]?.url || null,
        modelUrl: data.modelUrl || null,
        options: {},
        isDefault: true,
        isActive: data.isActive
      } satisfies ProductVariantInput];
  const defaultIndex = raw.findIndex((variant) => variant.isDefault);
  return raw.map((variant, index) => ({
    id: variant.id,
    title: variant.title.trim(),
    sku: variant.sku.trim(),
    barcode: variant.barcode?.trim() || null,
    price: variant.price,
    compareAtPrice: numberOrNull(variant.compareAtPrice),
    costPrice: variant.costPrice,
    wholesalePrice: numberOrNull(variant.wholesalePrice),
    minWholesaleQuantity: variant.minWholesaleQuantity || null,
    stock: variant.stock,
    lowStockThreshold: variant.lowStockThreshold,
    imageUrl: variant.imageUrl?.trim() || null,
    modelUrl: variant.modelUrl?.trim() || null,
    options: Object.fromEntries(
      Object.entries(variant.options || {})
        .map(([key, value]) => [key.trim(), value.trim()])
        .filter(([key, value]) => key && value)
    ),
    isDefault: defaultIndex >= 0 ? index === defaultIndex : index === 0,
    isActive: variant.isActive
  }));
}

export function variantParentSummary(data: ProductInput, variants: ReturnType<typeof normalizeProductVariants>) {
  const defaultVariant = variants.find((variant) => variant.isDefault) || variants[0];
  const activeVariants = variants.filter((variant) => variant.isActive);
  const stockRows = activeVariants.length ? activeVariants : variants;
  return {
    price: defaultVariant?.price ?? data.price,
    compareAtPrice: numberOrNull(defaultVariant?.compareAtPrice ?? data.compareAtPrice),
    costPrice: defaultVariant?.costPrice ?? data.costPrice,
    stock: stockRows.reduce((sum, variant) => sum + variant.stock, 0),
    lowStockThreshold: defaultVariant?.lowStockThreshold ?? data.lowStockThreshold
  };
}
