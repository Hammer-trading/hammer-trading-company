import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { couponInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/security";

export async function GET() {
  const admin = await requirePermission(Permission.COUPONS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.coupon.updateMany({ where: { expiresAt: { lt: new Date() }, isActive: true }, data: { isActive: false } });
  return NextResponse.json(await prisma.coupon.findMany({ orderBy: { startsAt: "desc" } }));
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.COUPONS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = couponInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid coupon", details: parsed.error.flatten() }, { status: 400 });
  const coupon = await prisma.coupon.create({ data: parsed.data });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "COUPON_CREATED", entity: "Coupon", entityId: coupon.id, newValue: coupon as never, ipAddress: getClientIp(request) } });
  return NextResponse.json(coupon, { status: 201 });
}
