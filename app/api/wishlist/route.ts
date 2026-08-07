import { z } from "zod";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

const wishlistSchema = z.object({ productId: z.string().min(1) });

async function customerSession() {
  const session = await getSession();
  return session?.role === "CUSTOMER" ? session : null;
}

export async function GET() {
  const customer = await customerSession();
  if (!customer) return NextResponse.json({ error: "Customer login required", productIds: [] }, { status: 401 });
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: customer.id },
      select: { productId: true, createdAt: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ productIds: items.map((item) => item.productId) });
  } catch (error) {
    console.error("Wishlist load failed", error);
    return NextResponse.json({ error: "Wishlist is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const customer = await customerSession();
  if (!customer) return NextResponse.json({ error: "Customer login required" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`wishlist:${customer.id}:${getClientIp(request)}`, 80, 60_000)) {
    return NextResponse.json({ error: "Too many wishlist updates." }, { status: 429 });
  }
  const parsed = wishlistSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product." }, { status: 400 });

  try {
    const product = await prisma.product.findFirst({
      where: { id: parsed.data.productId, isActive: true },
      select: { id: true }
    });
    if (!product) return NextResponse.json({ error: "Product is unavailable." }, { status: 404 });
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: customer.id, productId: product.id } },
      update: {},
      create: { userId: customer.id, productId: product.id }
    });
    return NextResponse.json({ ok: true, saved: true });
  } catch (error) {
    console.error("Wishlist save failed", error);
    return NextResponse.json({ error: "Product could not be saved." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const customer = await customerSession();
  if (!customer) return NextResponse.json({ error: "Customer login required" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`wishlist:${customer.id}:${getClientIp(request)}`, 80, 60_000)) {
    return NextResponse.json({ error: "Too many wishlist updates." }, { status: 429 });
  }
  const parsed = wishlistSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product." }, { status: 400 });

  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: customer.id, productId: parsed.data.productId }
    });
    return NextResponse.json({ ok: true, saved: false });
  } catch (error) {
    console.error("Wishlist remove failed", error);
    return NextResponse.json({ error: "Product could not be removed." }, { status: 503 });
  }
}
