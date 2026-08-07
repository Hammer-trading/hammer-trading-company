import { NextResponse } from "next/server";
import { decodeDataImage, storedImageHeaders } from "@/lib/data-image";
import { prisma } from "@/lib/prisma";
import { tryDatabase } from "@/lib/db-fallback";
import { loadNeonProductImage } from "@/lib/storefront-neon";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const neonImage = await loadNeonProductImage(id);
  const prismaImage = neonImage ? null : await tryDatabase(() => prisma.productImage.findUnique({
      where: { id },
      select: {
        url: true,
        product: { select: { isActive: true } }
      }
    }), 10_000);
  const image = neonImage
    ? { url: neonImage.url, isActive: neonImage.isActive }
    : prismaImage
      ? { url: prismaImage.url, isActive: prismaImage.product.isActive }
      : null;

  if (!image || !image.isActive) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  if (!image.url.startsWith("data:")) {
    return NextResponse.redirect(image.url);
  }

  const decoded = decodeDataImage(image.url);
  if (!decoded) {
    return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  }

  return new NextResponse(decoded.body, {
    headers: {
      ...storedImageHeaders,
      "Content-Type": decoded.contentType
    }
  });
}
