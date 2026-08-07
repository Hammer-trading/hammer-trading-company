import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { activityActorId, requirePermission } from "@/lib/auth";
import { calculateDelivery } from "@/lib/delivery";
import { createAdminNotification } from "@/lib/order-automation";
import { deductOrderStock } from "@/lib/order-stock";
import { prisma } from "@/lib/prisma";
import { hashToken, makeToken, otpCode } from "@/lib/qr";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { invoiceNumber, orderNumber } from "@/lib/utils";
import { getAppUrl } from "@/lib/app-url";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const admin = await requirePermission("ORDERS_WRITE");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`service-convert:${admin.id}:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many conversion requests" }, { status: 429 });
  }
  const { id } = await context.params;

  try {
    const booking = await prisma.serviceBooking.findUnique({
      where: { id },
      include: {
        service: true,
        package: true,
        items: {
          include: { product: true, variant: true },
          orderBy: { sortOrder: "asc" }
        }
      }
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.convertedOrderId) return NextResponse.json({ error: "Booking is already converted" }, { status: 409 });
    if (booking.status !== "APPROVED") return NextResponse.json({ error: "Approve the quotation before converting it" }, { status: 409 });
    if (!booking.items.length) return NextResponse.json({ error: "Add quotation products before converting" }, { status: 409 });

    const materialSubtotal = booking.items.reduce((sum, item) => sum + Number(item.total), 0);
    const serviceCharge = Number(booking.serviceCharge);
    const subtotal = materialSubtotal + serviceCharge;
    const totalWeightKg = booking.items.reduce((sum, item) => sum + Number(item.product.weightKg) * item.quantity, 0);
    const rules = await prisma.deliveryRule.findMany();
    const delivery = calculateDelivery({
      city: booking.city,
      area: booking.area || undefined,
      subtotal,
      totalWeightKg,
      hasHeavyItem: booking.items.some((item) => item.product.isHeavyItem),
      hasBulkyItem: booking.items.some((item) => item.product.isBulky),
      quantity: booking.items.reduce((sum, item) => sum + item.quantity, 0)
    }, rules);
    const total = subtotal + delivery.charge;
    const orderNo = orderNumber();
    const invoiceNo = invoiceNumber();
    const otp = otpCode();
    const token = await makeToken({ orderNumber: orderNo, type: "DELIVERY_CONFIRMATION" }, "7d");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const appUrl = getAppUrl();
    const actorId = activityActorId(admin);

    const order = await prisma.$transaction(async (tx) => {
      const current = await tx.serviceBooking.findUnique({ where: { id }, select: { convertedOrderId: true } });
      if (current?.convertedOrderId) throw new Error("Booking is already converted");

      const created = await tx.order.create({
        data: {
          orderNumber: orderNo,
          invoiceNumber: invoiceNo,
          userId: booking.userId,
          customerName: booking.customerName,
          customerEmail: booking.email,
          customerPhone: booking.phone,
          province: "To be confirmed",
          city: booking.city,
          area: booking.area,
          addressLine: booking.address,
          subtotal,
          serviceCharge,
          discountTotal: 0,
          deliveryCharge: delivery.charge,
          total,
          codAmount: total,
          profitMargin: booking.items.reduce((sum, item) => sum + (Number(item.unitPrice) - Number(item.costPrice)) * item.quantity, serviceCharge),
          paymentMethod: "COD",
          paymentStatus: "PENDING",
          estimatedDeliveryAt: new Date(Date.now() + delivery.estimatedDaysMax * 24 * 60 * 60 * 1000),
          otpHash: await bcrypt.hash(otp, 12),
          qrTokenHash: tokenHash,
          qrExpiresAt: expiresAt,
          internalNotes: `Converted from service booking ${booking.requestNumber}. ${booking.internalNote || ""}`.trim(),
          customerNotes: booking.customerNote,
          items: {
            create: booking.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              name: item.name,
              sku: item.sku,
              variantTitle: item.variantTitle,
              variantOptions: item.variantOptions || undefined,
              packageId: booking.packageId,
              packageName: booking.package?.name || null,
              packageSku: booking.package?.sku || null,
              quantity: item.quantity,
              price: item.unitPrice,
              costPrice: item.costPrice,
              total: item.total
            }))
          },
          timeline: {
            create: {
              status: "PENDING",
              actorId,
              note: `Converted from service request ${booking.requestNumber}. Delivery rule: ${delivery.ruleName}. Delivery OTP generated; notification pending.`
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

      await deductOrderStock(
        tx,
        booking.items,
        { orderId: created.id, orderNumber: orderNo, actorId },
        `Service booking ${booking.requestNumber} converted to ${orderNo}`
      );

      await tx.serviceBooking.update({
        where: { id },
        data: { convertedOrderId: created.id, status: "SCHEDULED", quotedTotal: subtotal, quotationAmount: subtotal }
      });
      await tx.activityLog.create({
        data: {
          actorId,
          orderId: created.id,
          action: "SERVICE_BOOKING_CONVERTED_TO_ORDER",
          entity: "ServiceBooking",
          entityId: id,
          metadata: { requestNumber: booking.requestNumber, orderNumber: orderNo }
        }
      });
      return created;
    }, { maxWait: 15_000, timeout: 25_000, isolationLevel: "Serializable" });

    await createAdminNotification(prisma, "Service order created", `${booking.requestNumber} converted to ${order.orderNumber}`, `/admin/orders?order=${order.orderNumber}`);
    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, invoiceNumber: order.invoiceNumber });
  } catch (error) {
    console.error("Service booking conversion failed", error);
    const message = error instanceof Error ? error.message : "Conversion failed";
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Stock or booking status changed during conversion. Review it and try once more." }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: message.includes("stock") || message.includes("already converted") ? 409 : 503 });
  }
}
