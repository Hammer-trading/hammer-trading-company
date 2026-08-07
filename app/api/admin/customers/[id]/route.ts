import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.CUSTOMERS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const before = await prisma.user.findUnique({ where: { id } });
  const customer = await prisma.user.update({ where: { id }, data: { isActive: body.isActive, internalNotes: body.internalNotes } });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "CUSTOMER_UPDATED", entity: "User", entityId: id, previousValue: before as never, newValue: { isActive: customer.isActive, internalNotes: customer.internalNotes }, ipAddress: getClientIp(request) } });
  return NextResponse.json({ ...customer, passwordHash: undefined });
}
