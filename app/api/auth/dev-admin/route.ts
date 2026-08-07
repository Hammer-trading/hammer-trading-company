import { NextResponse } from "next/server";
import { ensureFallbackAdminUser, signSession } from "@/lib/auth";
import { permissionsFor } from "@/lib/permissions";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEV_ADMIN_FALLBACK !== "true") {
    return NextResponse.json({ error: "Dev admin login is disabled" }, { status: 403 });
  }

  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/admin";
  const safeNext = next.startsWith("/admin") ? next : "/admin";
  const email = process.env.ADMIN_EMAIL || "hammertrading2018@gmail.com";

  const databaseUser = await ensureFallbackAdminUser(email).catch((error) => {
    console.error("Dev admin database user setup failed", error);
    return null;
  });
  const user = databaseUser || {
    id: "dev-admin",
    email,
    name: "Hammer Admin",
    role: "SUPER_ADMIN",
    permissions: permissionsFor("SUPER_ADMIN")
  } as const;
  const token = await signSession(user);
  const host = request.headers.get("host") || "127.0.0.1:3000";
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const response = NextResponse.redirect(`${protocol}://${host}${safeNext}`);
  response.cookies.set("hammer_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });

  return response;
}
