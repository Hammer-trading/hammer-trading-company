import { NextResponse } from "next/server";
import { AuthDatabaseUnavailableError, ensureFallbackAdminUser, login, setSessionCookie, type SessionUser } from "@/lib/auth";
import { tryDatabase } from "@/lib/db-fallback";
import { permissionsFor } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { loginSchema } from "@/lib/validation";
import { getAuthSettings } from "@/lib/auth-settings";
import { adminRoles } from "@/lib/permissions";

export async function POST(request: Request) {
  const ipAddress = getClientIp(request);
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  if (!rateLimit(`login:${ipAddress}`, Number(process.env.RATE_LIMIT_LOGIN_ATTEMPTS || 8), Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000))) {
    return NextResponse.json({ error: "Too many login attempts" }, { status: 429 });
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }
  let databaseLoginFailed = false;
  let user: SessionUser | null = parsed.data.password
    ? await login(parsed.data.email, parsed.data.password).catch((error) => {
      databaseLoginFailed = error instanceof AuthDatabaseUnavailableError;
      console.error("Database login failed", error);
      return null;
    })
    : null;
  if (!user && process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_ADMIN_FALLBACK === "true") {
    const devEmail = process.env.ADMIN_EMAIL || "hammertrading2018@gmail.com";
    const devPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
    if (parsed.data.email === devEmail && parsed.data.password === devPassword) {
      user = await ensureFallbackAdminUser(devEmail).catch((error) => {
        console.error("Fallback admin database user setup failed", error);
        return {
          id: "dev-admin",
          email: devEmail,
          name: "Hammer Admin",
          role: "SUPER_ADMIN" as const,
          permissions: permissionsFor("SUPER_ADMIN")
        };
      });
    }
  }
  if (!user && databaseLoginFailed) {
    return NextResponse.json({ error: "Sign-in service is temporarily unavailable. Please try again." }, { status: 503 });
  }
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  if (parsed.data.adminOnly && !adminRoles.includes(user.role)) {
    return NextResponse.json({ error: "This account does not have admin access" }, { status: 403 });
  }
  if (!parsed.data.adminOnly && !adminRoles.includes(user.role)) {
    const authSettings = await getAuthSettings();
    if (!authSettings.customerLoginEnabled) {
      return NextResponse.json({ error: "Customer login is currently disabled" }, { status: 403 });
    }
  }
  try {
    await setSessionCookie(user, { ipAddress, userAgent: request.headers.get("user-agent") });
  } catch (error) {
    console.error("Session creation failed", error);
    return NextResponse.json({ error: "Sign-in session could not be created. Please try again." }, { status: 503 });
  }
  if (!user.id.startsWith("dev-")) {
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => undefined);
  }
  await tryDatabase(
    () => prisma.activityLog.create({
      data: {
        actorId: user.id === "dev-admin" ? null : user.id,
        action: adminRoles.includes(user.role) ? "ADMIN_LOGIN" : "CUSTOMER_LOGIN",
        entity: "User",
        entityId: user.id,
        ipAddress
      }
    }),
    600
  ).catch((error) => {
    console.error("Login activity could not be recorded", error);
    return null;
  });
  return NextResponse.json({ user });
}
