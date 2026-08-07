import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { sameOrigin } from "@/lib/security";

function secret() {
  const configured = process.env.JWT_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && (!configured || configured.length < 32 || configured === "dev-secret-change-before-production")) {
    return null;
  }
  return new TextEncoder().encode(configured || "dev-secret-change-before-production");
}

const adminRoles = ["SUPER_ADMIN", "ADMIN", "ORDER_MANAGER", "INVENTORY_MANAGER", "DELIVERY_STAFF", "SUPPORT_STAFF"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdminApi = path.startsWith("/api/admin");
  const isAdminPage = path.startsWith("/admin");
  if (!isAdminApi && !isAdminPage) return NextResponse.next();

  if (isAdminApi) {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !sameOrigin(request)) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (path === "/admin/login") return NextResponse.next();

  const token = request.cookies.get("hammer_session")?.value;
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", path);

  if (!token) return NextResponse.redirect(loginUrl);

  try {
    const signingKey = secret();
    if (!signingKey) return NextResponse.redirect(loginUrl);
    const { payload } = await jwtVerify(token, signingKey);
    const role = String(payload.role || "");
    if (payload.id === "dev-admin" && (process.env.NODE_ENV === "production" || process.env.ENABLE_DEV_ADMIN_FALLBACK !== "true")) {
      return NextResponse.redirect(loginUrl);
    }
    if (!adminRoles.includes(role)) {
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
