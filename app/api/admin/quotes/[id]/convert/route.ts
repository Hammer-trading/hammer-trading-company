import bcrypt from "bcryptjs";
import { Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { calculateDelivery } from "@/lib/delivery";
import { createAdminNotification } from "@/lib/order-automation";
import { prisma } from "@/lib/prisma";
import { hashToken, makeToken, otpCode } from "@/lib/qr";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { invoiceNumber, orderNumber } from "@/lib/utils";
import { getAppUrl } from "@/lib/app-url";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.ORDERS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`quote-convert:${admin.id}:${getClientIp(request)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many conversion attempts. Please wait a moment." }, { status: 429 });
  }

  const { id } = await params;
  const orderNo = orderNumber();
  const invoiceNo = invoiceNumber();
  const otp = otpCode();
  const otpHash = await bcrypt.hash(otp, 12);
  const token = await makeToken({ orderNumber: orderNo, type: "DELIVERY_CONFIRMATION" }, "7d");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const appUrl = getAppUrl();

  try {
    const order = await prisma.$transaction(async (tx) => {
      const quote = await tx.quoteRequest.findUnique({
        where: { id },
        include: {
          product: true,
          items: {
            include: { product: true, variant: true },
            orderBy: { sortOrder: "asc" }
          }
        }
      });
      if (!quote) throw new Error("QUOTE_NOT_FOUND");
      if (quote.convertedOrderId || quote.status === "CONVERTED") throw new Error("ALREADY_CONVERTED");
      if (quote.status !== "APPROVED") throw new Error("QUOTE_NOT_APPROVED");
      if (quote.validUntil && quote.validUntil < new Date()) throw new Error("QUOTE_EXPIRED");

      const lines = quote.items.length
        ? quote.items.map((item) => ({
            product: item.product,
            variant: item.variant,
            variantId: item.variantId,
            name: item.name,
            sku: item.sku,
            variantTitle: item.variantTitle,
            variantOptions: item.variantOptions,
            quantity: item.quantity,
            quotedUnitPrice: item.quotedUnitPrice,
            costPrice: item.costPrice
          }))
        : quote.product
          ? [{
              product: quote.product,
              variant: null,
              variantId: null,
              name: quote.product.name,
              sku: quote.product.sku,
              variantTitle: null,
              variantOptions: null,
              quantity: quote.quantity,
              quotedUnitPrice: quote.quotedTotal || quote.quotedPrice
                ? new Prisma.Decimal(Number(quote.quotedTotal || quote.quotedPrice) / quote.quantity)
                : null,
              costPrice: quote.product.costPrice
            }]
          : [];

      if (!lines.length) throw new Error("NO_PRODUCTS");
      if (lines.some((line) => line.quotedUnitPrice === null)) throw new Error("MISSING_PRICE");
      if (lines.some((line) => !line.product.isActive)) throw new Error("PRODUCT_UNAVAILABLE");
      if (lines.some((line) => line.variantId && (!line.variant || !line.variant.isActive))) throw new Error("VARIANT_UNAVAILABLE");

      const subtotal = lines.reduce((sum, line) => sum + Number(line.quotedUnitPrice) * line.quantity, 0);
      const discountTotal = Math.min(subtotal, Math.max(0, Number(quote.discountTotal)));
      const totalWeightKg = lines.reduce((sum, line) => sum + Number(line.product.weightKg) * line.quantity, 0);
      const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
      const rules = await tx.deliveryRule.findMany();
      const delivery = calculateDelivery({
        city: quote.city,
        subtotal,
        totalWeightKg,
        hasHeavyItem: lines.some((line) => line.product.isHeavyItem),
        hasBulkyItem: lines.some((line) => line.product.isBulky),
        quantity: totalQuantity
      }, rules);
      const deliveryCharge = quote.deliveryCharge === null ? delivery.charge : Number(quote.deliveryCharge);
      const total = Math.max(0, subtotal - discountTotal) + deliveryCharge;

      const quantitiesByProduct = new Map<string, number>();
      const quantitiesByVariant = new Map<string, number>();
      for (const line of lines) {
        quantitiesByProduct.set(line.product.id, (quantitiesByProduct.get(line.product.id) || 0) + line.quantity);
        if (line.variantId) {
          quantitiesByVariant.set(line.variantId, (quantitiesByVariant.get(line.variantId) || 0) + line.quantity);
        }
      }

      for (const [productId, quantity] of quantitiesByProduct) {
        const product = lines.find((line) => line.product.id === productId)?.product;
        if (!product) throw new Error("PRODUCT_UNAVAILABLE");
        const updated = await tx.product.updateMany({
          where: { id: productId, isActive: true, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } }
        });
        if (updated.count !== 1) throw new Error(`OUT_OF_STOCK:${product.name}`);
        await tx.inventory.upsert({
          where: { productId },
          update: { currentStock: { decrement: quantity } },
          create: {
            productId,
            currentStock: product.stock - quantity,
            minStockLevel: product.lowStockThreshold
          }
        });
      }

      for (const [variantId, quantity] of quantitiesByVariant) {
        const line = lines.find((item) => item.variantId === variantId);
        const updated = await tx.productVariant.updateMany({
          where: { id: variantId, productId: line?.product.id, isActive: true, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } }
        });
        if (updated.count !== 1) throw new Error(`OUT_OF_STOCK:${line?.name || "Selected variant"}`);
      }

      const created = await tx.order.create({
        data: {
          orderNumber: orderNo,
          invoiceNumber: invoiceNo,
          customerName: quote.customerName,
          customerEmail: quote.customerEmail,
          customerPhone: quote.customerPhone,
          province: "To be confirmed",
          city: quote.city,
          area: null,
          addressLine: "Wholesale quotation converted to order. Confirm the complete delivery address before dispatch.",
          nearestLandmark: null,
          subtotal,
          discountTotal,
          serviceCharge: 0,
          deliveryCharge,
          total,
          codAmount: total,
          profitMargin: lines.reduce(
            (sum, line) => sum + (Number(line.quotedUnitPrice) - Number(line.costPrice)) * line.quantity,
            0
          ),
          paymentMethod: "COD",
          paymentStatus: "PENDING",
          estimatedDeliveryAt: new Date(Date.now() + delivery.estimatedDaysMax * 24 * 60 * 60 * 1000),
          otpHash,
          qrTokenHash: tokenHash,
          qrExpiresAt: expiresAt,
          internalNotes: `Converted from wholesale quotation ${quote.id}. ${quote.note || ""}`,
          customerNotes: quote.adminReply,
          items: {
            create: lines.map((line) => ({
              productId: line.product.id,
              variantId: line.variantId,
              name: line.name,
              sku: line.sku,
              variantTitle: line.variantTitle,
              variantOptions: line.variantOptions === null ? undefined : line.variantOptions,
              quantity: line.quantity,
              price: line.quotedUnitPrice as Prisma.Decimal,
              costPrice: line.costPrice,
              total: Number(line.quotedUnitPrice) * line.quantity
            }))
          },
          timeline: {
            create: {
              status: "PENDING",
              note: `Approved wholesale quotation converted to order. Delivery rule: ${delivery.ruleName}. Delivery OTP generated; notification delivery is pending.`
            }
          },
          qrcodes: {
            create: {
              type: "DELIVERY_CONFIRMATION",
              tokenHash,
              url: `${appUrl}/confirm-delivery?token=${encodeURIComponent(token)}`,
              expiresAt
            }
          }
        }
      });

      for (const [productId, quantity] of quantitiesByProduct) {
        const product = lines.find((line) => line.product.id === productId)?.product;
        if (!product) continue;
        await tx.inventoryLog.create({
          data: {
            productId,
            type: "ORDER_REDUCTION",
            quantity: -quantity,
            previousStock: product.stock,
            newStock: product.stock - quantity,
            reason: `Wholesale quotation converted to order ${orderNo}`,
            orderId: created.id,
            actorId: admin.id
          }
        });
      }

      const converted = await tx.quoteRequest.updateMany({
        where: { id: quote.id, status: "APPROVED", convertedOrderId: null },
        data: {
          status: "CONVERTED",
          convertedOrderId: created.id,
          quotedSubtotal: subtotal,
          quotedPrice: total,
          quotedTotal: total,
          deliveryCharge,
          discountTotal
        }
      });
      if (converted.count !== 1) throw new Error("ALREADY_CONVERTED");

      await tx.activityLog.create({
        data: {
          actorId: admin.id,
          orderId: created.id,
          action: "QUOTE_CONVERTED_TO_ORDER",
          entity: "QuoteRequest",
          entityId: quote.id,
          metadata: { quoteId: quote.id, orderNumber: orderNo, lineCount: lines.length, total }
        }
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 15_000, timeout: 25_000 });

    await createAdminNotification(
      prisma,
      "Wholesale quote converted",
      `Quotation converted to ${order.orderNumber}`,
      `/admin/orders?order=${order.orderNumber}`
    );
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, invoiceNumber: order.invoiceNumber });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "QUOTE_NOT_FOUND") return NextResponse.json({ error: "Quote request not found" }, { status: 404 });
    if (message === "ALREADY_CONVERTED") return NextResponse.json({ error: "Quote is already converted" }, { status: 409 });
    if (message === "QUOTE_NOT_APPROVED") return NextResponse.json({ error: "Approve the quotation before converting it." }, { status: 409 });
    if (message === "QUOTE_EXPIRED") return NextResponse.json({ error: "This quotation has expired. Extend its validity before converting." }, { status: 409 });
    if (message === "NO_PRODUCTS") return NextResponse.json({ error: "No catalog products are linked to this quotation." }, { status: 400 });
    if (message === "MISSING_PRICE") return NextResponse.json({ error: "Every quotation line needs an approved unit price." }, { status: 400 });
    if (message === "PRODUCT_UNAVAILABLE" || message === "VARIANT_UNAVAILABLE") {
      return NextResponse.json({ error: "One or more quoted products or variants are no longer available." }, { status: 409 });
    }
    if (message.startsWith("OUT_OF_STOCK:")) {
      return NextResponse.json({ error: `${message.slice("OUT_OF_STOCK:".length)} does not have enough stock.` }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Stock changed during conversion. Review the quotation and try once more." }, { status: 409 });
    }
    console.error("Quote conversion failed", error);
    return NextResponse.json({ error: "Quote conversion failed. No order or stock changes were saved." }, { status: 503 });
  }
}
