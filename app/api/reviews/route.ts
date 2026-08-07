import { z } from "zod";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120),
  comment: z.string().trim().min(10).max(2000)
});

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId") || "";
  if (!productId) return NextResponse.json({ error: "Product is required." }, { status: 400 });
  try {
    const items = await prisma.review.findMany({
      where: { productId, isApproved: true, isRejected: false, isAbusive: false },
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        reply: true,
        isVerifiedPurchase: true,
        createdAt: true,
        user: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Review list failed", error);
    return NextResponse.json({ error: "Reviews are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") return NextResponse.json({ error: "Customer login required" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`review:${session.id}:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many review attempts. Please wait." }, { status: 429 });
  }
  const parsed = reviewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Complete all review fields." }, { status: 400 });

  try {
    const deliveredOrder = await prisma.order.findFirst({
      where: {
        userId: session.id,
        status: "DELIVERED",
        items: { some: { productId: parsed.data.productId } }
      },
      select: { id: true, orderNumber: true },
      orderBy: { deliveredAt: "desc" }
    });
    if (!deliveredOrder) {
      return NextResponse.json({ error: "A delivered purchase is required before reviewing this product." }, { status: 403 });
    }
    const existing = await prisma.review.findFirst({
      where: { userId: session.id, productId: parsed.data.productId, orderId: deliveredOrder.id },
      select: { id: true }
    });
    if (existing) return NextResponse.json({ error: "You already reviewed this product from this order." }, { status: 409 });

    const review = await prisma.review.create({
      data: {
        productId: parsed.data.productId,
        userId: session.id,
        orderId: deliveredOrder.id,
        rating: parsed.data.rating,
        title: parsed.data.title,
        comment: parsed.data.comment,
        isVerifiedPurchase: true
      }
    });
    await prisma.adminNotification.create({
      data: {
        title: "Verified review pending",
        message: `${session.name} submitted a review for order ${deliveredOrder.orderNumber}`,
        href: "/admin/reviews"
      }
    }).catch(() => undefined);
    return NextResponse.json({ ok: true, id: review.id, pendingModeration: true }, { status: 201 });
  } catch (error) {
    console.error("Review submission failed", error);
    return NextResponse.json({ error: "Review could not be saved." }, { status: 503 });
  }
}
