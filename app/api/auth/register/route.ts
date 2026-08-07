import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getAuthSettings } from "@/lib/auth-settings";
import { setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { customerRegistrationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`register:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many registration attempts. Please wait a minute." }, { status: 429 });
  }

  const settings = await getAuthSettings();
  if (!settings.customerRegistrationEnabled) {
    return NextResponse.json({ error: "Customer registration is currently disabled" }, { status: 403 });
  }
  if (!settings.customerLoginEnabled) {
    return NextResponse.json({ error: "Customer accounts are currently unavailable" }, { status: 403 });
  }

  const parsed = customerRegistrationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid registration details" }, { status: 400 });
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        passwordHash,
        role: Role.CUSTOMER,
        isActive: true
      }
    });
    await setSessionCookie({ id: user.id, email: user.email, name: user.name, role: user.role, permissions: [] });
    await prisma.activityLog.create({
      data: { actorId: user.id, action: "CUSTOMER_REGISTERED", entity: "User", entityId: user.id, ipAddress: getClientIp(request) }
    }).catch(() => null);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    console.error("Customer registration failed", error);
    return NextResponse.json({ error: "Registration is temporarily unavailable" }, { status: 503 });
  }
}
