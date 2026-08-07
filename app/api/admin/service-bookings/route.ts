import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requirePermission("SERVICES_MANAGE");
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const search = new URL(request.url).searchParams;
  const q = search.get("q")?.trim() || "";
  const status = search.get("status") || "";
  const items = await prisma.serviceBooking.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(q ? { OR: [
        { requestNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } }
      ] } : {})
    },
    include: {
      service: { select: { id: true, name: true, slug: true } },
      package: { select: { id: true, name: true, sku: true, finalPrice: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true, stock: true } }, variant: { select: { id: true, title: true, sku: true, stock: true, options: true } } }, orderBy: { sortOrder: "asc" } },
      convertedOrder: { select: { id: true, orderNumber: true, invoiceNumber: true, total: true } },
      user: { select: { id: true, customerPublicId: true, name: true, email: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 250
  });
  return NextResponse.json({ items });
}
