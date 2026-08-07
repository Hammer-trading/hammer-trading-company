import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { Permission, Role } from "@prisma/client";
import { tryDatabase } from "@/lib/db-fallback";
import { prisma } from "@/lib/prisma";
import { adminRoles, canAccess, permissionsFor } from "@/lib/permissions";

const cookieName = "hammer_session";

function secret() {
  const configured = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && (!configured || configured.length < 32 || configured === "dev-secret-change-before-production")) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters in production");
  }
  const raw = configured || "dev-secret-change-before-production";
  return new TextEncoder().encode(raw);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions?: Permission[];
  sessionVersion?: number;
  tokenId?: string;
};

export class AuthDatabaseUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Authentication database is temporarily unavailable");
    this.name = "AuthDatabaseUnavailableError";
    this.cause = cause;
  }
}

async function authDatabaseRequest<T>(operation: () => Promise<T>, timeoutMs = 8_000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AuthDatabaseUnavailableError()), timeoutMs);
      })
    ]);
  } catch (error) {
    if (error instanceof AuthDatabaseUnavailableError) throw error;
    throw new AuthDatabaseUnavailableError(error);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function fallbackAdminSession(email = process.env.ADMIN_EMAIL || "hammertrading2018@gmail.com"): SessionUser {
  return {
    id: "dev-admin",
    email,
    name: "Hammer Admin",
    role: Role.SUPER_ADMIN,
    permissions: permissionsFor(Role.SUPER_ADMIN)
  };
}

export async function signSession(user: SessionUser, tokenId = crypto.randomUUID()) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setJti(tokenId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function createSessionToken(user: SessionUser, context?: { ipAddress?: string; userAgent?: string | null }) {
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000);
  const token = await signSession(user, tokenId);

  if (!user.id.startsWith("dev-")) {
    await authDatabaseRequest(() => prisma.userSession.create({
      data: {
        userId: user.id,
        tokenId,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent?.slice(0, 500) || null,
        expiresAt
      }
    }), 8_000);
  }

  return { token, tokenId, expiresAt };
}

export async function login(email: string, password: string) {
  const user = await authDatabaseRequest(() => prisma.user.findUnique({
    where: { email },
    include: { permissions: true }
  }));
  if (!user || !user.isActive) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionVersion: user.sessionVersion,
    permissions: permissionsFor(user.role, user.permissions.map((item) => item.permission))
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const session = { ...(payload as SessionUser), tokenId: payload.jti };
    if (session.id === "dev-admin" && adminRoles.includes(session.role)) {
      if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEV_ADMIN_FALLBACK !== "true") return null;
      return await ensureFallbackAdminUser(session.email).catch(() => session);
    }
    if (session.id === "dev-customer") return process.env.NODE_ENV === "production" ? null : session;

    try {
      const user = await authDatabaseRequest(() => prisma.user.findUnique({
        where: { id: session.id },
        include: {
          permissions: true,
          sessions: session.tokenId ? { where: { tokenId: session.tokenId }, take: 1 } : false
        }
      }), adminRoles.includes(session.role) ? 8_000 : 4_000);
      if (!user || !user.isActive || user.role !== session.role) return null;
      if (Number(session.sessionVersion || 0) !== user.sessionVersion) return null;
      if (session.tokenId) {
        const activeSession = user.sessions[0];
        if (!activeSession || activeSession.revokedAt || activeSession.expiresAt <= new Date()) return null;
        if (Date.now() - activeSession.lastSeenAt.getTime() > 5 * 60_000) {
          void prisma.userSession.update({ where: { id: activeSession.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
        }
      }
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sessionVersion: user.sessionVersion,
        tokenId: session.tokenId,
        permissions: permissionsFor(user.role, user.permissions.map((item) => item.permission))
      };
    } catch (error) {
      console.error("Session revalidation failed", error);
      if (process.env.NODE_ENV === "production" && adminRoles.includes(session.role)) return null;
      return session;
    }
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser, context?: { ipAddress?: string; userAgent?: string | null }) {
  const { token } = await createSessionToken(user, context).catch((error) => {
    if (process.env.NODE_ENV === "production") throw error;
    console.error("Development session record could not be saved", error);
    return signSession(user).then((token) => ({ token }));
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });
}

export async function clearSessionCookie() {
  const token = (await cookies()).get(cookieName)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret());
      if (payload.jti) {
        await authDatabaseRequest(
          () => prisma.userSession.updateMany({ where: { tokenId: payload.jti, revokedAt: null }, data: { revokedAt: new Date() } }),
          4_000
        );
      }
    } catch {
      // Invalid or unavailable sessions are still cleared locally.
    }
  }
  (await cookies()).delete(cookieName);
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || !adminRoles.includes(session.role)) {
    return null;
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAdmin();
  if (!session || !canAccess(session, permission)) {
    return null;
  }
  return session;
}

export function activityActorId(session: Pick<SessionUser, "id"> | null | undefined) {
  return session?.id === "dev-admin" ? null : session?.id ?? null;
}

export async function ensureFallbackAdminUser(email = process.env.ADMIN_EMAIL || "hammertrading2018@gmail.com") {
  const user = await tryDatabase(async () => {
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      include: { permissions: true }
    });

    const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "ChangeMe123!", 10);
    return existingByEmail
      ? await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { isActive: true, role: Role.SUPER_ADMIN },
        include: { permissions: true }
      })
      : await prisma.user.upsert({
        where: { id: "dev-admin" },
        update: { name: "Hammer Admin", isActive: true, role: Role.SUPER_ADMIN },
        create: {
          id: "dev-admin",
          email,
          name: "Hammer Admin",
          passwordHash,
          role: Role.SUPER_ADMIN,
          isActive: true
        },
        include: { permissions: true }
      });
  }, 1200);

  if (!user) {
    if (process.env.NODE_ENV === "production") throw new Error("Admin database is unavailable");
    return fallbackAdminSession(email);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionVersion: user.sessionVersion,
    permissions: permissionsFor(user.role, user.permissions.map((item) => item.permission))
  };
}
