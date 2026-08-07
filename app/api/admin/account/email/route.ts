import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { activityActorId, requireAdmin } from "@/lib/auth";
import { adminEmailChangeSchema } from "@/lib/admin-account-validation";
import { sendEmail } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin || admin.id.startsWith("dev-")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== Role.SUPER_ADMIN) return NextResponse.json({ error: "Only the Primary Admin can change the admin email" }, { status: 403 });
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`admin:account:email:${admin.id}:${ip}`, 4, 15 * 60_000)) return NextResponse.json({ error: "Too many email-change attempts" }, { status: 429 });
  const parsed = adminEmailChangeSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid email-change request", details: parsed.error.flatten() }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { id: admin.id } });
  if (!user || !await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)) return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  if (parsed.data.newEmail === user.email.toLowerCase()) return NextResponse.json({ error: "This is already the current admin email" }, { status: 409 });
  const duplicate = await prisma.user.findUnique({ where: { email: parsed.data.newEmail }, select: { id: true } });
  if (duplicate) return NextResponse.json({ error: "That email is already in use" }, { status: 409 });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60_000);
  await prisma.$transaction([
    prisma.emailChangeToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.emailChangeToken.create({ data: { userId: user.id, oldEmail: user.email, newEmail: parsed.data.newEmail, tokenHash: hashToken(token), expiresAt } }),
    prisma.activityLog.create({
      data: {
        actorId: activityActorId(admin),
        action: "ADMIN_EMAIL_CHANGE_REQUESTED",
        entity: "User",
        entityId: user.id,
        metadata: { oldEmail: user.email, newEmail: parsed.data.newEmail, expiresAt: expiresAt.toISOString() } as Prisma.InputJsonValue,
        ipAddress: ip
      }
    })
  ]);
  const verificationUrl = new URL(`/api/admin/account/email/verify?token=${encodeURIComponent(token)}`, request.url).toString();
  const verificationDelivery = await sendEmail({
    to: parsed.data.newEmail,
    subject: "Verify your Hammer Trading Company admin email",
    message: `Open this secure link within 30 minutes to verify the new Primary Admin email:\n\n${verificationUrl}\n\nIf you did not request this change, ignore this message.`
  });
  if (verificationDelivery.status !== "sent") {
    await prisma.emailChangeToken.updateMany({
      where: { tokenHash: hashToken(token), usedAt: null },
      data: { usedAt: new Date() }
    });
    return NextResponse.json({
      error: verificationDelivery.status === "not_configured"
        ? "Email provider is not configured. The admin email was not changed."
        : "Verification email delivery failed. The admin email was not changed.",
      providerStatus: verificationDelivery.status
    }, { status: 503 });
  }
  await sendEmail({
    to: user.email,
    subject: "Admin email change requested",
    message: `A request was made to change the Hammer Trading Company Primary Admin email to ${parsed.data.newEmail}. The current email remains active until the new address is verified.`
  }).catch(() => undefined);
  return NextResponse.json({
    ok: true,
    message: `Verification sent to ${parsed.data.newEmail}. The current login email stays active until verification.`,
    ...(process.env.NODE_ENV !== "production" ? { verificationUrl } : {})
  });
}
