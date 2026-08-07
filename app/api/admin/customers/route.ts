import { Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toCsv } from "@/lib/csv";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.CUSTOMERS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "";
  const exportType = url.searchParams.get("export");
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    AND: [
      q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {},
      status ? { isActive: status === "active" } : {}
    ]
  };
  const customers = await prisma.user.findMany({ where, include: { orders: true, addresses: true, supportTickets: true }, orderBy: { createdAt: "desc" } });
  if (exportType === "csv") {
    return new Response(toCsv(customers.map((customer) => {
      const spending = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
      return { name: customer.name, email: customer.email, phone: customer.phone || "", active: customer.isActive, orders: customer.orders.length, spending };
    })), { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=customers.csv" } });
  }
  return NextResponse.json(customers.map((customer) => {
    const totalSpending = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
    return { ...customer, passwordHash: undefined, totalSpending, averageOrderValue: customer.orders.length ? totalSpending / customer.orders.length : 0 };
  }));
}
