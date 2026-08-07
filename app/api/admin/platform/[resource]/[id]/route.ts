import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { activityActorId, requirePermission } from "@/lib/auth";
import { deletePlatformResource, isPlatformResource, logPlatformChange, parsePlatformPayload, platformPermission, updatePlatformResource } from "@/lib/platform-admin";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

type Context = { params: Promise<{ resource: string; id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { resource, id } = await context.params;
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
    const item = await updatePlatformResource(resource, id, parsed.data as Record<string, unknown>);
    await logPlatformChange(activityActorId(admin), "PLATFORM_CONTENT_UPDATED", resource, id, { ipAddress: ip });
    revalidateTag("platform-content");
    revalidatePath("/");
    return NextResponse.json({ item });
  } catch (error) {
    console.error(`Platform ${resource} update failed`, error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const { resource, id } = await context.params;
  if (!isPlatformResource(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  const admin = await requirePermission(platformPermission(resource));
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ip = getClientIp(request);
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`platform-delete:${admin.id}:${ip}`, 30, 60_000)) return NextResponse.json({ error: "Too many delete requests" }, { status: 429 });
  try {
    const item = await deletePlatformResource(resource, id);
    await logPlatformChange(activityActorId(admin), "PLATFORM_CONTENT_DELETED", resource, id, { ipAddress: ip });
    revalidateTag("platform-content");
    revalidatePath("/");
    return NextResponse.json({ item });
  } catch (error) {
    console.error(`Platform ${resource} delete failed`, error);
    return NextResponse.json({ error: "This item is linked to existing records. Archive or deactivate it instead." }, { status: 409 });
  }
}
