import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { processPendingNotificationJobs } from "@/lib/integrations";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization") || "";
  if (!secret || !authorization.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  const expectedBuffer = Buffer.from(secret);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "Notification cron is not configured." }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const results = await processPendingNotificationJobs(40);
    return NextResponse.json({
      ok: true,
      processed: results.length,
      sent: results.filter((result) => result?.status === "sent").length,
      failed: results.filter((result) => result?.status === "failed").length,
      notConfigured: results.filter((result) => result?.status === "not_configured").length
    });
  } catch (error) {
    console.error("Notification cron failed", error);
    return NextResponse.json({ error: "Notification retry processing failed." }, { status: 503 });
  }
}
