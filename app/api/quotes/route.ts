import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { createAdminNotification } from "@/lib/order-automation";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { quoteRequestSchema } from "@/lib/validation";

type RequestedLine = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  requestedTargetPrice?: number | null;
};

function variantOptions(value: Prisma.JsonValue | null | undefined): Prisma.InputJsonValue | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, String(entry)]));
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`rfq:${getClientIp(request)}`, 8, 60_000)) {
    return NextResponse.json({ error: "Too many quotation requests. Please try again shortly." }, { status: 429 });
  }

  const parsed = quoteRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid quote request", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  try {
    const requestedLines: RequestedLine[] = data.items?.length
      ? data.items
      : data.productId && data.quantity
        ? [{ productId: data.productId, quantity: data.quantity }]
        : [];

    if (!requestedLines.length) {
      const legacyQuote = await prisma.quoteRequest.create({
        data: {
          productId: null,
          productName: data.productName || "Custom wholesale request",
          quantity: data.quantity || 1,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail || null,
          city: data.city,
          note: data.note || null
        }
      });
      await createAdminNotification(
        prisma,
        "New wholesale request",
        `${legacyQuote.customerName} submitted a custom wholesale request`,
        `/admin/quotes?id=${legacyQuote.id}`
      );
      return NextResponse.json({ ok: true, id: legacyQuote.id, reference: legacyQuote.id.slice(-8).toUpperCase() }, { status: 201 });
    }

    const duplicateKeys = new Set<string>();
    for (const line of requestedLines) {
      const key = `${line.productId}:${line.variantId || "base"}`;
      if (duplicateKeys.has(key)) {
        return NextResponse.json({ error: "The same product variant is listed more than once." }, { status: 400 });
      }
      duplicateKeys.add(key);
    }

    const productIds = Array.from(new Set(requestedLines.map((line) => line.productId)));
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { variants: { where: { isActive: true } } }
    });
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more selected products are unavailable." }, { status: 409 });
    }

    const verifiedLines = requestedLines.map((line, sortOrder) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) throw new Error("PRODUCT_UNAVAILABLE");
      const variant = line.variantId ? product.variants.find((item) => item.id === line.variantId) : null;
      if (line.variantId && !variant) throw new Error(`INVALID_VARIANT:${product.name}`);
      if (!line.variantId && product.variants.length) throw new Error(`VARIANT_REQUIRED:${product.name}`);
      const minimum = variant?.minWholesaleQuantity || product.minWholesaleQuantity;
      if (line.quantity < minimum) throw new Error(`MINIMUM:${product.name}:${minimum}`);
      return {
        productId: product.id,
        variantId: variant?.id || null,
        name: product.name,
        sku: variant?.sku || product.sku,
        variantTitle: variant?.title || null,
        variantOptions: variantOptions(variant?.options),
        quantity: line.quantity,
        requestedTargetPrice: line.requestedTargetPrice ?? null,
        quotedUnitPrice: null,
        costPrice: variant?.costPrice ?? product.costPrice,
        lineTotal: null,
        sortOrder
      };
    });

    const firstLine = verifiedLines[0];
    const totalQuantity = verifiedLines.reduce((sum, line) => sum + line.quantity, 0);
    const summaryName = verifiedLines.length > 1
      ? `${firstLine.name} + ${verifiedLines.length - 1} more`
      : firstLine.name;

    const quote = await prisma.quoteRequest.create({
      data: {
        productId: firstLine.productId,
        productName: summaryName,
        quantity: totalQuantity,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || null,
        city: data.city,
        note: data.note || null,
        items: { create: verifiedLines }
      }
    });

    await createAdminNotification(
      prisma,
      "New multi-product quotation",
      `${quote.customerName} requested ${verifiedLines.length} product line${verifiedLines.length > 1 ? "s" : ""}`,
      `/admin/quotes?id=${quote.id}`
    );
    return NextResponse.json({ ok: true, id: quote.id, reference: quote.id.slice(-8).toUpperCase() }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PRODUCT_UNAVAILABLE") {
      return NextResponse.json({ error: "One or more selected products are unavailable." }, { status: 409 });
    }
    if (message.startsWith("INVALID_VARIANT:")) {
      return NextResponse.json({ error: `${message.split(":")[1]} variant is unavailable.` }, { status: 409 });
    }
    if (message.startsWith("VARIANT_REQUIRED:")) {
      return NextResponse.json({ error: `Please select an exact variant for ${message.split(":")[1]}.` }, { status: 400 });
    }
    if (message.startsWith("MINIMUM:")) {
      const [, productName, minimum] = message.split(":");
      return NextResponse.json({ error: `${productName} requires a minimum wholesale quantity of ${minimum}.` }, { status: 400 });
    }
    console.error("Quote request failed", error);
    return NextResponse.json({ error: "Quote service is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
