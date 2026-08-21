import { MediaKind } from "@prisma/client";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { activityActorId, requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

type UploadPayload = {
  actorId: string | null;
  kind: MediaKind;
  name: string;
  mimeType: string;
  sizeBytes: number;
  altText?: string | null;
};

const contentTypes: Record<MediaKind, string[]> = {
  IMAGE: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  VIDEO: ["video/mp4", "video/webm"],
  PDF: ["application/pdf"],
  DOCUMENT: [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ],
  MODEL: ["model/gltf-binary", "model/gltf+json", "application/octet-stream"]
};

const maximumSize: Record<MediaKind, number> = {
  IMAGE: 12_000_000,
  VIDEO: 250_000_000,
  PDF: 25_000_000,
  DOCUMENT: 25_000_000,
  MODEL: 20_000_000
};

const modelExtensions = /\.(glb|gltf)$/i;

function parsePayload(value: string | null): UploadPayload {
  const data = JSON.parse(value || "{}") as Partial<UploadPayload>;
  if (!data.kind || !contentTypes[data.kind] || !data.name || !data.mimeType || !Number.isFinite(data.sizeBytes)) {
    throw new Error("Invalid upload metadata");
  }
  if (!contentTypes[data.kind].includes(data.mimeType)) throw new Error("Unsupported file type");
  if (data.kind === "MODEL" && !modelExtensions.test(data.name)) throw new Error("3D models must be .glb or .gltf files");
  if (Number(data.sizeBytes) > maximumSize[data.kind]) throw new Error("File exceeds the upload limit");
  return {
    actorId: data.actorId || null,
    kind: data.kind,
    name: String(data.name).slice(0, 180),
    mimeType: data.mimeType,
    sizeBytes: Number(data.sizeBytes),
    altText: data.altText ? String(data.altText).slice(0, 180) : null
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });

  let actorId: string | null = null;
  if (body.type === "blob.generate-client-token") {
    const admin = await requirePermission("MEDIA_MANAGE");
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    const ip = getClientIp(request);
    if (!rateLimit(`media-upload:${admin.id}:${ip}`, 40, 60_000)) {
      return NextResponse.json({ error: "Too many uploads. Please wait a minute." }, { status: 429 });
    }
    actorId = activityActorId(admin);
  }

  try {
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!pathname.startsWith("htc/media/")) throw new Error("Invalid upload path");
        const payload = parsePayload(clientPayload);
        payload.actorId = actorId;
        return {
          allowedContentTypes: contentTypes[payload.kind],
          maximumSizeInBytes: maximumSize[payload.kind],
          addRandomSuffix: true,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          tokenPayload: JSON.stringify(payload)
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parsePayload(tokenPayload || null);
        await prisma.mediaAsset.upsert({
          where: { url: blob.url },
          create: {
            kind: payload.kind,
            name: payload.name,
            url: blob.url,
            mimeType: blob.contentType || payload.mimeType,
            sizeBytes: payload.sizeBytes,
            altText: payload.altText || null,
            uploadedById: payload.actorId,
            metadata: { pathname: blob.pathname, source: "vercel-blob" }
          },
          update: {
            name: payload.name,
            mimeType: blob.contentType || payload.mimeType,
            sizeBytes: payload.sizeBytes,
            altText: payload.altText || null
          }
        });
      }
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Media upload failed", error);
    const message = process.env.BLOB_READ_WRITE_TOKEN
      ? error instanceof Error ? error.message : "Upload failed"
      : "Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
