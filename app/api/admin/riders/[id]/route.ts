import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.DELIVERY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const rider = await prisma.rider.update({ where: { id }, data: { name: body.name, phone: body.phone, city: body.city, vehicle: body.vehicle, userId: body.userId || null, isActive: body.isActive } });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "RIDER_UPDATED", metadata: { riderId: id } } });
  return NextResponse.json(rider);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.DELIVERY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.rider.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
