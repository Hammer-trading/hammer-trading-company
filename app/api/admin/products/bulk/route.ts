import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { deleteFallbackProduct, readFallbackProducts, saveFallbackProduct } from "@/lib/fallback-products";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.PRODUCTS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actorId = admin.id === "dev-admin" ? null : admin.id;
  const body = await request.json();
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter(Boolean) : [];
  const action = String(body.action || "");
  if (!ids.length) return NextResponse.json({ error: "Select at least one product" }, { status: 400 });

  if (!["delete", "activate", "deactivate", "price", "stock"].includes(action)) {
    return NextResponse.json({ error: "Unsupported bulk action" }, { status: 400 });
  }

  try {
    if (action === "delete") {
      await prisma.product.deleteMany({ where: { id: { in: ids } } });
    } else if (action === "activate" || action === "deactivate") {
      await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isActive: action === "activate" } });
    } else if (action === "price") {
      const mode = String(body.mode || "set");
      const amount = Number(body.amount || 0);
      if (Number.isNaN(amount)) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, price: true } });
      await prisma.$transaction(products.map((product) => {
        const next = mode === "percent" ? Number(product.price) * (1 + amount / 100) : amount;
        return prisma.product.update({ where: { id: product.id }, data: { price: Math.max(0, next) } });
      }));
    } else if (action === "stock") {
      const mode = String(body.mode || "adjust");
      const amount = Number(body.amount || 0);
      if (!Number.isInteger(amount)) return NextResponse.json({ error: "Invalid stock amount" }, { status: 400 });
      const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, stock: true } });
      await prisma.$transaction(products.flatMap((product) => {
        const next = mode === "set" ? amount : product.stock + amount;
        return [
          prisma.product.update({ where: { id: product.id }, data: { stock: next, inventory: { upsert: { update: { currentStock: next }, create: { currentStock: next } } } } }),
          prisma.inventoryLog.create({ data: { productId: product.id, type: "MANUAL_ADJUSTMENT", quantity: next - product.stock, previousStock: product.stock, newStock: next, reason: "Bulk stock update", actorId } })
        ];
      }));
    }

    await prisma.activityLog.create({ data: { actorId, action: `PRODUCT_BULK_${action.toUpperCase()}`, metadata: { ids, body } } });
    return NextResponse.json({ ok: true });
  } catch {
    const products = (await readFallbackProducts()).filter((product) => ids.includes(product.id));
    if (action === "delete") {
      await Promise.all(products.map((product) => deleteFallbackProduct(product.id)));
    } else if (action === "activate" || action === "deactivate") {
      await Promise.all(products.map((product) => saveFallbackProduct({ ...product, isActive: action === "activate" }, product.id)));
    } else if (action === "price") {
      const mode = String(body.mode || "set");
      const amount = Number(body.amount || 0);
      if (Number.isNaN(amount)) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      await Promise.all(products.map((product) => {
        const next = mode === "percent" ? product.price * (1 + amount / 100) : amount;
        return saveFallbackProduct({ ...product, price: Math.max(0, next) }, product.id);
      }));
    } else if (action === "stock") {
      const mode = String(body.mode || "adjust");
      const amount = Number(body.amount || 0);
      if (!Number.isInteger(amount)) return NextResponse.json({ error: "Invalid stock amount" }, { status: 400 });
      await Promise.all(products.map((product) => {
        const stock = mode === "set" ? amount : product.stock + amount;
        return saveFallbackProduct({ ...product, stock }, product.id);
      }));
    }
    return NextResponse.json({ ok: true, source: "fallback" });
  }
}
