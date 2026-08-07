import { NextResponse } from "next/server";
import { activityActorId, clearSessionCookie, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function DELETE(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const admin = await requireAdmin();
  if (!admin || admin.id.startsWith("dev-")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`admin:sessions:one:${admin.id}:${ip}`, 12, 60_000)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { sessionId } = await params;
  const session = await prisma.userSession.findFirst({ where: { id: sessionId, userId: admin.id }, select: { id: true, tokenId: true, revokedAt: true } });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!session.revokedAt) await prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  const current = session.tokenId === admin.tokenId;
  await prisma.activityLog.create({ data: { actorId: activityActorId(admin), action: "ADMIN_SESSION_REVOKED", entity: "UserSession", entityId: session.id, metadata: { current }, ipAddress: ip } }).catch(() => undefined);
  if (current) await clearSessionCookie();
  return NextResponse.json({ ok: true, current });
}

