import { Permission } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { readFallbackProducts } from "@/lib/fallback-products";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const admin = await requirePermission(Permission.PRODUCTS_READ);
  if (!admin) return new Response("Unauthorized", { status: 401 });
  let products;
  try {
    products = await prisma.product.findMany({ include: { brand: true, category: true }, orderBy: { updatedAt: "desc" } });
  } catch {
    products = await readFallbackProducts();
  }
  const csv = toCsv(products.map((product) => ({
    sku: product.sku,
    barcode: product.barcode || "",
    title: product.name,
    slug: product.slug,
    brand: product.brand.name,
    category: product.category.name,
    purchase_price: product.costPrice,
    selling_price: product.price,
    discount_price: product.compareAtPrice || "",
    dealer_price: product.dealerPrice || "",
    wholesale_price: product.wholesalePrice || "",
    min_wholesale_qty: product.minWholesaleQuantity,
    stock: product.stock,
    minimum_stock: product.lowStockThreshold,
    weight_kg: product.weightKg,
    dimensions: product.dimensions || "",
    warranty: product.warranty || "",
    return_policy: product.returnPolicy || "",
    tags: product.tags.join("|"),
    active: product.isActive
  })));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=hammer-products.csv"
    }
  });
}
