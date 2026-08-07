import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAdminNotification } from "@/lib/order-automation";

export type DateFilterKey = "today" | "yesterday" | "7d" | "30d" | "month" | "custom";

export type AdminDashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function getDateRange(filter: string | undefined, from?: string, to?: string) {
  const now = new Date();
  const key = (filter || "30d") as DateFilterKey;
  if (key === "today") return { key, from: startOfDay(now), to: endOfDay(now), label: "Today" };
  if (key === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return { key, from: startOfDay(yesterday), to: endOfDay(yesterday), label: "Yesterday" };
  }
  if (key === "7d") {
    const start = startOfDay(new Date(now));
    start.setDate(now.getDate() - 6);
    return { key, from: start, to: endOfDay(now), label: "Last 7 days" };
  }
  if (key === "month") return { key, from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now), label: "This month" };
  if (key === "custom" && from && to) return { key, from: startOfDay(new Date(from)), to: endOfDay(new Date(to)), label: "Custom range" };
  const start = startOfDay(new Date(now));
  start.setDate(now.getDate() - 29);
  return { key: "30d" as DateFilterKey, from: start, to: endOfDay(now), label: "Last 30 days" };
}

function toNumber(value: unknown) {
  return Number(value || 0);
}

export async function getAdminDashboardData(range: { from: Date; to: Date }) {
  const scopedWhere = { createdAt: { gte: range.from, lte: range.to } };
  const today = { createdAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) } };
  const month = {
    createdAt: {
      gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      lte: endOfDay(new Date())
    }
  };

  const lowStockWhere = {
    stock: { gt: 0 },
    AND: [{ stock: { lte: prisma.product.fields.lowStockThreshold } }]
  };

  const [
    scopedOrders,
    totalSales,
    todaySales,
    todayOrders,
    monthlySales,
    totalOrders,
    totalCustomers,
    totalProducts,
    outOfStockProducts,
    bestSellerRows,
    categoryItems,
    lowStockRows,
    productPerformance,
    abandonedCarts,
    customerMessages,
    returnRequests,
    cancelledOrders
  ] = await Promise.all([
    prisma.order.findMany({
      where: scopedWhere,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        status: true,
        total: true,
        deliveryCharge: true,
        discountTotal: true,
        profitMargin: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.order.aggregate({ _sum: { total: true } }),
    prisma.order.aggregate({ where: today, _sum: { total: true } }),
    prisma.order.count({ where: today }),
    prisma.order.aggregate({ where: month, _sum: { total: true } }),
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.count(),
    prisma.product.count({ where: { stock: { lte: 0 } } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5
    }),
    prisma.orderItem.findMany({
      where: { order: scopedWhere },
      include: { product: { include: { category: true } } }
    }),
    prisma.product.findMany({
      where: lowStockWhere,
      select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true },
      orderBy: { stock: "asc" },
      take: 8
    }),
    prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        lowStockThreshold: true,
        price: true,
        compareAtPrice: true,
        isFeatured: true,
        isBestSeller: true,
        updatedAt: true,
        orderItems: { select: { quantity: true, total: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 200
    }),
    prisma.cart.findMany({
      where: { abandoned: true },
      include: { user: true, items: { include: { product: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6
    }),
    prisma.supportTicket.count({ where: { unreadByAdmin: { gt: 0 } } }).catch(() => 0),
    prisma.supportTicket.count({ where: { type: { in: ["RETURN", "REFUND", "COMPLAINT"] }, status: { notIn: ["CLOSED", "REJECTED"] } } }).catch(() => 0),
    prisma.order.count({ where: { status: "CANCELLED", ...scopedWhere } })
  ]);

  const lowStockActual = await prisma.product.count({
    where: lowStockWhere
  }).catch(() => lowStockRows.length);

  await Promise.all(lowStockRows.slice(0, 5).map(async (product) => {
    const href = `/admin/products?q=${encodeURIComponent(product.sku)}`;
    const existing = await prisma.adminNotification.findFirst({
      where: {
        title: "Low stock alert",
        href,
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24) }
      }
    });
    if (!existing) {
      await createAdminNotification(prisma, "Low stock alert", `${product.name} has ${product.stock} left. Threshold: ${product.lowStockThreshold}.`, href);
    }
  }));

  const statusCounts = Object.fromEntries(Object.values(OrderStatus).map((status) => [status, 0])) as Record<OrderStatus, number>;
  for (const order of scopedOrders) statusCounts[order.status] += 1;

  const bestSellerProducts = await prisma.product.findMany({
    where: { id: { in: bestSellerRows.map((row) => row.productId) } },
    select: { id: true, name: true, sku: true }
  });

  const bestSellers = bestSellerRows.map((row) => {
    const product = bestSellerProducts.find((item) => item.id === row.productId);
    return {
      productId: row.productId,
      name: product?.name || "Deleted product",
      sku: product?.sku || "-",
      quantity: row._sum.quantity || 0,
      revenue: toNumber(row._sum.total)
    };
  });

  const performanceRows = productPerformance.map((product) => {
    const sold = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const revenue = product.orderItems.reduce((sum, item) => sum + Number(item.total), 0);
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold,
      sold,
      revenue,
      price: Number(product.price),
      hasDiscount: Boolean(product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)),
      isFeatured: product.isFeatured,
      isBestSeller: product.isBestSeller
    };
  });

  const slowMovingProducts = performanceRows
    .filter((product) => product.stock > Math.max(product.lowStockThreshold, 3) && product.sold <= 1)
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 6);

  const discountSuggestions = performanceRows
    .filter((product) => product.stock > Math.max(product.lowStockThreshold * 2, 8) && product.sold <= 2 && !product.hasDiscount)
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 6);

  const featureSuggestions = performanceRows
    .filter((product) => !product.isFeatured && product.stock > product.lowStockThreshold && (product.sold > 0 || product.isBestSeller))
    .sort((a, b) => b.sold - a.sold || b.revenue - a.revenue)
    .slice(0, 6);

  const categoryMap = new Map<string, { name: string; revenue: number; quantity: number }>();
  for (const item of categoryItems) {
    const key = item.product.categoryId;
    const current = categoryMap.get(key) || { name: item.product.category.name, revenue: 0, quantity: 0 };
    current.revenue += Number(item.total);
    current.quantity += item.quantity;
    categoryMap.set(key, current);
  }

  const byDay = new Map<string, { date: string; sales: number; orders: number }>();
  for (const order of scopedOrders) {
    const date = order.createdAt.toISOString().slice(0, 10);
    const current = byDay.get(date) || { date, sales: 0, orders: 0 };
    current.sales += Number(order.total);
    current.orders += 1;
    byDay.set(date, current);
  }

  return {
    totals: {
      sales: toNumber(totalSales._sum.total),
      todaySales: toNumber(todaySales._sum.total),
      monthlySales: toNumber(monthlySales._sum.total),
      todayOrders,
      orders: totalOrders,
      customers: totalCustomers,
      products: totalProducts,
      scopedOrders: scopedOrders.length,
      pendingOrders: statusCounts.PENDING,
      cancelledOrders,
      returnRequests,
      customerMessages,
      abandonedCarts: abandonedCarts.length,
      deliveryCharges: scopedOrders.reduce((sum, order) => sum + Number(order.deliveryCharge), 0),
      discounts: scopedOrders.reduce((sum, order) => sum + Number(order.discountTotal), 0),
      estimatedProfit: scopedOrders.reduce((sum, order) => sum + Number(order.profitMargin), 0),
      lowStockProducts: lowStockActual,
      outOfStockProducts
    },
    statusCounts,
    recentOrders: scopedOrders.slice(0, 8).map((order) => ({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString()
    })),
    bestSellers,
    lowStockList: lowStockRows.map((product) => ({ ...product })),
    slowMovingProducts,
    discountSuggestions,
    featureSuggestions,
    abandonedCartList: abandonedCarts.map((cart) => ({
      id: cart.id,
      customerName: cart.user?.name || "Guest customer",
      customerEmail: cart.user?.email || null,
      customerPhone: cart.user?.phone || null,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
      updatedAt: cart.updatedAt.toISOString()
    })),
    salesChart: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
    revenueChart: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
    categoryPerformance: Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
    stockChart: [
      { name: "Low stock", count: lowStockActual },
      { name: "Out of stock", count: outOfStockProducts },
      { name: "Healthy stock", count: Math.max(0, totalProducts - lowStockActual - outOfStockProducts) }
    ]
  };
}

export function getEmptyAdminDashboardData(): AdminDashboardData {
  const statusCounts = Object.fromEntries(Object.values(OrderStatus).map((status) => [status, 0])) as Record<OrderStatus, number>;

  return {
    totals: {
      sales: 0,
      todaySales: 0,
      monthlySales: 0,
      todayOrders: 0,
      orders: 0,
      customers: 0,
      products: 0,
      scopedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      returnRequests: 0,
      customerMessages: 0,
      abandonedCarts: 0,
      deliveryCharges: 0,
      discounts: 0,
      estimatedProfit: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0
    },
    statusCounts,
    recentOrders: [],
    bestSellers: [],
    lowStockList: [],
    slowMovingProducts: [],
    discountSuggestions: [],
    featureSuggestions: [],
    abandonedCartList: [],
    salesChart: [],
    revenueChart: [],
    categoryPerformance: [],
    stockChart: []
  };
}
