import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { PaymentMethod, Prisma } from "@prisma/client";
import type { z } from "zod";
import { tryDatabase } from "@/lib/db-fallback";
import { calculateDelivery } from "@/lib/delivery";
import { getSession } from "@/lib/auth";
import { enqueueNotification } from "@/lib/integrations";
import { createAdminNotification } from "@/lib/order-automation";
import { hasProductVariantSchema } from "@/lib/product-variant-schema";
import { prisma } from "@/lib/prisma";
import { hashToken, makeToken, otpCode } from "@/lib/qr";
import { checkoutSchema } from "@/lib/validation";
import { invoiceNumber, orderNumber } from "@/lib/utils";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { getAuthSettings } from "@/lib/auth-settings";
import { validateCoupon } from "@/lib/coupons";
import { getAppUrl } from "@/lib/app-url";

type CheckoutData = z.infer<typeof checkoutSchema>;

function variantOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, option]) => [key, String(option)]));
}

export async function POST(request: Request) {
  let checkoutData: CheckoutData | null = null;
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    if (!rateLimit(`checkout:${getClientIp(request)}`, 8, 60_000)) return NextResponse.json({ error: "Too many checkout attempts. Please wait a minute." }, { status: 429 });
    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid checkout details", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    checkoutData = data;
    const session = await getSession();
    const customerUserId = session?.role === "CUSTOMER" ? session.id : null;
    const authSettings = await getAuthSettings();
    if (!customerUserId && (!authSettings.guestCheckoutEnabled || authSettings.loginRequiredForCheckout)) {
      return NextResponse.json({ error: "Please sign in to complete checkout" }, { status: 401 });
    }
    if (!customerUserId && authSettings.guestEmailRequired && !data.customerEmail) {
      return NextResponse.json({ error: "Email is required for guest checkout" }, { status: 400 });
    }
    const paymentSetting = await prisma.systemSetting.findUnique({ where: { key: "payment_methods" } });
    const enabledPaymentMethods = (paymentSetting?.value || "COD")
      .split(",")
      .map((value) => value.trim().toUpperCase())
      .filter((value) => value === "COD" || value === "BANK_TRANSFER");
    if (!enabledPaymentMethods.includes(data.paymentMethod)) {
      return NextResponse.json({ error: "The selected payment method is currently unavailable." }, { status: 400 });
    }
    const supportsVariants = await hasProductVariantSchema();
    const dbProducts = await tryDatabase(() => prisma.product.findMany({
      where: {
        isActive: true,
        id: { in: data.items.map((line) => line.productId) }
      },
      include: { inventory: true, ...(supportsVariants ? { variants: true } : {}) }
    }), 900);
    if (!dbProducts) return NextResponse.json({ error: "Checkout service is temporarily unavailable. Please try again shortly." }, { status: 503 });
    const products = data.items.map((line) => {
      const product = dbProducts.find((item) => item.id === line.productId);
      if (!product) return null;
      const variants = "variants" in product && Array.isArray(product.variants) ? product.variants : [];
      const variant = line.variantId
        ? variants.find((item) => item.id === line.variantId && item.isActive)
        : variants.find((item) => item.isDefault && item.isActive) || variants.find((item) => item.isActive);
      if (line.variantId && !variant) return null;
      return { ...line, product, variant: variant || null };
    }).filter(Boolean) as Array<{ productId: string; variantId?: string | null; packageId?: string | null; quantity: number; product: typeof dbProducts[number]; variant: { id: string; title: string; sku: string; options: unknown; price: Prisma.Decimal | number; costPrice: Prisma.Decimal | number; stock: number } | null }>;

    if (products.length !== data.items.length) return NextResponse.json({ error: "One or more selected products are unavailable." }, { status: 409 });

    const packageIds = Array.from(new Set(products.map((line) => line.packageId).filter((value): value is string => Boolean(value))));
    const packages = packageIds.length ? await prisma.productPackage.findMany({
      where: { id: { in: packageIds }, status: "PUBLISHED", isActive: true },
      include: { items: true }
    }) : [];
    if (packages.length !== packageIds.length) return NextResponse.json({ error: "One or more selected packages are no longer available." }, { status: 409 });

    const packageSnapshots = new Map<string, { name: string; sku: string }>();
    let packageDiscount = 0;
    for (const bundle of packages) {
      const selectedLines = products.filter((line) => line.packageId === bundle.id);
      if (selectedLines.length !== bundle.items.length) return NextResponse.json({ error: `${bundle.name} items have changed. Add the package again.` }, { status: 409 });
      let packageCount: number | null = null;
      let packageSubtotal = 0;
      for (const packageItem of bundle.items) {
        const line = selectedLines.find((candidate) => candidate.productId === packageItem.productId && (candidate.variantId || null) === (packageItem.variantId || null));
        if (!line || line.quantity % packageItem.quantity !== 0) return NextResponse.json({ error: `${bundle.name} quantities must stay in their original proportions.` }, { status: 409 });
        const linePackageCount = line.quantity / packageItem.quantity;
        if (linePackageCount < 1 || (packageCount !== null && packageCount !== linePackageCount)) return NextResponse.json({ error: `${bundle.name} quantities must stay in their original proportions.` }, { status: 409 });
        packageCount = linePackageCount;
        packageSubtotal += Number(line.variant?.price ?? line.product.price) * line.quantity;
      }
      const count = packageCount || 1;
      const bundleDiscount = Number(bundle.fixedDiscount) * count + packageSubtotal * (bundle.percentageDiscount / 100);
      packageDiscount += Math.min(packageSubtotal, Math.max(0, bundleDiscount));
      packageSnapshots.set(bundle.id, { name: bundle.name, sku: bundle.sku });
    }

    const allowNegative = (await prisma.systemSetting.findUnique({ where: { key: "allow_negative_stock" } }))?.value === "true";
    const unavailable = products.find((line) => {
      const stock = line.variant ? line.variant.stock : line.product.stock;
      return !allowNegative && stock < line.quantity;
    });
    if (unavailable) {
      const stock = unavailable.variant ? unavailable.variant.stock : unavailable.product.stock;
      return NextResponse.json({ error: `${unavailable.product.name} has only ${stock} in stock` }, { status: 409 });
    }

    const subtotal = products.reduce((sum, line) => sum + Number(line.variant?.price ?? line.product.price) * line.quantity, 0);
    const adjustedSubtotal = Math.max(0, subtotal - packageDiscount);
    const couponCode = data.couponCode?.trim().toUpperCase();
    const couponValidation = couponCode
      ? await validateCoupon({
          code: couponCode,
          userId: customerUserId,
          customerPhone: data.customerPhone,
          adjustedSubtotal,
          lines: products.map((line) => ({
            productId: line.productId,
            categoryId: line.product.categoryId,
            unitPrice: Number(line.variant?.price ?? line.product.price),
            quantity: line.quantity
          }))
        })
      : null;
    if (couponValidation && !couponValidation.valid) {
      return NextResponse.json({ error: couponValidation.error }, { status: 400 });
    }
    const couponApplies = Boolean(couponValidation?.valid);
    const couponDiscount = couponValidation?.valid ? couponValidation.discount : 0;
    const discount = Math.min(subtotal, packageDiscount + couponDiscount);
    const totalWeightKg = products.reduce((sum, line) => sum + Number(line.product.weightKg) * line.quantity, 0);
    const hasHeavyItem = products.some((line) => line.product.isHeavyItem);
    const hasBulkyItem = products.some((line) => line.product.isBulky);
    const quantity = products.reduce((sum, line) => sum + line.quantity, 0);
    const rules = await prisma.deliveryRule.findMany();
    const quote = calculateDelivery({ city: data.city, area: data.area, subtotal, totalWeightKg, hasHeavyItem, hasBulkyItem, quantity }, rules);
    const deliveryCharge = couponValidation?.valid && couponValidation.freeDelivery ? 0 : quote.charge;
    const total = subtotal - discount + deliveryCharge;
    const orderNo = orderNumber();
    const invoiceNo = invoiceNumber();
    const otp = otpCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const token = await makeToken({ orderNumber: orderNo, type: "DELIVERY_CONFIRMATION" }, "7d");
    const appUrl = getAppUrl();

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
      data: {
        orderNumber: orderNo,
        invoiceNumber: invoiceNo,
        userId: customerUserId,
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone,
        province: data.province,
        city: data.city,
        area: data.area,
        addressLine: data.addressLine,
        nearestLandmark: data.nearestLandmark,
        subtotal,
        discountTotal: discount,
        deliveryCharge,
        total,
        couponCode: couponApplies ? couponCode : null,
        codAmount: data.paymentMethod === "COD" ? total : null,
        profitMargin: products.reduce((sum, line) => sum + (Number(line.variant?.price ?? line.product.price) - Number(line.variant?.costPrice ?? line.product.costPrice)) * line.quantity, 0),
        paymentMethod: data.paymentMethod as PaymentMethod,
        estimatedDeliveryAt: new Date(Date.now() + quote.estimatedDaysMax * 24 * 60 * 60 * 1000),
        otpHash: await bcrypt.hash(otp, 12),
        qrTokenHash: hashToken(token),
        qrExpiresAt: expiresAt,
        items: {
          create: products.map((line) => ({
            productId: line.product.id,
            variantId: line.variant?.id || null,
            name: line.product.name,
            sku: line.variant?.sku || line.product.sku,
            variantTitle: line.variant?.title || null,
            variantOptions: line.variant ? variantOptions(line.variant.options) : undefined,
            packageId: line.packageId || null,
            packageName: line.packageId ? packageSnapshots.get(line.packageId)?.name || null : null,
            packageSku: line.packageId ? packageSnapshots.get(line.packageId)?.sku || null : null,
            quantity: line.quantity,
            price: line.variant?.price || line.product.price,
            costPrice: line.variant?.costPrice || line.product.costPrice,
            total: Number(line.variant?.price ?? line.product.price) * line.quantity
          }))
        },
        timeline: {
          create: {
            status: "PENDING",
            note: `Order placed${packageIds.length ? ` with ${packageIds.length} package${packageIds.length > 1 ? "s" : ""}` : ""}. Delivery rule: ${quote.ruleName}. Delivery OTP generated; notification delivery is pending.`
          }
        },
        qrcodes: {
          create: {
            type: "DELIVERY_CONFIRMATION",
            tokenHash: hashToken(token),
            url: `${appUrl}/confirm-delivery?token=${encodeURIComponent(token)}`,
            expiresAt
          }
        }
      }
      });
      for (const line of products) {
        const previous = line.product.stock;
        const next = previous - line.quantity;
        const updatedProduct = await tx.product.updateMany({
          where: allowNegative ? { id: line.product.id } : { id: line.product.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } }
        });
        if (updatedProduct.count !== 1) throw new Error(`${line.product.name} is no longer in stock`);
        await tx.inventory.upsert({
          where: { productId: line.product.id },
          update: { currentStock: { decrement: line.quantity } },
          create: { productId: line.product.id, currentStock: next, minStockLevel: line.product.lowStockThreshold }
        });
        if (supportsVariants && line.variant) {
          const updatedVariant = await tx.productVariant.updateMany({
            where: allowNegative ? { id: line.variant.id, isActive: true } : { id: line.variant.id, isActive: true, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } }
          });
          if (updatedVariant.count !== 1) throw new Error(`${line.product.name} variant is no longer in stock`);
        }
        await tx.inventoryLog.create({ data: { productId: line.product.id, type: "ORDER_REDUCTION", quantity: -line.quantity, previousStock: previous, newStock: next, reason: `Order ${orderNo}`, orderId: createdOrder.id } });
      }
      if (couponApplies && couponCode) {
        await tx.coupon.update({ where: { code: couponCode }, data: { usedCount: { increment: 1 } } });
      }
      return createdOrder;
    }, { maxWait: 15_000, timeout: 20_000 });

    void Promise.all([
      createAdminNotification(prisma, "New order received", `${orderNo} from ${data.customerName}`, `/admin/orders?order=${orderNo}`),
      enqueueNotification("SMS", { to: data.customerPhone, subject: "Delivery OTP", message: `Your ${orderNo} delivery OTP is ${otp}` }),
      enqueueNotification("WHATSAPP", { to: data.customerPhone, subject: "Order placed", message: `Order ${orderNo} placed. Track: ${appUrl}/orders/${orderNo}` }),
      data.customerEmail ? enqueueNotification("EMAIL", { to: data.customerEmail, subject: `Order ${orderNo}`, message: `Your order total is ${total}.` }) : Promise.resolve()
    ]).catch((notificationError) => {
      console.error("Checkout notification failed", notificationError);
    });

    return NextResponse.json({ orderNumber: order.orderNumber, invoiceNumber: order.invoiceNumber, total });
  } catch (error) {
    console.error(error);
    if (error instanceof Error && error.message.includes("no longer in stock")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (checkoutData) return NextResponse.json({ error: "Checkout service is unavailable. Please try again shortly." }, { status: 503 });
    return NextResponse.json({ error: "Checkout service is unavailable. Verify DATABASE_URL and run migrations." }, { status: 503 });
  }
}
