import { z } from "zod";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { validateCoupon } from "@/lib/coupons";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

const requestSchema = z.object({
  code: z.string().trim().min(1).max(64),
  customerPhone: z.string().trim().max(32).optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional().nullable(),
    quantity: z.coerce.number().int().positive().max(100000)
  })).min(1).max(100)
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`coupon-preview:${getClientIp(request)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many coupon checks. Please wait a moment." }, { status: 429 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid coupon request." }, { status: 400 });

  try {
    const productIds = Array.from(new Set(parsed.data.items.map((item) => item.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { variants: { where: { isActive: true } } }
    });
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more cart products are unavailable." }, { status: 409 });
    }

    const lines = parsed.data.items.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) throw new Error("PRODUCT_UNAVAILABLE");
      const variant = line.variantId
        ? product.variants.find((item) => item.id === line.variantId)
        : product.variants.find((item) => item.isDefault) || product.variants[0] || null;
      if (line.variantId && !variant) throw new Error("VARIANT_UNAVAILABLE");
      return {
        productId: product.id,
        categoryId: product.categoryId,
        unitPrice: Number(variant?.price ?? product.price),
        quantity: line.quantity
      };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const session = await getSession();
    const result = await validateCoupon({
      code: parsed.data.code,
      userId: session?.role === "CUSTOMER" ? session.id : null,
      customerPhone: parsed.data.customerPhone,
      adjustedSubtotal: subtotal,
      lines
    });
    if (!result.valid) return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Coupon preview failed", error);
    return NextResponse.json({ error: "Coupon validation is temporarily unavailable." }, { status: 503 });
  }
}
