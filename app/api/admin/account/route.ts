import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { activityActorId, requireAdmin } from "@/lib/auth";
import { adminProfileSchema } from "@/lib/admin-account-validation";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin || admin.id.startsWith("dev-")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: admin.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      profileImage: true,
      lastLoginAt: true,
      createdAt: true,
      sessions: {
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
        select: { id: true, tokenId: true, ipAddress: true, userAgent: true, createdAt: true, lastSeenAt: true, expiresAt: true },
        orderBy: { lastSeenAt: "desc" }
      }
    }
  });
  if (!user) return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
  return NextResponse.json({
    account: {
      ...user,
      sessions: user.sessions.map(({ tokenId, ...session }) => ({ ...session, isCurrent: tokenId === admin.tokenId }))
    }
  });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin || admin.id.startsWith("dev-")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`admin:account:profile:${admin.id}:${ip}`, 12, 60_000)) return NextResponse.json({ error: "Too many updates" }, { status: 429 });
  const parsed = adminProfileSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid profile details", details: parsed.error.flatten() }, { status: 400 });
  const previous = await prisma.user.findUnique({ where: { id: admin.id }, select: { name: true, profileImage: true } });
  const account = await prisma.user.update({
    where: { id: admin.id },
    data: { name: parsed.data.name, profileImage: parsed.data.profileImage || null },
    select: { id: true, name: true, email: true, role: true, profileImage: true, lastLoginAt: true, createdAt: true }
  });
  await prisma.activityLog.create({
    data: {
      actorId: activityActorId(admin),
      action: "ADMIN_PROFILE_UPDATED",
      entity: "User",
      entityId: admin.id,
      previousValue: previous as Prisma.InputJsonValue,
      newValue: { name: account.name, profileImage: account.profileImage } as Prisma.InputJsonValue,
      ipAddress: ip
    }
  }).catch(() => undefined);
  return NextResponse.json({ account });
}

