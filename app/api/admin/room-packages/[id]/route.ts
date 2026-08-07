import { Permission } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { roomPackageInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRoomPackageImageProxy, serializeRoomPackage } from "@/lib/room-services";
import { getClientIp } from "@/lib/security";
import { slugify } from "@/lib/utils";

function auditPackage(row: { id: string; name: string; slug: string; roomType: string; price: unknown; isActive: boolean; image: string | null }) {
  return { ...row, price: Number(row.price), image: row.image ? "[stored image]" : null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.PRODUCTS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = roomPackageInputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Please check the package details.", details: parsed.error.flatten() }, { status: 400 });
  const existing = await prisma.roomPackage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Package not found." }, { status: 404 });
  try {
    const data = {
      ...parsed.data,
      slug: slugify(parsed.data.slug || parsed.data.name),
      image: isRoomPackageImageProxy(parsed.data.image, id) ? existing.image : parsed.data.image,
      items: parsed.data.items
    };
    const roomPackage = await prisma.roomPackage.update({ where: { id }, data });
    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        action: "ROOM_PACKAGE_UPDATED",
        entity: "RoomPackage",
        entityId: id,
        previousValue: auditPackage(existing) as never,
        newValue: auditPackage(roomPackage) as never,
        ipAddress: getClientIp(request)
      }
    });
    revalidateTag("room-packages");
    return NextResponse.json({ ...serializeRoomPackage(roomPackage), isActive: roomPackage.isActive });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    return NextResponse.json({ error: code === "P2002" ? "A package with this slug already exists." : "Package could not be updated." }, { status: code === "P2002" ? 409 : 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.PRODUCTS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.roomPackage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Package not found." }, { status: 404 });
  await prisma.roomPackage.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      action: "ROOM_PACKAGE_DELETED",
      entity: "RoomPackage",
      entityId: id,
      previousValue: auditPackage(existing) as never,
      ipAddress: getClientIp(request)
    }
  });
  revalidateTag("room-packages");
  return NextResponse.json({ ok: true });
}
