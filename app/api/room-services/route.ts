import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminNotification } from "@/lib/order-automation";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { roomServiceRequestSchema } from "@/lib/validation";
import { referenceNumber } from "@/lib/utils";

function requestNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `HTC-RS-${date}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`room-service:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many service requests. Please try again shortly." }, { status: 429 });
  }
  const parsed = roomServiceRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Please check the service request details.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const data = parsed.data;
    const canonicalPackage = data.packageId ? await prisma.productPackage.findFirst({
      where: { id: data.packageId, status: "PUBLISHED", isActive: true, installationServiceId: { not: null } },
      include: {
        installationService: true,
        items: { include: { product: true, variant: true }, orderBy: { sortOrder: "asc" } }
      }
    }) : null;
    const canonicalService = canonicalPackage?.installationService || (!data.packageId ? await prisma.homeService.findFirst({
      where: { status: "PUBLISHED", isActive: true, bookingEnabled: true },
      orderBy: [{ showOnHomepage: "desc" }, { sortOrder: "asc" }]
    }) : null);
    if (canonicalService) {
      const session = await getSession();
      const serviceRequest = await prisma.serviceBooking.create({
        data: {
          requestNumber: referenceNumber("HTC-SVC"),
          serviceId: canonicalService.id,
          packageId: canonicalPackage?.id || null,
          packageSnapshot: canonicalPackage ? {
            id: canonicalPackage.id,
            name: canonicalPackage.name,
            sku: canonicalPackage.sku,
            originalPrice: Number(canonicalPackage.originalPrice),
            finalPrice: Number(canonicalPackage.finalPrice),
            items: canonicalPackage.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              name: item.product.name,
              sku: item.variant?.sku || item.product.sku,
              quantity: item.quantity,
              unitPrice: Number(item.variant?.price ?? item.product.price)
            }))
          } as Prisma.InputJsonValue : undefined,
          userId: session?.role === "CUSTOMER" && !session.id.startsWith("dev-") ? session.id : null,
          customerName: data.customerName,
          phone: data.phone,
          email: data.email || null,
          address: data.address,
          city: data.city,
          preferredDate: data.preferredDate || null,
          projectDetails: [data.roomType, data.roomSize].filter(Boolean).join(" · "),
          customerNote: data.note || null,
          materialSubtotal: canonicalPackage?.finalPrice || 0,
          serviceCharge: canonicalService.fixedPrice || 0,
          items: canonicalPackage ? {
            create: canonicalPackage.items.map((item, sortOrder) => ({
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
      await createAdminNotification(
        prisma,
        "New room installation request",
        `${serviceRequest.customerName} requested ${canonicalPackage?.name || canonicalService.name}`,
        `/admin/website?tab=bookings&id=${serviceRequest.id}`
      );
      return NextResponse.json({ ok: true, requestNumber: serviceRequest.requestNumber, source: "unified-services" }, { status: 201 });
    }
    const selectedPackage = data.packageId ? await prisma.roomPackage.findFirst({
      where: { id: data.packageId, isActive: true },
      select: { id: true, name: true }
    }) : null;
    const serviceRequest = await prisma.roomServiceRequest.create({
      data: {
        requestNumber: requestNumber(),
        packageId: selectedPackage?.id || null,
        customerName: data.customerName,
        phone: data.phone,
        email: data.email || null,
        address: data.address,
        city: data.city,
        roomType: data.roomType,
        roomSize: data.roomSize || null,
        preferredDate: data.preferredDate || null,
        note: data.note || null
      }
    });
    await createAdminNotification(
      prisma,
      "New room installation request",
      `${serviceRequest.customerName} requested ${selectedPackage?.name || serviceRequest.roomType}`,
      `/admin/room-services?id=${serviceRequest.id}`
    );
    return NextResponse.json({ ok: true, requestNumber: serviceRequest.requestNumber }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Room service is temporarily unavailable." }, { status: 503 });
  }
}
