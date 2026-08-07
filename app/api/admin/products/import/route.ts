import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

function bool(value: unknown) {
  return ["true", "1", "yes", "active"].includes(String(value || "").toLowerCase());
}

function num(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

async function uniqueProductSlug(baseSlug: string, sku: string, existingId?: string) {
  const base = slugify(baseSlug || sku || "product");
  let candidate = base;
  let index = 1;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true }
    });
    if (!existing || existing.id === existingId) return candidate;
    candidate = `${base}-${slugify(sku)}${index > 1 ? `-${index}` : ""}`;
    index += 1;
  }
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.PRODUCTS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actorId = admin.id === "dev-admin" ? null : admin.id;
  const { csv, dryRun = false } = await request.json();
  const rows = parseCsv(String(csv || ""));
  const errors: Array<{ row: number; error: string }> = [];
  const valid = [];
  const seen = new Set<string>();

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const sku = String(row.sku || "").trim();
    if (!sku) errors.push({ row: index + 2, error: "SKU is required" });
    if (seen.has(sku)) errors.push({ row: index + 2, error: "Duplicate SKU inside file" });
    seen.add(sku);
    if (!row.title) errors.push({ row: index + 2, error: "Title is required" });
    if (!row.brand) errors.push({ row: index + 2, error: "Brand is required" });
    if (!row.category) errors.push({ row: index + 2, error: "Category is required" });
    if (!Number.isFinite(Number(row.selling_price))) errors.push({ row: index + 2, error: "Selling price must be a number" });
    valid.push(row);
  }

  if (errors.length || dryRun) {
    return NextResponse.json({ ok: errors.length === 0, errors, rows: rows.length });
  }

  try {
    for (const row of valid) {
      const brand = await prisma.brand.upsert({
        where: { slug: slugify(String(row.brand)) },
        update: {},
        create: { name: String(row.brand), slug: slugify(String(row.brand)) }
      });
      const category = await prisma.category.upsert({
        where: { slug: slugify(String(row.category)) },
        update: {},
        create: { name: String(row.category), slug: slugify(String(row.category)) }
      });
      const imageUrls = String(row.image_urls || "").split("|").map((item) => item.trim()).filter(Boolean);
      const specs = String(row.specifications || "").split("|").map((item) => {
        const [name, ...value] = item.split(":");
        return name && value.length ? { name: name.trim(), value: value.join(":").trim() } : null;
      }).filter(Boolean) as Array<{ name: string; value: string }>;
      const existing = await prisma.product.findUnique({ where: { sku: String(row.sku).trim() } });
      const stock = Math.trunc(num(row.stock));
      const slug = await uniqueProductSlug(String(row.slug || row.title), String(row.sku).trim(), existing?.id);
      const data = {
        name: String(row.title),
        slug,
        barcode: String(row.barcode || "") || null,
        brandId: brand.id,
        categoryId: category.id,
        description: String(row.description || row.title),
        shortDescription: String(row.description || row.title).slice(0, 140),
        price: num(row.selling_price),
        compareAtPrice: row.discount_price ? num(row.discount_price) : null,
        costPrice: num(row.purchase_price),
        dealerPrice: row.dealer_price ? num(row.dealer_price) : null,
        wholesalePrice: row.wholesale_price ? num(row.wholesale_price) : null,
        minWholesaleQuantity: Math.max(1, Math.trunc(num(row.min_wholesale_qty, 1))),
        stock,
        lowStockThreshold: Math.max(0, Math.trunc(num(row.minimum_stock, 5))),
        weightKg: num(row.weight_kg),
        dimensions: String(row.dimensions || "") || null,
        warranty: String(row.warranty || "") || null,
        returnPolicy: String(row.return_policy || "") || null,
        tags: String(row.tags || "").split("|").map((item) => item.trim()).filter(Boolean),
        seoTitle: String(row.seo_title || "") || null,
        seoDescription: String(row.seo_description || "") || null,
        isFeatured: bool(row.featured),
        isBestSeller: bool(row.best_seller),
        isNewArrival: bool(row.new_arrival),
        isHeavyItem: bool(row.heavy_or_bulky),
        isBulky: bool(row.heavy_or_bulky),
        isActive: row.active === "" ? true : bool(row.active)
      };
      if (existing) {
        await prisma.productImage.deleteMany({ where: { productId: existing.id } });
        await prisma.productSpecification.deleteMany({ where: { productId: existing.id } });
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            ...data,
            images: { create: imageUrls.map((url, index) => ({ url, alt: String(row.title), isMain: index === 0, sortOrder: index })) },
            specs: { create: specs },
            inventory: { upsert: { update: { currentStock: stock, minStockLevel: data.lowStockThreshold }, create: { currentStock: stock, minStockLevel: data.lowStockThreshold } } }
          }
        });
      } else {
        await prisma.product.create({
          data: {
            ...data,
            sku: String(row.sku).trim(),
            images: { create: imageUrls.map((url, index) => ({ url, alt: String(row.title), isMain: index === 0, sortOrder: index })) },
            specs: { create: specs },
            inventory: { create: { currentStock: stock, minStockLevel: data.lowStockThreshold } }
          }
        });
      }
    }
    await prisma.activityLog.create({ data: { actorId, action: "PRODUCT_CSV_IMPORTED", metadata: { rows: rows.length } } });
    return NextResponse.json({ ok: true, imported: rows.length, errors: [] });
  } catch (error) {
    console.error("Product import failed", error);
    return NextResponse.json(
      {
        ok: false,
        imported: 0,
        errors: [{ row: 0, error: "Product import failed. Please review the CSV values and try again." }]
      },
      { status: 500 }
    );
  }
}
