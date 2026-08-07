import { Permission, Prisma, QuoteStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const quoteInclude = Prisma.validator<Prisma.QuoteRequestInclude>()({
  product: { select: { id: true, name: true, sku: true, price: true, wholesalePrice: true, stock: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true, price: true, wholesalePrice: true, stock: true } },
      variant: { select: { id: true, title: true, sku: true, price: true, wholesalePrice: true, stock: true, options: true } }
    },
    orderBy: { sortOrder: "asc" }
  },
  convertedOrder: { select: { orderNumber: true, total: true } }
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

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.SUPPORT_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const requestedStatus = (url.searchParams.get("status") || "").trim();
  const status = Object.values(QuoteStatus).includes(requestedStatus as QuoteStatus)
    ? requestedStatus as QuoteStatus
    : undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 30)));
  const where: Prisma.QuoteRequestWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? {
      OR: [
        { productName: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { items: { some: { OR: [
          { name: { contains: q, mode: "insensitive" } },
          { sku: { contains: q, mode: "insensitive" } },
          { variantTitle: { contains: q, mode: "insensitive" } }
        ] } } }
      ]
    } : {})
  };

  try {
    const [quotes, total] = await Promise.all([
      prisma.quoteRequest.findMany({
        where,
        include: quoteInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.quoteRequest.count({ where })
    ]);
    return NextResponse.json({
      items: quotes.map(serializeQuote),
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      source: "database"
    });
  } catch (error) {
    console.error("Quote list failed", error);
    return NextResponse.json({ error: "Quotation database is temporarily unavailable." }, { status: 503 });
  }
}
