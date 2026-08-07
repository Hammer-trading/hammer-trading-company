import { NextResponse } from "next/server";
import { decodeDataImage, storedImageHeaders } from "@/lib/data-image";
import { tryDatabase } from "@/lib/db-fallback";
import { prisma } from "@/lib/prisma";
import { loadNeonBannerImage } from "@/lib/storefront-neon";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kind = new URL(request.url).searchParams.get("kind") === "mobile" ? "mobile" : "desktop";
  const neonBanner = await loadNeonBannerImage(id);
  const prismaBanner = neonBanner ? null : await tryDatabase(() => prisma.banner.findUnique({
    where: { id },
    select: { image: true, mobileImage: true }
  }), 10_000);
  const banner = neonBanner || prismaBanner;
  const value = kind === "mobile" ? banner?.mobileImage : banner?.image;

  if (!value) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  if (!value.startsWith("data:")) return NextResponse.redirect(value);

  const decoded = decodeDataImage(value);
  if (!decoded) return NextResponse.json({ error: "Invalid image" }, { status: 400 });

  return new NextResponse(decoded.body, {
    headers: {
      ...storedImageHeaders,
      "Content-Type": decoded.contentType
    }
  });
}
