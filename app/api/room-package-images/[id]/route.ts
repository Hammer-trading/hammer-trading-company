import { NextResponse } from "next/server";
import { decodeDataImage, storedImageHeaders } from "@/lib/data-image";
import { tryDatabase } from "@/lib/db-fallback";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await tryDatabase(() => prisma.roomPackage.findUnique({
    where: { id },
    select: { image: true }
  }), 10_000);
  if (!row?.image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  if (!row.image.startsWith("data:")) return NextResponse.redirect(row.image);
  const decoded = decodeDataImage(row.image);
  if (!decoded) return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  return new NextResponse(decoded.body, {
    headers: {
      ...storedImageHeaders,
      "Content-Type": decoded.contentType
    }
  });
}
