import { Permission } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getAdminFinanceData, parseFinanceFilters } from "@/lib/admin-finance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.REPORTS_READ);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const filters = parseFinanceFilters(Object.fromEntries(searchParams.entries()));
    const data = await getAdminFinanceData(filters);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Finance dashboard load failed", error);
    return NextResponse.json(
      { error: "Finance data is temporarily unavailable. Please retry." },
      { status: 503 }
    );
  }
}
