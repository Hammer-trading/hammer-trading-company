import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requirePermission(Permission.DELIVERY_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const riders = await prisma.rider.findMany({ include: { user: true }, orderBy: { name: "asc" } });
  return NextResponse.json(riders);
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.DELIVERY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const rider = await prisma.rider.create({ data: { name: String(body.name || ""), phone: String(body.phone || ""), city: body.city || null, vehicle: body.vehicle || null, userId: body.userId || null, isActive: body.isActive ?? true } });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "RIDER_CREATED", metadata: { riderId: rider.id } } });
  return NextResponse.json(rider, { status: 201 });
}
