import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { signSession } from "@/lib/auth";
import { permissionsFor } from "@/lib/permissions";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_DEV_ADMIN_FALLBACK !== "true") {
    const url = new URL(request.url);
    const next = url.searchParams.get("next") || "/account";
    const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(safeNext)}&google=missing`, url.origin));
  }
  const url = new URL(request.url);
  const next = url.searchParams.get("next") || "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const user = {
    id: "dev-customer",
    email: "customer@hammer.local",
    name: "Demo Customer",
    role: Role.CUSTOMER,
    permissions: permissionsFor(Role.CUSTOMER)
  };
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
