import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.REVIEWS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rating = Number(new URL(request.url).searchParams.get("rating") || 0);
  return NextResponse.json(await prisma.review.findMany({ where: rating ? { rating } : undefined, include: { product: true, user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }));
}
