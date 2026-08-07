import { Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { courierServices } from "@/lib/couriers";
import { prisma } from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.DELIVERY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const actorId = admin.id === "dev-admin" ? null : admin.id;
  const order = await prisma.order.findUnique({ where: { id }, include: { courier: true, items: { include: { product: true } } } });
  if (!order || !order.courier) return NextResponse.json({ error: "Order or courier not found" }, { status: 404 });
  const key = order.courier.provider.toLowerCase().replaceAll("_", "") as keyof typeof courierServices;
  const service = courierServices[key] || courierServices.localRiders;
  const booking = await service({ orderNumber: order.orderNumber, customerName: order.customerName, customerPhone: order.customerPhone, city: order.city, addressLine: order.addressLine, codAmount: Number(order.codAmount || order.total), weightKg: order.items.reduce((sum, item) => sum + Number(item.product.weightKg) * item.quantity, 0) });
  if (booking.status !== "booked") {
    await prisma.activityLog.create({
      data: {
        actorId,
        orderId: id,
        action: booking.status === "not_configured" ? "COURIER_NOT_CONFIGURED" : "COURIER_BOOKING_FAILED",
        metadata: { courierName: booking.courierName, error: booking.error }
      }
    });
    return NextResponse.json({ error: booking.error, state: booking.status }, { status: booking.status === "not_configured" ? 409 : 502 });
  }
  const updated = await prisma.order.update({ where: { id }, data: { courierBookingId: booking.bookingId, trackingNumber: booking.trackingNumber, courierName: booking.courierName } });
  await prisma.activityLog.create({ data: { actorId, orderId: id, action: "COURIER_BOOKED", metadata: booking as Prisma.InputJsonValue } });
  return NextResponse.json(updated);
}
