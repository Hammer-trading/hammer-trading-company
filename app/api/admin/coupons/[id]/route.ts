import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { couponInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.COUPONS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = couponInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid coupon", details: parsed.error.flatten() }, { status: 400 });
  const before = await prisma.coupon.findUnique({ where: { id } });
  const coupon = await prisma.coupon.update({ where: { id }, data: parsed.data });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "COUPON_UPDATED", entity: "Coupon", entityId: id, previousValue: before as never, newValue: coupon as never, ipAddress: getClientIp(request) } });
  return NextResponse.json(coupon);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.COUPONS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const before = await prisma.coupon.delete({ where: { id } });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "COUPON_DELETED", entity: "Coupon", entityId: id, previousValue: before as never, ipAddress: getClientIp(request) } });
  return NextResponse.json({ ok: true });
}
