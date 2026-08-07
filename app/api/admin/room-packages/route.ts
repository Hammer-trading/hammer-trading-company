import { Permission } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { roomPackageInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeRoomPackage } from "@/lib/room-services";
import { getClientIp } from "@/lib/security";
import { slugify } from "@/lib/utils";

function auditPackage(row: { id: string; name: string; slug: string; roomType: string; price: unknown; isActive: boolean; image: string | null }) {
  return { ...row, price: Number(row.price), image: row.image ? "[stored image]" : null };
}

export async function GET() {
  const admin = await requirePermission(Permission.PRODUCTS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.roomPackage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  return NextResponse.json(rows.map((row) => ({ ...serializeRoomPackage(row), isActive: row.isActive })));
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.PRODUCTS_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = roomPackageInputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Please check the package details.", details: parsed.error.flatten() }, { status: 400 });
  try {
    const roomPackage = await prisma.roomPackage.create({
      data: { ...parsed.data, slug: slugify(parsed.data.slug || parsed.data.name), items: parsed.data.items }
    });
    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        action: "ROOM_PACKAGE_CREATED",
        entity: "RoomPackage",
        entityId: roomPackage.id,
        newValue: auditPackage(roomPackage) as never,
        ipAddress: getClientIp(request)
      }
    });
    revalidateTag("room-packages");
    return NextResponse.json({ ...serializeRoomPackage(roomPackage), isActive: roomPackage.isActive }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    return NextResponse.json({ error: code === "P2002" ? "A package with this slug already exists." : "Package could not be saved." }, { status: code === "P2002" ? 409 : 500 });
  }
}
