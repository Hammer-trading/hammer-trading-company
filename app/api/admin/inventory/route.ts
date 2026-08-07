import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { inventoryAdjustmentSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.INVENTORY_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const stock = url.searchParams.get("stock") || "";
  const where = {
    AND: [
      q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { sku: { contains: q, mode: "insensitive" as const } }] } : {},
      stock === "out" ? { stock: { lte: 0 } } : {},
      stock === "low" ? { stock: { gt: 0, lte: 5 } } : {}
    ]
  };
  const products = await prisma.product.findMany({
    where,
    include: { inventory: true, inventoryLogs: { orderBy: { createdAt: "desc" }, take: 5, include: { actor: { select: { name: true } } } } },
    orderBy: { stock: "asc" },
    take: 100
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.INVENTORY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = inventoryAdjustmentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid inventory adjustment", details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: data.productId }, include: { inventory: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const previous = product.stock;
  const next = data.type === "STOCK_IN" ? previous + Math.abs(data.quantity) : data.type === "STOCK_OUT" ? previous - Math.abs(data.quantity) : data.quantity;
  const allowNegative = product.inventory?.allowNegativeStock || (await prisma.systemSetting.findUnique({ where: { key: "allow_negative_stock" } }))?.value === "true";
  if (!allowNegative && next < 0) return NextResponse.json({ error: "Stock cannot go below zero. Enable negative stock in settings first." }, { status: 409 });
  await prisma.$transaction([
    prisma.product.update({ where: { id: product.id }, data: { stock: next, inventory: { upsert: { update: { currentStock: next }, create: { currentStock: next, minStockLevel: product.lowStockThreshold } } } } }),
    prisma.inventoryLog.create({ data: { productId: product.id, type: data.type, quantity: next - previous, previousStock: previous, newStock: next, reason: data.reason, actorId: admin.id } }),
    prisma.activityLog.create({ data: { actorId: admin.id, action: "INVENTORY_ADJUSTED", metadata: { productId: product.id, previous, next, reason: data.reason } } })
  ]);
  return NextResponse.json({ ok: true, previousStock: previous, newStock: next });
}
