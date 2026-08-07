import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.REVIEWS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const before = await prisma.review.findUnique({ where: { id } });
  const review = await prisma.review.update({ where: { id }, data: { isApproved: body.isApproved, isRejected: body.isRejected, reply: body.reply, isVerifiedPurchase: body.isVerifiedPurchase, isAbusive: body.isAbusive } });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "REVIEW_UPDATED", entity: "Review", entityId: id, previousValue: before as never, newValue: review as never } });
  return NextResponse.json(review);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.REVIEWS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.review.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
