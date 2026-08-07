import { Permission } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { bannerInputSchema } from "@/lib/admin-validation";
import { requirePermission } from "@/lib/auth";
import { publicBannerRecord } from "@/lib/banner-images";
import { prisma } from "@/lib/prisma";

function auditBanner(banner: { id: string; title: string; type: string; isActive: boolean; sortOrder: number; image: string; mobileImage: string | null }) {
  return { ...banner, image: "[stored image]", mobileImage: banner.mobileImage ? "[stored image]" : null };
}

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.BANNERS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requestedType = new URL(request.url).searchParams.get("type")?.toUpperCase();
  const banners = await prisma.banner.findMany({
    where: requestedType ? { type: requestedType } : undefined,
    orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }]
  });
  return NextResponse.json(banners.map(publicBannerRecord));
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.BANNERS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bannerInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid banner", details: parsed.error.flatten() }, { status: 400 });
  const type = parsed.data.type.toUpperCase();
  if (type === "HERO" || type.endsWith("_HERO")) {
    const count = await prisma.banner.count({ where: { type } });
    if (count >= 15) return NextResponse.json({ error: "A maximum of 15 hero slides is allowed." }, { status: 409 });
  }
  const banner = await prisma.banner.create({ data: { ...parsed.data, type } });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "BANNER_CREATED", entity: "Banner", entityId: banner.id, newValue: auditBanner(banner) as never } });
  revalidateTag("hero-banners");
  return NextResponse.json(publicBannerRecord(banner), { status: 201 });
}
