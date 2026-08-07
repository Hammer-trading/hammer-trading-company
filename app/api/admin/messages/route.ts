import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { conversationPayload, getAdminConversations, type AdminConversationFilter, type AdminConversationSort } from "@/lib/customer-chat";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.SUPPORT_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const requestedFilter = url.searchParams.get("filter") || "all";
  const requestedSort = url.searchParams.get("sort") || "latest";
  const allowedFilters: AdminConversationFilter[] = ["all", "unread", "replied", "not-replied", "pinned", "archived"];
  const allowedSorts: AdminConversationSort[] = ["latest", "oldest"];
  const filter = allowedFilters.includes(requestedFilter as AdminConversationFilter) ? requestedFilter as AdminConversationFilter : "all";
  const sort = allowedSorts.includes(requestedSort as AdminConversationSort) ? requestedSort as AdminConversationSort : "latest";
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Number(url.searchParams.get("pageSize") || 30);
  try {
    const result = await getAdminConversations(q, { filter, sort, page, pageSize });
    return NextResponse.json({ ...result, items: result.items.map(conversationPayload) });
  } catch (error) {
    console.error("Admin messages list failed", error);
    return NextResponse.json({ error: "Messages database is not ready. Please try again shortly." }, { status: 503 });
  }
}
