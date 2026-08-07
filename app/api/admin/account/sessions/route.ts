import { NextResponse } from "next/server";
import { activityActorId, clearSessionCookie, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin || admin.id.startsWith("dev-")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`admin:sessions:all:${admin.id}:${ip}`, 3, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  await prisma.$transaction([
    prisma.user.update({ where: { id: admin.id }, data: { sessionVersion: { increment: 1 } } }),
    prisma.userSession.updateMany({ where: { userId: admin.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.activityLog.create({ data: { actorId: activityActorId(admin), action: "ADMIN_ALL_SESSIONS_REVOKED", entity: "User", entityId: admin.id, ipAddress: ip } })
  ]);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

