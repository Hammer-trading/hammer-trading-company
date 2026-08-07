import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSettings } from "@/lib/auth-settings";
import { getAppUrl } from "@/lib/app-url";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/admin") ? value : "/account";
}

function safeFlow(value: string | null) {
  return value === "register" ? "register" : "login";
}

export async function GET(request: NextRequest) {
  const authSettings = await getAuthSettings();
  if (!authSettings.customerLoginEnabled || !authSettings.googleCustomerLoginEnabled) {
    return NextResponse.redirect(new URL("/login?disabled=google", request.url));
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = getAppUrl(request.nextUrl.origin);
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const flow = safeFlow(request.nextUrl.searchParams.get("flow"));
  const returnPath = flow === "register" ? "/register" : "/login";

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${returnPath}?next=${encodeURIComponent(next)}&google=missing`, request.url));
  }

  const state = crypto.randomUUID();
  const redirectUri = process.env.GOOGLE_CALLBACK_URL || `${appUrl}/api/auth/google/callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "online");
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  const secureCookie = process.env.NODE_ENV === "production" && appUrl.startsWith("https://");
  response.cookies.set("hammer_google_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: 10 * 60,
    path: "/"
  });
  response.cookies.set("hammer_google_next", next, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: 10 * 60,
    path: "/"
  });
  response.cookies.set("hammer_google_flow", flow, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    maxAge: 10 * 60,
    path: "/"
  });

  return response;
}
