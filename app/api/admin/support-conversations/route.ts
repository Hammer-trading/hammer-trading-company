import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { readSupportConversations } from "@/lib/support-conversations";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.SUPPORT_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const q = url.searchParams.get("q")?.trim().toLowerCase() || "";
  try {
    const items = await prisma.supportTicket.findMany({
      where: {
        AND: [
          status ? { status } : {},
          q ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
              { customerPhone: { contains: q, mode: "insensitive" } },
              { customerPublicId: { contains: q, mode: "insensitive" } }
            ]
          } : {}
        ]
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      orderBy: { lastMessageAt: "desc" }
    });
    return NextResponse.json({ items, source: "database" });
  } catch {
    const items = (await readSupportConversations())
      .filter((item) => !status || item.status === status)
      .filter((item) => !q || [item.title, item.customerName, item.customerPhone, item.customerPublicId].join(" ").toLowerCase().includes(q))
      .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    return NextResponse.json({ items, source: "fallback" });
  }
}
