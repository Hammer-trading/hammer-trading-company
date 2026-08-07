import { AdminShell } from "@/components/admin-shell";
import { AdminProductManagerLazy } from "@/components/admin-product-manager-lazy";
import { localFallbackEnabled } from "@/lib/db-fallback";
import { fallbackBrands, fallbackCategories as builtInFallbackCategories } from "@/lib/fallback-products";
import { readFallbackCategoryLookups } from "@/lib/fallback-taxonomy";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  let categories: Array<{ id: string; name: string; slug: string }> = [];
  let brands: Array<{ id: string; name: string; slug: string }> = [];
  let fallbackCategories = builtInFallbackCategories;
  if (localFallbackEnabled()) {
    try {
      fallbackCategories = await readFallbackCategoryLookups();
    } catch {
      fallbackCategories = builtInFallbackCategories;
    }
  }
  try {
    [categories, brands] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
      prisma.brand.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } })
    ]);
  } catch {
    categories = fallbackCategories;
    brands = fallbackBrands;
  }
  if (!categories.length) categories = fallbackCategories;
  if (!brands.length) brands = fallbackBrands;

  return (
    <AdminShell>
      <AdminProductManagerLazy categories={categories} brands={brands} />
    </AdminShell>
  );
}
