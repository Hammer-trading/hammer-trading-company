import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export async function GET() {
  const admin = await requirePermission(Permission.DELIVERY_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const couriers = await prisma.courier.findMany({ include: { orders: true }, orderBy: { name: "asc" } });
  return NextResponse.json(couriers);
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.DELIVERY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const courier = await prisma.courier.create({
    data: {
      name: String(body.name || ""),
      slug: slugify(String(body.slug || body.name || "")),
      provider: String(body.provider || body.name || "LOCAL").toUpperCase().replaceAll(" ", "_"),
      phone: body.phone || null,
      website: body.website || null,
      apiBaseUrl: body.apiBaseUrl || null,
      isActive: body.isActive ?? true
    }
  });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "COURIER_CREATED", metadata: { courierId: courier.id } } });
  return NextResponse.json(courier, { status: 201 });
}
