import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

const cartTrackSchema = z.object({
  lines: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional().nullable(),
    packageId: z.string().optional().nullable(),
    packageName: z.string().optional().nullable(),
    quantity: z.coerce.number().int().positive().max(99)
  })).default([])
});

async function resolveCartIdentity() {
  const session = await getSession();
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("hammer_cart_session")?.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    cookieStore.set("hammer_cart_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }
  return {
    customerUserId: session?.role === "CUSTOMER" ? session.id : null,
    sessionId
  };
}

function cartWhere(customerUserId: string | null, sessionId: string) {
  return customerUserId ? { userId: customerUserId } : { sessionId, userId: null };
}

async function mergeGuestCartIntoCustomer(customerUserId: string | null, sessionId: string) {
  if (!customerUserId) return;
  const [customerCart, guestCart] = await Promise.all([
    prisma.cart.findFirst({ where: { userId: customerUserId }, orderBy: { updatedAt: "desc" }, include: { items: true } }),
    prisma.cart.findFirst({ where: { sessionId, userId: null }, orderBy: { updatedAt: "desc" }, include: { items: true } })
  ]);
  if (!guestCart?.items.length) return;
  const target = customerCart || await prisma.cart.create({ data: { userId: customerUserId, sessionId, abandoned: true }, include: { items: true } });
  const quantities = new Map<string, {
    productId: string;
    variantId: string | null;
    packageId: string | null;
    packageName: string | null;
    quantity: number;
  }>();
  for (const item of [...target.items, ...guestCart.items]) {
    const key = `${item.productId}:${item.variantId || ""}:${item.packageId || ""}`;
    const current = quantities.get(key);
    quantities.set(key, {
      productId: item.productId,
      variantId: item.variantId,
      packageId: item.packageId,
      packageName: current?.packageName || item.packageName,
      quantity: Math.min((current?.quantity || 0) + item.quantity, 99)
    });
  }
  const quantityLines = Array.from(quantities.values());
  const [products, packages] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: Array.from(new Set(quantityLines.map((item) => item.productId))) }, isActive: true },
      select: { id: true, stock: true, variants: { select: { id: true, stock: true, isActive: true } } }
    }),
    prisma.productPackage.findMany({
      where: {
        id: { in: Array.from(new Set(quantityLines.map((item) => item.packageId).filter((id): id is string => Boolean(id)))) },
        status: "PUBLISHED",
        isActive: true
      },
      select: { id: true, name: true }
    })
  ]);
  const productStock = new Map(products.map((product) => [product.id, product.stock]));
  const variantStock = new Map(products.flatMap((product) =>
    product.variants
      .filter((variant) => variant.isActive)
      .map((variant) => [variant.id, { productId: product.id, stock: variant.stock }] as const)
  ));
  const packageNames = new Map(packages.map((bundle) => [bundle.id, bundle.name]));
  const safeItems = quantityLines
    .map((item) => {
      const variant = item.variantId ? variantStock.get(item.variantId) : null;
      if (item.variantId && (!variant || variant.productId !== item.productId)) return null;
      if (item.packageId && !packageNames.has(item.packageId)) return null;
      const stock = variant ? variant.stock : productStock.get(item.productId);
      return typeof stock === "number" && stock > 0 ? { ...item, quantity: Math.min(item.quantity, stock, 99) } : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      ...item,
      packageName: item.packageId ? packageNames.get(item.packageId) || null : null
    }));

  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId: target.id } }),
    prisma.cart.update({
      where: { id: target.id },
      data: {
        userId: customerUserId,
        sessionId,
        abandoned: safeItems.length > 0,
        items: { create: safeItems }
      }
    }),
    prisma.cart.deleteMany({ where: { id: guestCart.id } })
  ]);
}

export async function GET(request: Request) {
  if (!rateLimit(`cart:get:${getClientIp(request)}`, 120, 60_000)) return NextResponse.json({ error: "Too many cart requests" }, { status: 429 });
  try {
    const { customerUserId, sessionId } = await resolveCartIdentity();
    await mergeGuestCartIntoCustomer(customerUserId, sessionId);
    const cart = await prisma.cart.findFirst({
      where: cartWhere(customerUserId, sessionId),
      orderBy: { updatedAt: "desc" },
      include: { items: true }
    });
    return NextResponse.json({
      lines: (cart?.items || []).map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        packageId: item.packageId,
        packageName: item.packageName,
        quantity: item.quantity
      })),
      identity: customerUserId ? "customer" : "guest"
    }, {
      headers: { "Cache-Control": "no-store, private" }
    });
  } catch {
    return NextResponse.json({ error: "Cart service is unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`cart:${getClientIp(request)}`, 80, 60_000)) return NextResponse.json({ error: "Too many cart requests" }, { status: 429 });
  const parsed = cartTrackSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });

  try {
    const { customerUserId, sessionId } = await resolveCartIdentity();
    const existing = await prisma.cart.findFirst({
      where: cartWhere(customerUserId, sessionId),
      orderBy: { updatedAt: "desc" }
    });
    const productIds = parsed.data.lines.map((line) => line.productId);
    const packageIds = parsed.data.lines.map((line) => line.packageId).filter((id): id is string => Boolean(id));
    const [products, packages] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true, stock: true, variants: { select: { id: true, isActive: true, stock: true } } }
      }),
      prisma.productPackage.findMany({
        where: { id: { in: packageIds }, status: "PUBLISHED", isActive: true },
        select: { id: true, name: true }
      })
    ]);
    const productsById = new Map(products.map((product) => [product.id, product]));
    const variantsById = new Map(products.flatMap((product) =>
      product.variants
        .filter((variant) => variant.isActive)
        .map((variant) => [variant.id, { productId: product.id, stock: variant.stock }] as const)
    ));
    const packageNames = new Map(packages.map((bundle) => [bundle.id, bundle.name]));
    const items = parsed.data.lines.flatMap((line) => {
      const product = productsById.get(line.productId);
      if (!product || (line.packageId && !packageNames.has(line.packageId))) return [];
      const variant = line.variantId ? variantsById.get(line.variantId) : null;
      if (line.variantId && (!variant || variant.productId !== line.productId)) return [];
      const availableStock = variant ? variant.stock : product.stock;
      if (availableStock < line.quantity) return [];
      return [{
        productId: line.productId,
        variantId: line.variantId || null,
        packageId: line.packageId || null,
        packageName: line.packageId ? packageNames.get(line.packageId) || null : null,
        quantity: line.quantity
      }];
    });
    const abandoned = items.length > 0;

    if (existing) {
      await prisma.cart.update({
        where: { id: existing.id },
        data: {
          userId: customerUserId || existing.userId,
          sessionId,
          abandoned,
          items: {
            deleteMany: {},
            create: items
          }
        }
      });
    } else if (abandoned) {
      await prisma.cart.create({
        data: {
          userId: customerUserId,
          sessionId,
          abandoned: true,
          items: { create: items }
        }
      });
    }

    return NextResponse.json({ ok: true, tracked: abandoned, lines: items }, { headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return NextResponse.json({ error: "Cart service is unavailable" }, { status: 503 });
  }
}
