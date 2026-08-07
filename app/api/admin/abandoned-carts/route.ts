import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { enqueueNotification } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/app-url";

export async function GET() {
  const admin = await requirePermission(Permission.CUSTOMERS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const carts = await prisma.cart.findMany({
      where: { abandoned: true },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: { include: { product: { select: { id: true, name: true, slug: true, sku: true, price: true } } } }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    });
    return NextResponse.json(carts.map((cart) => ({
      id: cart.id,
      sessionId: cart.sessionId,
      customer: cart.user,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
      updatedAt: cart.updatedAt,
      items: cart.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        product: { ...item.product, price: Number(item.product.price) }
      }))
    })));
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.CUSTOMERS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const cartId = String(body.cartId || "");
  const action = String(body.action || "");
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: { user: true, items: { include: { product: true } } }
  });
  if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

  if (action === "send") {
    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const appUrl = getAppUrl();
    const message = `Hammer Trading Company: ${cart.items.length} item(s) are waiting in your cart. Estimated total: Rs ${subtotal.toLocaleString("en-PK")}. Complete your order: ${appUrl}/cart`;
    if (!cart.user?.email && !cart.user?.phone) {
      return NextResponse.json({ error: "No customer email or phone available for this cart" }, { status: 400 });
    }
    await Promise.all([
      cart.user?.email ? enqueueNotification("EMAIL", { to: cart.user.email, subject: "Complete your Hammer Trading Company order", message }) : Promise.resolve(),
      cart.user?.phone ? enqueueNotification("WHATSAPP", { to: cart.user.phone, subject: "Abandoned cart recovery", message }) : Promise.resolve()
    ]);
    await prisma.activityLog.create({ data: { actorId: admin.id, action: "ABANDONED_CART_RECOVERY_QUEUED", entity: "Cart", entityId: cart.id, metadata: { cartId: cart.id } } });
    return NextResponse.json({ ok: true, message: "Recovery notification queued. Provider status is available in Settings." });
  }

  if (action === "recovered" || action === "closed") {
    await prisma.cart.update({ where: { id: cart.id }, data: { abandoned: false } });
    await prisma.activityLog.create({ data: { actorId: admin.id, action: action === "recovered" ? "ABANDONED_CART_RECOVERED" : "ABANDONED_CART_CLOSED", entity: "Cart", entityId: cart.id } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
