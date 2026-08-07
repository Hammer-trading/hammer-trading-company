import { Permission, Role } from "@prisma/client";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

const allowedContentTypes = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg"];
const maximumSizeInBytes = 10_000_000;
const maximumDurationSeconds = 180;

type VoiceUploadPayload = {
  actorId: string;
  actorRole: "CUSTOMER" | "ADMIN";
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
};

function parsePayload(value: string | null): VoiceUploadPayload {
  const data = JSON.parse(value || "{}") as Partial<VoiceUploadPayload>;
  if (
    !data.actorId ||
    (data.actorRole !== "CUSTOMER" && data.actorRole !== "ADMIN") ||
    !data.name ||
    !data.mimeType ||
    !Number.isFinite(data.sizeBytes) ||
    !Number.isFinite(data.durationSeconds)
  ) {
    throw new Error("Invalid voice upload metadata");
  }
  if (!allowedContentTypes.includes(data.mimeType)) throw new Error("Unsupported audio format");
  if (Number(data.sizeBytes) < 1 || Number(data.sizeBytes) > maximumSizeInBytes) {
    throw new Error("Voice message exceeds the 10 MB upload limit");
  }
  if (Number(data.durationSeconds) < 1 || Number(data.durationSeconds) > maximumDurationSeconds) {
    throw new Error("Voice message must be between 1 second and 3 minutes");
  }
  return {
    actorId: data.actorId,
    actorRole: data.actorRole,
    name: String(data.name).slice(0, 180),
    mimeType: data.mimeType,
    sizeBytes: Number(data.sizeBytes),
    durationSeconds: Math.round(Number(data.durationSeconds))
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });

  let actor: Pick<VoiceUploadPayload, "actorId" | "actorRole"> | null = null;
  if (body.type === "blob.generate-client-token") {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Login required" }, { status: 401 });

    const isCustomer = session.role === Role.CUSTOMER;
    const canReplyAsAdmin = canAccess(session, Permission.SUPPORT_WRITE);
    if (!isCustomer && !canReplyAsAdmin) {
      return NextResponse.json({ error: "Voice messaging is not available for this account" }, { status: 403 });
    }
    if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });

    const ip = getClientIp(request);
    if (!rateLimit(`chat-voice-upload:${session.id}:${ip}`, 12, 60_000)) {
      return NextResponse.json({ error: "Too many voice uploads. Please wait a minute." }, { status: 429 });
    }
    actor = {
      actorId: session.id,
      actorRole: isCustomer ? "CUSTOMER" : "ADMIN"
    };
  }

  try {
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!actor) throw new Error("Authenticated upload session required");
        if (!pathname.startsWith("htc/chat/voice/")) throw new Error("Invalid upload path");
        const clientData = JSON.parse(clientPayload || "{}") as Partial<VoiceUploadPayload>;
        const payload = parsePayload(JSON.stringify({ ...clientData, ...actor }));
        return {
          allowedContentTypes,
          maximumSizeInBytes,
          addRandomSuffix: true,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
          tokenPayload: JSON.stringify(payload)
        };
      },
      onUploadCompleted: async ({ tokenPayload }) => {
        parsePayload(tokenPayload || null);
      }
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error("Voice upload failed", error);
    const message = process.env.BLOB_READ_WRITE_TOKEN
      ? error instanceof Error ? error.message : "Voice upload failed"
      : "Voice storage is not configured. Add BLOB_READ_WRITE_TOKEN.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
