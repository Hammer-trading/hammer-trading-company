import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { activityActorId, requirePermission } from "@/lib/auth";
import { mediaAssetSchema } from "@/lib/platform-validation";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  const admin = await requirePermission("MEDIA_MANAGE");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`media-register:${admin.id}:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many media requests" }, { status: 429 });
  }
  const parsed = mediaAssetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid media details", details: parsed.error.flatten() }, { status: 400 });

  try {
    const metadata = parsed.data.metadata as Prisma.InputJsonValue;
    const item = await prisma.mediaAsset.upsert({
      where: { url: parsed.data.url },
      create: { ...parsed.data, metadata, uploadedById: activityActorId(admin) },
      update: {
        kind: parsed.data.kind,
        name: parsed.data.name,
        mimeType: parsed.data.mimeType || null,
        sizeBytes: parsed.data.sizeBytes || null,
        altText: parsed.data.altText || null,
        metadata
      }
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Media registration failed", error);
    return NextResponse.json({ error: "Media could not be registered" }, { status: 503 });
  }
}
