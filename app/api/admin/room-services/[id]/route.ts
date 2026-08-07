import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { roomServiceAdminUpdateSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.SUPPORT_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = roomServiceAdminUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Please check the request update." }, { status: 400 });
  const existing = await prisma.roomServiceRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Service request not found." }, { status: 404 });
  const updated = await prisma.roomServiceRequest.update({ where: { id }, data: parsed.data });
  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      action: "ROOM_SERVICE_UPDATED",
      entity: "RoomServiceRequest",
      entityId: id,
      previousValue: { status: existing.status, estimatedTotal: existing.estimatedTotal == null ? null : Number(existing.estimatedTotal) },
      newValue: { status: updated.status, estimatedTotal: updated.estimatedTotal == null ? null : Number(updated.estimatedTotal) },
      ipAddress: getClientIp(request)
    }
  });
  return NextResponse.json({ ...updated, estimatedTotal: updated.estimatedTotal == null ? null : Number(updated.estimatedTotal) });
}
