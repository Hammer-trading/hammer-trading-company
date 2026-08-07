import crypto from "crypto";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/qr";
import { getAuthSettings } from "@/lib/auth-settings";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { getAppUrl } from "@/lib/app-url";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`forgot-password:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many reset attempts. Please wait a minute." }, { status: 429 });
  }
  const authSettings = await getAuthSettings();
  if (!authSettings.forgotPasswordEnabled) {
    return NextResponse.json({ error: "Password reset is currently disabled" }, { status: 403 });
  }
  const body = await request.json();
  const email = String(body.email || "").toLowerCase().trim();
  if (!email.includes("@")) {
    return NextResponse.json({ message: "If the account exists, reset instructions will be sent." });
  }
  const user = await prisma.user.findUnique({ where: { email } }).catch(() => null);
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30)
      }
    });
    const appUrl = getAppUrl();
    await sendEmail({
      to: user.email,
      subject: "Hammer Trading Company password reset",
      message: `Reset your password: ${appUrl}/reset-password?token=${token}`
    });
  }
  return NextResponse.json({ message: "If the account exists, reset instructions will be sent." });
}
