import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.DELIVERY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const courier = await prisma.courier.update({
    where: { id },
    data: {
      name: body.name,
      slug: body.slug ? slugify(body.slug) : undefined,
      provider: body.provider,
      phone: body.phone,
      website: body.website,
      apiBaseUrl: body.apiBaseUrl,
      isActive: body.isActive
    }
  });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "COURIER_UPDATED", metadata: { courierId: id } } });
  return NextResponse.json(courier);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.DELIVERY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const count = await prisma.order.count({ where: { courierId: id } });
  if (count) return NextResponse.json({ error: "Courier has assigned orders. Deactivate it instead." }, { status: 409 });
  await prisma.courier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
