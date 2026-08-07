import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requirePermission(Permission.INVENTORY_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const setting = await prisma.systemSetting.findUnique({ where: { key: "allow_negative_stock" } });
  return NextResponse.json({ allowNegativeStock: setting?.value === "true" });
}

export async function PATCH(request: Request) {
  const admin = await requirePermission(Permission.INVENTORY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const setting = await prisma.systemSetting.upsert({
    where: { key: "allow_negative_stock" },
    update: { value: body.allowNegativeStock ? "true" : "false" },
    create: { key: "allow_negative_stock", value: body.allowNegativeStock ? "true" : "false" }
  });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "INVENTORY_SETTING_UPDATED", metadata: { allowNegativeStock: setting.value } } });
  return NextResponse.json({ allowNegativeStock: setting.value === "true" });
}
