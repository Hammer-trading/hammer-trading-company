import { OrderStatus, PaymentMethod, Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { fallbackOrderStatuses, filterFallbackOrders, readFallbackOrders } from "@/lib/fallback-orders";
import { buildOrderEngineSummary } from "@/lib/order-engine";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.ORDERS_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const status = url.searchParams.get("status") || "";
  const city = url.searchParams.get("city") || "";
  const paymentMethod = url.searchParams.get("paymentMethod") || "";
  const courierId = url.searchParams.get("courierId") || "";
  const riderId = url.searchParams.get("riderId") || "";
  const printStatus = url.searchParams.get("printStatus") || "";
  const risk = url.searchParams.get("risk") || "";
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") || 20)));
  const where: Prisma.OrderWhereInput = {
    AND: [
      q ? { OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: q } }, { trackingNumber: { contains: q, mode: "insensitive" } }, { items: { some: { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { product: { name: { contains: q, mode: "insensitive" } } }, { product: { sku: { contains: q, mode: "insensitive" } } }] } } }] } : {},
      status && Object.values(OrderStatus).includes(status as OrderStatus) ? { status: status as OrderStatus } : {},
      city ? { city: { contains: city, mode: "insensitive" } } : {},
      paymentMethod && Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod) ? { paymentMethod: paymentMethod as PaymentMethod } : {},
      courierId ? { courierId } : {},
      riderId ? { assignedRiderId: riderId } : {},
      printStatus === "printed" ? { activityLogs: { some: { action: "ORDER_BULK_PRINTED" } } } : {},
      printStatus === "not_printed" ? { activityLogs: { none: { action: "ORDER_BULK_PRINTED" } } } : {},
      from || to ? { createdAt: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } } : {}
    ]
  };
  try {
    const [rawItems, total, couriers, riders] = await Promise.all([
      prisma.order.findMany({ where, include: { courier: true, assignedRider: true, items: true, timeline: { orderBy: { createdAt: "desc" }, take: 3 }, qrcodes: true, activityLogs: { where: { action: "ORDER_BULK_PRINTED" }, orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.order.count({ where }),
      prisma.courier.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.user.findMany({ where: { role: "DELIVERY_STAFF", isActive: true }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } })
    ]);
    const phones = Array.from(new Set(rawItems.map((order) => order.customerPhone).filter(Boolean)));
    const [phoneCounts, failedCounts, cancelledCounts] = phones.length
      ? await Promise.all([
          prisma.order.groupBy({ by: ["customerPhone"], where: { customerPhone: { in: phones } }, _count: { _all: true } }),
          prisma.order.groupBy({ by: ["customerPhone"], where: { customerPhone: { in: phones }, status: "DELIVERY_FAILED" }, _count: { _all: true } }),
          prisma.order.groupBy({ by: ["customerPhone"], where: { customerPhone: { in: phones }, status: "CANCELLED" }, _count: { _all: true } })
        ])
      : [[], [], []];
    const countMap = new Map(phoneCounts.map((item) => [item.customerPhone, item._count._all]));
    const failedMap = new Map(failedCounts.map((item) => [item.customerPhone, item._count._all]));
    const cancelledMap = new Map(cancelledCounts.map((item) => [item.customerPhone, item._count._all]));
    const enhancedItems = rawItems.map((order) => ({
      ...order,
      engine: buildOrderEngineSummary({
        ...order,
        total: Number(order.total),
        codAmount: order.codAmount === null ? null : Number(order.codAmount),
        items: order.items,
        _count: {
          customerPhoneMatches: countMap.get(order.customerPhone) || 0,
          customerFailedDeliveries: failedMap.get(order.customerPhone) || 0,
          customerCancelledOrders: cancelledMap.get(order.customerPhone) || 0
        }
      })
    }));
    const items = risk ? enhancedItems.filter((order) => order.engine.riskLevel === risk || order.engine.slaStatus === risk) : enhancedItems;
    return NextResponse.json({ items, total, page, pageSize, pages: Math.ceil(total / pageSize), couriers, riders, statuses: Object.values(OrderStatus), source: "database" });
  } catch {
    const all = await readFallbackOrders();
    const filtered = filterFallbackOrders(all, { q, status, city, paymentMethod, from, to, printStatus });
    const total = filtered.length;
    const items = filtered.slice((page - 1) * pageSize, page * pageSize).map((order) => ({
      ...order,
      engine: buildOrderEngineSummary({
        ...order,
        total: order.total,
        codAmount: order.codAmount,
        items: order.items,
        _count: { customerPhoneMatches: all.filter((item) => item.customerPhone === order.customerPhone).length }
      })
    })).filter((order) => !risk || order.engine.riskLevel === risk || order.engine.slaStatus === risk);
    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
      couriers: [{ id: "fallback-local", name: "Local fallback delivery" }],
      riders: [],
      statuses: fallbackOrderStatuses,
      source: "fallback"
    });
  }
}
