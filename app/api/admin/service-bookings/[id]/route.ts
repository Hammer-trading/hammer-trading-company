import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { activityActorId, requirePermission } from "@/lib/auth";
import { serviceBookingUpdateSchema } from "@/lib/platform-validation";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const admin = await requirePermission("SERVICES_MANAGE");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const ip = getClientIp(request);
  if (!rateLimit(`service-booking-update:${admin.id}:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many booking updates. Please wait a minute." }, { status: 429 });
  }
  const parsed = serviceBookingUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update", details: parsed.error.flatten() }, { status: 400 });
  const { id } = await context.params;
  try {
    const before = await prisma.serviceBooking.findUnique({ where: { id }, include: { items: true } });
    if (!before) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (before.convertedOrderId && parsed.data.items) {
      return NextResponse.json({ error: "Converted booking products cannot be changed" }, { status: 409 });
    }

    const { items, serviceCharge: requestedServiceCharge, quotationAmount, ...bookingUpdate } = parsed.data;
    const serviceCharge = requestedServiceCharge === undefined ? Number(before.serviceCharge) : requestedServiceCharge;
    let materialSubtotal = Number(before.materialSubtotal);
    let normalizedItems: Array<{
      productId: string;
      variantId: string | null;
      name: string;
      sku: string;
      variantTitle: string | null;
      variantOptions?: Prisma.InputJsonValue;
      quantity: number;
      unitPrice: number;
      costPrice: number;
      total: number;
      sortOrder: number;
    }> | null = null;

    if (items) {
      const productIds = Array.from(new Set(items.map((item) => item.productId)));
      const products = await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: { variants: true }
      });
      if (products.length !== productIds.length) return NextResponse.json({ error: "One or more products are unavailable" }, { status: 409 });
      normalizedItems = items.map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        const variant = item.variantId ? product?.variants.find((entry) => entry.id === item.variantId && entry.isActive) : null;
        if (!product || (item.variantId && !variant)) throw new Error("A selected product variant is unavailable");
        return {
          productId: product.id,
          variantId: variant?.id || null,
          name: product.name,
          sku: variant?.sku || product.sku,
          variantTitle: variant?.title || null,
          variantOptions: variant?.options as Prisma.InputJsonValue | undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: Number(variant?.costPrice ?? product.costPrice),
          total: item.unitPrice * item.quantity,
          sortOrder: item.sortOrder
        };
      });
      materialSubtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0);
    }

    const computedTotal = materialSubtotal + serviceCharge;
    const quotedTotal = items || requestedServiceCharge !== undefined
      ? computedTotal
      : quotationAmount === null ? null : quotationAmount ?? (before.quotedTotal ? Number(before.quotedTotal) : null);
    if ((bookingUpdate.status === "QUOTATION_SENT" || bookingUpdate.status === "APPROVED") && (!before.items.length && !normalizedItems?.length)) {
      return NextResponse.json({ error: "Add quotation products before sending or approving the quotation" }, { status: 409 });
    }

    const booking = await prisma.$transaction(async (tx) => {
      if (normalizedItems) {
        await tx.serviceBookingItem.deleteMany({ where: { bookingId: id } });
      }
      return tx.serviceBooking.update({
        where: { id },
        data: {
          ...bookingUpdate,
          materialSubtotal,
          serviceCharge,
          quotedTotal,
          quotationAmount: quotedTotal,
          items: normalizedItems ? { create: normalizedItems } : undefined
        },
        include: {
          service: true,
          package: true,
          items: { include: { product: true, variant: true }, orderBy: { sortOrder: "asc" } },
          convertedOrder: { select: { orderNumber: true, invoiceNumber: true, total: true } }
        }
      });
    });
    await prisma.activityLog.create({
      data: {
        actorId: activityActorId(admin),
        action: "SERVICE_BOOKING_UPDATED",
        entity: "ServiceBooking",
        entityId: id,
        previousValue: { status: before.status, quotedTotal: before.quotedTotal },
        newValue: { status: booking.status, quotedTotal: booking.quotedTotal, itemCount: booking.items.length },
        ipAddress: ip
      }
    });
    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Service booking update failed", error);
    return NextResponse.json({ error: "Update failed" }, { status: 503 });
  }
}
