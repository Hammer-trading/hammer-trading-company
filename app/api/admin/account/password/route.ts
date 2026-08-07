import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { activityActorId, requireAdmin, setSessionCookie } from "@/lib/auth";
import { adminPasswordSchema } from "@/lib/admin-account-validation";
import { sendEmail } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin || admin.id.startsWith("dev-")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`admin:account:password:${admin.id}:${ip}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many password attempts. Please wait 15 minutes." }, { status: 429 });
  }
  const parsed = adminPasswordSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Password requirements were not met", details: parsed.error.flatten() }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: admin.id }, include: { permissions: true } });
  if (!user || !await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)) {
    await prisma.activityLog.create({ data: { actorId: activityActorId(admin), action: "ADMIN_PASSWORD_CHANGE_FAILED", entity: "User", entityId: admin.id, ipAddress: ip } }).catch(() => undefined);
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  const nextVersion = user.sessionVersion + 1;
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: nextVersion } }),
    prisma.userSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.activityLog.create({
      data: {
        actorId: activityActorId(admin),
        action: "ADMIN_PASSWORD_CHANGED",
        entity: "User",
        entityId: user.id,
        metadata: { sessionsRevoked: true } as Prisma.InputJsonValue,
        ipAddress: ip
      }
    })
  ]);
  await setSessionCookie({ ...admin, sessionVersion: nextVersion }, { ipAddress: ip, userAgent: request.headers.get("user-agent") });
  await sendEmail({
    to: user.email,
    subject: "Hammer Trading Company admin password changed",
    message: `The password for your admin account was changed on ${new Date().toLocaleString("en-PK")}. All previous sessions were signed out. If this was not you, secure the account immediately.`
  }).catch(() => undefined);
  return NextResponse.json({ ok: true, message: "Password updated and previous sessions signed out." });
}

