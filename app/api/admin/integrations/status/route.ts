import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getIntegrationConfiguration } from "@/lib/integrations";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

const channelByKey = {
  email: "EMAIL",
  sms: "SMS",
  whatsapp: "WHATSAPP"
} as const;

export async function GET() {
  const admin = await requirePermission(Permission.SETTINGS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [recentJobs, pending] = await Promise.all([
      prisma.outboundNotificationJob.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { channel: true, status: true, lastError: true, createdAt: true }
      }),
      prisma.outboundNotificationJob.count({ where: { status: { in: ["PENDING", "FAILED"] } } })
    ]);
    const latestByChannel = new Map<string, typeof recentJobs[number]>();
    for (const job of recentJobs) {
      if (!latestByChannel.has(job.channel)) latestByChannel.set(job.channel, job);
    }
    const items = getIntegrationConfiguration().map((configuration) => {
      const channel = channelByKey[configuration.key as keyof typeof channelByKey];
      const latest = channel ? latestByChannel.get(channel) : undefined;
      const state = !configuration.configured
        ? "Not configured"
        : latest && ["FAILED", "DEAD"].includes(latest.status)
          ? "Failed"
          : "Connected";
      return {
        ...configuration,
        state,
        lastError: state === "Failed" ? latest?.lastError || "Latest provider request failed" : null,
        lastActivityAt: latest?.createdAt || null
      };
    });
    return NextResponse.json({ items, pending });
  } catch (error) {
    console.error("Integration status failed", error);
    return NextResponse.json({ error: "Integration status is unavailable until the database migration is applied." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.SETTINGS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`integration-retry:${admin.id}:${getClientIp(request)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Please wait before retrying notification jobs again." }, { status: 429 });
  }

  try {
    const retried = await prisma.outboundNotificationJob.updateMany({
      where: { status: { in: ["FAILED", "DEAD", "NOT_CONFIGURED"] } },
      data: { status: "PENDING", attemptsCount: 0, nextAttemptAt: new Date(), lastError: null }
    });
    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        action: "INTEGRATION_JOBS_REQUEUED",
        entity: "OutboundNotificationJob",
        metadata: { count: retried.count }
      }
    });
    return NextResponse.json({ ok: true, count: retried.count });
  } catch (error) {
    console.error("Integration retry failed", error);
    return NextResponse.json({ error: "Notification jobs could not be requeued." }, { status: 503 });
  }
}
