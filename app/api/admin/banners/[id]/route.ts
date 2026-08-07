import { Permission } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { bannerInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { isBannerImageProxy, publicBannerRecord } from "@/lib/banner-images";
import { prisma } from "@/lib/prisma";

function auditBanner(banner: { id: string; title: string; type: string; isActive: boolean; sortOrder: number; image: string; mobileImage: string | null } | null) {
  return banner ? { ...banner, image: "[stored image]", mobileImage: banner.mobileImage ? "[stored image]" : null } : null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.BANNERS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = bannerInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid banner", details: parsed.error.flatten() }, { status: 400 });
  const before = await prisma.banner.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  const image = isBannerImageProxy(parsed.data.image, id, "desktop") ? before.image : parsed.data.image;
  const mobileImage = isBannerImageProxy(parsed.data.mobileImage, id, "mobile") ? before.mobileImage : parsed.data.mobileImage;
  const banner = await prisma.banner.update({ where: { id }, data: { ...parsed.data, type: parsed.data.type.toUpperCase(), image, mobileImage } });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "BANNER_UPDATED", entity: "Banner", entityId: id, previousValue: auditBanner(before) as never, newValue: auditBanner(banner) as never } });
  revalidateTag("hero-banners");
  return NextResponse.json(publicBannerRecord(banner));
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission(Permission.BANNERS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.banner.delete({ where: { id } });
  revalidateTag("hero-banners");
  return NextResponse.json({ ok: true });
}
