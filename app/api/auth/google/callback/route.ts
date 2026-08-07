import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { createSessionToken, type SessionUser } from "@/lib/auth";
import { permissionsFor } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getAuthSettings } from "@/lib/auth-settings";
import { adminRoles } from "@/lib/permissions";
import { getClientIp } from "@/lib/security";
import { getAppUrl } from "@/lib/app-url";

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function authErrorPath(flow: string, next: string, error: string) {
  const page = flow === "register" ? "/register" : "/login";
  return `${page}?next=${encodeURIComponent(next)}&google=${encodeURIComponent(error)}`;
}

export async function GET(request: NextRequest) {
  const authSettings = await getAuthSettings();
  if (!authSettings.customerLoginEnabled || !authSettings.googleCustomerLoginEnabled) {
    return redirectTo(request, "/login?disabled=google");
  }
  const appUrl = getAppUrl(request.nextUrl.origin);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("hammer_google_state")?.value;
  const next = request.cookies.get("hammer_google_next")?.value || "/account";
  const flow = request.cookies.get("hammer_google_flow")?.value === "register" ? "register" : "login";

  if (!clientId || !clientSecret) return redirectTo(request, authErrorPath(flow, next, "missing"));
  if (!code || !state || state !== expectedState) return redirectTo(request, authErrorPath(flow, next, "invalid"));

  try {
    const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${appUrl}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });
    const googleToken = (await tokenResponse.json()) as GoogleTokenResponse;
    if (!tokenResponse.ok || !googleToken.access_token) throw new Error(googleToken.error || "Google token exchange failed");

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${googleToken.access_token}` }
    });
    const profile = (await profileResponse.json()) as GoogleProfile;
    if (!profileResponse.ok || !profile.email || profile.email_verified === false) {
      throw new Error("Google email is not verified");
    }

    const email = profile.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email }, include: { permissions: true } });
    if (existingUser && adminRoles.includes(existingUser.role)) {
      return redirectTo(request, "/admin/login?error=customer-provider");
    }
    if (existingUser && !existingUser.isActive) {
      return redirectTo(request, authErrorPath(flow, next, "inactive"));
    }
    if (!existingUser && !authSettings.customerRegistrationEnabled) {
      return redirectTo(request, authErrorPath(flow, next, "registration-disabled"));
    }

    const passwordHash = await bcrypt.hash(crypto.randomUUID(), 12);
    const user = existingUser
      ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          emailVerifiedAt: existingUser.emailVerifiedAt || new Date(),
          lastLoginAt: new Date()
        },
        include: { permissions: true }
      })
      : await prisma.user.create({
        data: {
          name: profile.name || email.split("@")[0],
          email,
          passwordHash,
          role: Role.CUSTOMER,
          isActive: true,
          emailVerifiedAt: new Date(),
          profileImage: profile.picture || null,
          lastLoginAt: new Date()
        },
        include: { permissions: true }
      });
    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      sessionVersion: user.sessionVersion,
      permissions: permissionsFor(user.role, user.permissions.map((item) => item.permission))
    };
    const { token: sessionToken } = await createSessionToken(sessionUser, {
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent")
    });
    await prisma.activityLog.create({
      data: {
        actorId: user.id,
        action: existingUser ? "GOOGLE_LOGIN" : "GOOGLE_REGISTERED",
        entity: "User",
        entityId: user.id,
        ipAddress: getClientIp(request)
      }
    }).catch(() => null);

    const response = NextResponse.redirect(new URL(next, request.url));
    const secureCookie = process.env.NODE_ENV === "production" && appUrl.startsWith("https://");
    response.cookies.set("hammer_session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: secureCookie,
      maxAge: 60 * 60 * 24 * 7,
      path: "/"
    });
    response.cookies.delete("hammer_google_state");
    response.cookies.delete("hammer_google_next");
    response.cookies.delete("hammer_google_flow");
    return response;
  } catch (error) {
    console.error(error);
    return redirectTo(request, authErrorPath(flow, next, "failed"));
  }
}
