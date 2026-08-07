import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { categoryInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { readFallbackProducts } from "@/lib/fallback-products";
import { readFallbackCategories, saveFallbackCategory } from "@/lib/fallback-taxonomy";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.PRODUCTS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q") || "";
  try {
    const categories = await prisma.category.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : undefined,
      include: { parent: true, children: true, products: { select: { id: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });
    return NextResponse.json(categories);
  } catch {
    const term = q.trim().toLowerCase();
    const products = await readFallbackProducts();
    const categories = (await readFallbackCategories())
      .filter((category) => !term || [category.name, category.slug].join(" ").toLowerCase().includes(term))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map((category) => ({
        ...category,
        parent: null,
        children: [],
        products: products.filter((product) => product.categoryId === category.id || product.category?.name === category.name).map((product) => ({ id: product.id })),
        source: "fallback"
      }));
    return NextResponse.json(categories);
  }
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.CATEGORIES_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = categoryInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid category", details: parsed.error.flatten() }, { status: 400 });
  try {
    const category = await prisma.category.create({ data: parsed.data });
    await prisma.activityLog.create({ data: { actorId: admin.id, action: "CATEGORY_CREATED", metadata: { categoryId: category.id } } });
    return NextResponse.json(category, { status: 201 });
  } catch {
    const existing = (await readFallbackCategories()).find((category) => category.slug === parsed.data.slug);
    if (existing) return NextResponse.json({ error: "Category slug already exists" }, { status: 409 });
    const category = await saveFallbackCategory(parsed.data);
    return NextResponse.json({ ...category, source: "fallback" }, { status: 201 });
  }
}
