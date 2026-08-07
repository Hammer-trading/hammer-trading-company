import { Permission } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.REPORTS_READ);
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const format = new URL(request.url).searchParams.get("format") || "csv";
  const orders = await prisma.order.findMany({ include: { courier: true, assignedRider: true }, orderBy: { createdAt: "desc" } });
  const rows = orders.map((order) => ({ order: order.orderNumber, status: order.status, city: order.city, total: order.total, delivery: order.deliveryCharge, discount: order.discountTotal, profit: order.profitMargin, courier: order.courier?.name || order.courierName || "", rider: order.assignedRider?.name || "", createdAt: order.createdAt.toISOString() }));
  if (format === "pdf") {
    return new Response(`<html><body><h1>Hammer Trading Company Report</h1><pre>${toCsv(rows)}</pre></body></html>`, { headers: { "Content-Type": "text/html", "Content-Disposition": "attachment; filename=report.html" } });
  }
  return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=report.${format === "excel" ? "xls" : "csv"}` } });
}
