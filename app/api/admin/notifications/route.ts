import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requirePermission(Permission.DASHBOARD_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return NextResponse.json(items);
}
