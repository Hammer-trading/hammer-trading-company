import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin, setSessionCookie } from "@/lib/auth";
import { sendEmail } from "@/lib/integrations";
import { permissionsFor } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/security";

function destination(request: Request, result: string) {
  return new URL(`/admin/account?email=${result}`, request.url);
}

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin || admin.id.startsWith("dev-")) return NextResponse.redirect(new URL("/admin/login", request.url));
  const token = new URL(request.url).searchParams.get("token") || "";
  if (token.length !== 64) return NextResponse.redirect(destination(request, "invalid"));
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const pending = await prisma.emailChangeToken.findUnique({ where: { tokenHash }, include: { user: { include: { permissions: true } } } });
  if (!pending || pending.userId !== admin.id || pending.usedAt || pending.expiresAt <= new Date()) {
    return NextResponse.redirect(destination(request, "expired"));
  }
  const duplicate = await prisma.user.findUnique({ where: { email: pending.newEmail }, select: { id: true } });
  if (duplicate && duplicate.id !== admin.id) return NextResponse.redirect(destination(request, "in-use"));
  const nextVersion = pending.user.sessionVersion + 1;
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: admin.id }, data: { email: pending.newEmail, emailVerifiedAt: now, sessionVersion: nextVersion } }),
    prisma.emailChangeToken.update({ where: { id: pending.id }, data: { usedAt: now } }),
    prisma.userSession.updateMany({ where: { userId: admin.id, revokedAt: null }, data: { revokedAt: now } }),
    prisma.activityLog.create({ data: { actorId: admin.id, action: "ADMIN_EMAIL_CHANGED", entity: "User", entityId: admin.id, metadata: { oldEmail: pending.oldEmail, newEmail: pending.newEmail }, ipAddress: getClientIp(request) } })
  ]);
  await setSessionCookie({
    id: pending.user.id,
    name: pending.user.name,
    email: pending.newEmail,
    role: pending.user.role,
    sessionVersion: nextVersion,
    permissions: permissionsFor(pending.user.role, pending.user.permissions.map((item) => item.permission))
  }, { ipAddress: getClientIp(request), userAgent: request.headers.get("user-agent") });
  await sendEmail({ to: pending.oldEmail, subject: "Hammer Trading Company admin email changed", message: `The Primary Admin login email was changed to ${pending.newEmail}. All previous sessions were signed out.` }).catch(() => undefined);
  return NextResponse.redirect(destination(request, "verified"));
}

