import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { getAuthSettings } from "@/lib/auth-settings";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/qr";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { resetPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`reset-password:${getClientIp(request)}`, 6, 60_000)) {
    return NextResponse.json({ error: "Too many reset attempts. Please wait a minute." }, { status: 429 });
  }
  const settings = await getAuthSettings();
  if (!settings.forgotPasswordEnabled) {
    return NextResponse.json({ error: "Password reset is currently disabled" }, { status: 403 });
  }
  const parsed = resetPasswordSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid reset request" }, { status: 400 });
  }

  const tokenHash = hashToken(parsed.data.token);
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!token || token.usedAt || token.expiresAt <= new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: token.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } }),
    prisma.userSession.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: now } }),
    prisma.passwordResetToken.update({ where: { id: token.id }, data: { usedAt: now } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: token.userId, id: { not: token.id }, usedAt: null } }),
    prisma.activityLog.create({ data: { actorId: token.userId, action: "PASSWORD_RESET", entity: "User", entityId: token.userId, ipAddress: getClientIp(request) } })
  ]);
  await clearSessionCookie();
  return NextResponse.json({ ok: true, message: "Password updated. Please sign in with your new password." });
}
