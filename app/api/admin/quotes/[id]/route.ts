import { Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { quoteAdminUpdateSchema } from "@/lib/validation";

const quoteInclude = Prisma.validator<Prisma.QuoteRequestInclude>()({
  product: { select: { id: true, name: true, sku: true, price: true, wholesalePrice: true, stock: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true, price: true, wholesalePrice: true, stock: true } },
      variant: { select: { id: true, title: true, sku: true, price: true, wholesalePrice: true, stock: true, options: true } }
    },
    orderBy: { sortOrder: "asc" }
  },
  convertedOrder: { select: { id: true, orderNumber: true, total: true } }
});

type QuoteWithRelations = Prisma.QuoteRequestGetPayload<{ include: typeof quoteInclude }>;

function decimal(value: Prisma.Decimal | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

function serializeQuote(quote: QuoteWithRelations) {
  return {
    ...quote,
    quotedPrice: decimal(quote.quotedPrice),
    quotedSubtotal: decimal(quote.quotedSubtotal),
    discountTotal: Number(quote.discountTotal),
    deliveryCharge: decimal(quote.deliveryCharge),
    quotedTotal: decimal(quote.quotedTotal),
    product: quote.product ? {
      ...quote.product,
      price: Number(quote.product.price),
      wholesalePrice: decimal(quote.product.wholesalePrice)
    } : null,
    items: quote.items.map((item) => ({
      ...item,
      requestedTargetPrice: decimal(item.requestedTargetPrice),
      quotedUnitPrice: decimal(item.quotedUnitPrice),
      costPrice: Number(item.costPrice),
      lineTotal: decimal(item.lineTotal),
      product: {
        ...item.product,
        price: Number(item.product.price),
        wholesalePrice: decimal(item.product.wholesalePrice)
      },
      variant: item.variant ? {
        ...item.variant,
        price: Number(item.variant.price),
        wholesalePrice: decimal(item.variant.wholesalePrice)
      } : null
    })),
    convertedOrder: quote.convertedOrder
      ? { ...quote.convertedOrder, total: Number(quote.convertedOrder.total) }
      : null
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  try {
    const quote = await prisma.quoteRequest.findUnique({ where: { id }, include: quoteInclude });
    if (!quote) return NextResponse.json({ error: "Quote request not found" }, { status: 404 });
    return NextResponse.json({ quote: serializeQuote(quote), source: "database" });
  } catch (error) {
    console.error("Quote detail failed", error);
    return NextResponse.json({ error: "Quotation database is temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`admin-quote:${admin.id}:${getClientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many quotation updates. Please wait a moment." }, { status: 429 });
  }

  const { id } = await params;
  const parsed = quoteAdminUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quote update", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const current = await prisma.quoteRequest.findUnique({
      where: { id },
      include: { items: { orderBy: { sortOrder: "asc" } } }
    });
    if (!current) return NextResponse.json({ error: "Quote request not found" }, { status: 404 });
    if (current.status === "CONVERTED" || current.convertedOrderId) {
      return NextResponse.json({ error: "Converted quotations cannot be edited." }, { status: 409 });
    }

    const inputPrices = new Map(parsed.data.items?.map((item) => [item.id, item.quotedUnitPrice]) || []);
    if (parsed.data.items) {
      const existingIds = new Set(current.items.map((item) => item.id));
      if (inputPrices.size !== existingIds.size || Array.from(inputPrices.keys()).some((itemId) => !existingIds.has(itemId))) {
        return NextResponse.json({ error: "Quotation lines changed. Refresh and price every current line." }, { status: 409 });
      }
    }

    const pricedLines = current.items.map((item) => ({
      ...item,
      unitPrice: inputPrices.has(item.id)
        ? Number(inputPrices.get(item.id))
        : item.quotedUnitPrice === null
          ? null
          : Number(item.quotedUnitPrice)
    }));
    const missingLinePrice = pricedLines.some((item) => item.unitPrice === null);
    if (parsed.data.status === "APPROVED" && current.items.length && missingLinePrice) {
      return NextResponse.json({ error: "Set a unit price for every product before approving." }, { status: 400 });
    }

    const lineSubtotal = current.items.length && !missingLinePrice
      ? pricedLines.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)
      : null;
    const legacyQuotedTotal = parsed.data.quotedPrice ?? decimal(current.quotedPrice);
    if (parsed.data.status === "APPROVED" && !current.items.length && legacyQuotedTotal === null) {
      return NextResponse.json({ error: "Set a quoted total before approving this legacy request." }, { status: 400 });
    }

    const discountTotal = parsed.data.discountTotal ?? Number(current.discountTotal);
    const deliveryCharge = parsed.data.deliveryCharge ?? decimal(current.deliveryCharge) ?? 0;
    const subtotal = lineSubtotal ?? legacyQuotedTotal;
    if (subtotal !== null && discountTotal > subtotal) {
      return NextResponse.json({ error: "Discount cannot exceed the quotation subtotal." }, { status: 400 });
    }
    const quotedTotal = subtotal === null ? null : Math.max(0, subtotal - discountTotal) + deliveryCharge;

    const updatedId = await prisma.$transaction(async (tx) => {
      if (parsed.data.items) {
        for (const item of pricedLines) {
          const unitPrice = Number(item.unitPrice);
          await tx.quoteRequestItem.update({
            where: { id: item.id },
            data: { quotedUnitPrice: unitPrice, lineTotal: unitPrice * item.quantity }
          });
        }
      }
      const updated = await tx.quoteRequest.update({
        where: { id },
        data: {
          status: parsed.data.status,
          adminReply: parsed.data.adminReply,
          quotedSubtotal: subtotal,
          discountTotal,
          deliveryCharge,
          quotedTotal,
          quotedPrice: quotedTotal,
          validUntil: parsed.data.validUntil,
          terms: parsed.data.terms
        }
      });
      await tx.activityLog.create({
        data: {
          actorId: admin.id,
          action: "QUOTE_UPDATED",
          entity: "QuoteRequest",
          entityId: updated.id,
          metadata: {
            status: updated.status,
            subtotal,
            discountTotal,
            deliveryCharge,
            quotedTotal,
            pricedLines: parsed.data.items?.length || 0
          }
        }
      });
      return updated.id;
    });

    const quote = await prisma.quoteRequest.findUnique({ where: { id: updatedId }, include: quoteInclude });
    if (!quote) return NextResponse.json({ error: "Quote request not found" }, { status: 404 });
    return NextResponse.json({ quote: serializeQuote(quote), source: "database" });
  } catch (error) {
    console.error("Quote update failed", error);
    return NextResponse.json({ error: "Quotation update failed. No changes were applied." }, { status: 503 });
  }
}
