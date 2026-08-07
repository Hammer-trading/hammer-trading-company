import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.SUPPORT_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.toUpperCase();
  const query = url.searchParams.get("q")?.trim();
  const rows = await prisma.roomServiceRequest.findMany({
    where: {
      ...(status && status !== "ALL" ? { status } : {}),
      ...(query ? {
        OR: [
          { requestNumber: { contains: query, mode: "insensitive" } },
          { customerName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { city: { contains: query, mode: "insensitive" } }
        ]
      } : {})
    },
    include: { package: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 150
  });
  return NextResponse.json(rows.map((row) => ({
    ...row,
    estimatedTotal: row.estimatedTotal == null ? null : Number(row.estimatedTotal)
  })));
}
