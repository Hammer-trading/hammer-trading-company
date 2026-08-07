import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { brandInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.PRODUCTS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q") || "";
  const brands = await prisma.brand.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : undefined,
    include: { products: { select: { id: true } } },
    orderBy: { name: "asc" }
  });
  return NextResponse.json(brands);
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.BRANDS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = brandInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid brand", details: parsed.error.flatten() }, { status: 400 });
  const brand = await prisma.brand.create({ data: parsed.data });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "BRAND_CREATED", metadata: { brandId: brand.id } } });
  return NextResponse.json(brand, { status: 201 });
}
