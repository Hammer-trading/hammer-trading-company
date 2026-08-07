import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { activityActorId, requirePermission } from "@/lib/auth";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";
import { createPlatformResource, isPlatformResource, listPlatformResource, logPlatformChange, parsePlatformPayload, platformPermission } from "@/lib/platform-admin";

type Context = { params: Promise<{ resource: string }> };

export async function GET(request: Request, context: Context) {
  const { resource } = await context.params;
  if (!isPlatformResource(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const admin = await requirePermission(platformPermission(resource));
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const query = new URL(request.url).searchParams.get("q") || "";
    const items = await listPlatformResource(resource, query);
    return NextResponse.json({ items });
  } catch (error) {
    console.error(`Platform ${resource} list failed`, error);
    return NextResponse.json({ error: "Data could not be loaded. Apply the latest database migration." }, { status: 503 });
  }
}

export async function POST(request: Request, context: Context) {
  const { resource } = await context.params;
  if (!isPlatformResource(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const admin = await requirePermission(platformPermission(resource));
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`platform:${admin.id}:${ip}`, 80, 60_000)) return NextResponse.json({ error: "Too many changes. Please wait a minute." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const parsed = parsePlatformPayload(resource, body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid data", details: parsed.error.flatten() }, { status: 400 });
  try {
    const item = await createPlatformResource(resource, parsed.data as Record<string, unknown>, activityActorId(admin));
    await logPlatformChange(activityActorId(admin), "PLATFORM_CONTENT_CREATED", resource, "id" in item ? String(item.id) : undefined, { ipAddress: ip });
    revalidateTag("platform-content");
    revalidatePath("/");
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error(`Platform ${resource} create failed`, error);
    const message = error instanceof Error ? error.message : "Create failed";
    return NextResponse.json({ error: message }, { status: message.includes("Unique constraint") ? 409 : 400 });
  }
}
