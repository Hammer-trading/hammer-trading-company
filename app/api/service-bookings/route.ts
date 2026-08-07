import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminNotification } from "@/lib/order-automation";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { serviceBookingSchema } from "@/lib/platform-validation";
import { referenceNumber } from "@/lib/utils";
import { enqueueNotification } from "@/lib/integrations";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`service-booking:${ip}`, 8, 60_000)) return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  const parsed = serviceBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking details", details: parsed.error.flatten() }, { status: 400 });
  try {
    const session = await getSession();
    const service = await prisma.homeService.findFirst({ where: { id: parsed.data.serviceId, status: "PUBLISHED", isActive: true, bookingEnabled: true } });
    if (!service) return NextResponse.json({ error: "This service is not available for booking" }, { status: 409 });
    const packageId = parsed.data.packageId || null;
    const bundle = packageId ? await prisma.productPackage.findFirst({
      where: { id: packageId, installationServiceId: service.id, status: "PUBLISHED", isActive: true },
      include: {
        items: {
          include: { product: true, variant: true },
          orderBy: { sortOrder: "asc" }
        }
      }
    }) : null;
    if (packageId && !bundle) return NextResponse.json({ error: "The selected package is not available for this service" }, { status: 409 });
    const requestNumber = referenceNumber("HTC-SVC");
    const packageSnapshot = bundle ? {
      id: bundle.id,
      name: bundle.name,
      sku: bundle.sku,
      originalPrice: Number(bundle.originalPrice),
      finalPrice: Number(bundle.finalPrice),
      items: bundle.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        name: item.product.name,
        sku: item.variant?.sku || item.product.sku,
        variantTitle: item.variant?.title || null,
        variantOptions: item.variant?.options || null,
        quantity: item.quantity,
        unitPrice: Number(item.variant?.price ?? item.product.price)
      }))
    } : null;
    const bookingDetails = { ...parsed.data };
    delete bookingDetails.packageId;
    const booking = await prisma.serviceBooking.create({
      data: {
        ...bookingDetails,
        packageId,
        packageSnapshot: packageSnapshot ? packageSnapshot as Prisma.InputJsonValue : Prisma.JsonNull,
        materialSubtotal: bundle ? bundle.finalPrice : 0,
        serviceCharge: service.fixedPrice || 0,
        email: parsed.data.email || null,
        userId: session?.role === "CUSTOMER" && !session.id.startsWith("dev-") ? session.id : null,
        requestNumber,
        items: bundle ? {
          create: bundle.items.map((item, sortOrder) => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.product.name,
            sku: item.variant?.sku || item.product.sku,
            variantTitle: item.variant?.title || null,
            variantOptions: item.variant?.options as Prisma.InputJsonValue | undefined,
            quantity: item.quantity,
            unitPrice: item.variant?.price || item.product.price,
            costPrice: item.variant?.costPrice || item.product.costPrice,
            total: Number(item.variant?.price ?? item.product.price) * item.quantity,
            sortOrder
          }))
        } : undefined
      }
    });
    await Promise.all([
      createAdminNotification(prisma, "New service booking", `${requestNumber}: ${service.name}${bundle ? ` / ${bundle.name}` : ""}`, `/admin/website?tab=bookings`),
      prisma.activityLog.create({ data: { actorId: session?.id && !session.id.startsWith("dev-") ? session.id : null, action: "SERVICE_BOOKING_CREATED", entity: "ServiceBooking", entityId: booking.id, ipAddress: ip } }),
      parsed.data.email ? enqueueNotification("EMAIL", { to: parsed.data.email, subject: `Service request ${requestNumber}`, message: `Your request for ${service.name} has been received. Our team will contact you shortly.` }) : Promise.resolve()
    ]).catch(() => undefined);
    return NextResponse.json({ booking: { id: booking.id, requestNumber: booking.requestNumber, status: booking.status } }, { status: 201 });
  } catch (error) {
    console.error("Service booking failed", error);
    return NextResponse.json({ error: "Booking could not be saved. Please try again." }, { status: 503 });
  }
}
