import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { categoryInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { readFallbackProducts } from "@/lib/fallback-products";
import { deleteFallbackCategory, readFallbackCategories, saveFallbackCategory } from "@/lib/fallback-taxonomy";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.CATEGORIES_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = categoryInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid category", details: parsed.error.flatten() }, { status: 400 });
  try {
    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    await prisma.activityLog.create({ data: { actorId: admin.id, action: "CATEGORY_UPDATED", metadata: { categoryId: id } } });
    return NextResponse.json(category);
  } catch {
    const duplicate = (await readFallbackCategories()).find((category) => category.id !== id && category.slug === parsed.data.slug);
    if (duplicate) return NextResponse.json({ error: "Category slug already exists" }, { status: 409 });
    const category = await saveFallbackCategory(parsed.data, id);
    return NextResponse.json({ ...category, source: "fallback" });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.CATEGORIES_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) return NextResponse.json({ error: "Move or delete products before deleting this category" }, { status: 409 });
    await prisma.category.delete({ where: { id } });
    await prisma.activityLog.create({ data: { actorId: admin.id, action: "CATEGORY_DELETED", metadata: { categoryId: id } } });
    return NextResponse.json({ ok: true });
  } catch {
    const products = await readFallbackProducts();
    const count = products.filter((product) => product.categoryId === id).length;
    if (count > 0) return NextResponse.json({ error: "Move or delete products before deleting this category" }, { status: 409 });
    const deleted = await deleteFallbackCategory(id);
    if (!deleted) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json({ ok: true, source: "fallback" });
  }
}
