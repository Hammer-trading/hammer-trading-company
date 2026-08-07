import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { brandInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.BRANDS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = brandInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid brand", details: parsed.error.flatten() }, { status: 400 });
  const brand = await prisma.brand.update({ where: { id }, data: parsed.data });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "BRAND_UPDATED", metadata: { brandId: id } } });
  return NextResponse.json(brand);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.BRANDS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const count = await prisma.product.count({ where: { brandId: id } });
  if (count > 0) return NextResponse.json({ error: "Move or delete products before deleting this brand" }, { status: 409 });
  await prisma.brand.delete({ where: { id } });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "BRAND_DELETED", metadata: { brandId: id } } });
  return NextResponse.json({ ok: true });
}
