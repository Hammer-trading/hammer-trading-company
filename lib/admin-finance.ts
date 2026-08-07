import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { getDateRange, type DateFilterKey } from "@/lib/admin-dashboard";
import { prisma } from "@/lib/prisma";

export type FinanceFilterInput = {
  filter?: string;
  from?: string;
  to?: string;
  q?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  orderStatus?: string;
  page?: string | number;
  pageSize?: string | number;
};

export type FinanceFilters = {
  filter: DateFilterKey;
  from: Date;
  to: Date;
  label: string;
  q: string;
  paymentMethod: PaymentMethod | null;
  paymentStatus: PaymentStatus | null;
  orderStatus: OrderStatus | null;
  page: number;
  pageSize: number;
};

const excludedRevenueStatuses = new Set<OrderStatus>([
  OrderStatus.CANCELLED,
  OrderStatus.REFUNDED
]);

function validDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : value;
}

function enumValue<T extends string>(values: readonly T[], value?: string) {
  return value && values.includes(value as T) ? value as T : null;
}

function number(value: unknown) {
  return Number(value || 0);
}

function iso(value: Date | null | undefined) {
  return value?.toISOString() || null;
}

function title(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseFinanceFilters(input: FinanceFilterInput): FinanceFilters {
  const requestedFilter = input.filter || "30d";
  const safeFrom = validDate(input.from);
  const safeTo = validDate(input.to);
  const range = getDateRange(
    requestedFilter === "custom" && (!safeFrom || !safeTo) ? "30d" : requestedFilter,
    safeFrom,
    safeTo
  );

  return {
    filter: range.key,
    from: range.from,
    to: range.to,
    label: range.label,
    q: String(input.q || "").trim().slice(0, 120),
    paymentMethod: enumValue(Object.values(PaymentMethod), input.paymentMethod),
    paymentStatus: enumValue(Object.values(PaymentStatus), input.paymentStatus),
    orderStatus: enumValue(Object.values(OrderStatus), input.orderStatus),
    page: Math.max(1, Math.floor(Number(input.page || 1) || 1)),
    pageSize: Math.min(100, Math.max(10, Math.floor(Number(input.pageSize || 25) || 25)))
  };
}

function orderWhere(filters: FinanceFilters): Prisma.OrderWhereInput {
  return {
    createdAt: { gte: filters.from, lte: filters.to },
    ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
    ...(filters.paymentStatus ? { paymentStatus: filters.paymentStatus } : {}),
    ...(filters.orderStatus ? { status: filters.orderStatus } : {}),
    ...(filters.q ? {
      OR: [
        { orderNumber: { contains: filters.q, mode: "insensitive" } },
        { invoiceNumber: { contains: filters.q, mode: "insensitive" } },
        { customerName: { contains: filters.q, mode: "insensitive" } },
        { customerPhone: { contains: filters.q, mode: "insensitive" } },
        { customerEmail: { contains: filters.q, mode: "insensitive" } },
        { city: { contains: filters.q, mode: "insensitive" } }
      ]
    } : {})
  };
}

const orderFinanceSelect = {
  id: true,
  orderNumber: true,
  invoiceNumber: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  city: true,
  subtotal: true,
  discountTotal: true,
  manualDiscount: true,
  serviceCharge: true,
  deliveryCharge: true,
  manualDeliveryCharge: true,
  codAmount: true,
  total: true,
  profitMargin: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  createdAt: true,
  deliveredAt: true
} satisfies Prisma.OrderSelect;

type OrderFinanceRecord = Prisma.OrderGetPayload<{ select: typeof orderFinanceSelect }>;

function isRevenueFinanceOrder(order: OrderFinanceRecord) {
  return !excludedRevenueStatuses.has(order.status);
}

function financeOrderRow(order: OrderFinanceRecord) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoiceNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    city: order.city,
    subtotal: number(order.subtotal),
    discounts: number(order.discountTotal) + number(order.manualDiscount),
    serviceCharge: number(order.serviceCharge),
    deliveryCharge: number(order.manualDeliveryCharge ?? order.deliveryCharge),
    codAmount: number(order.codAmount),
    total: number(order.total),
    profit: number(order.profitMargin),
    paidAmount: order.paymentStatus === PaymentStatus.PAID ? number(order.total) : 0,
    outstandingAmount: isRevenueFinanceOrder(order) && order.paymentStatus === PaymentStatus.PENDING
      ? number(order.codAmount || order.total)
      : 0,
    refundedAmount: order.paymentStatus === PaymentStatus.REFUNDED || order.status === OrderStatus.REFUNDED
      ? number(order.total)
      : 0,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    createdAt: order.createdAt.toISOString(),
    deliveredAt: iso(order.deliveredAt)
  };
}

export async function getAdminFinanceOrderExportRows(filters: FinanceFilters) {
  const orders = await prisma.order.findMany({
    where: orderWhere(filters),
    select: orderFinanceSelect,
    orderBy: { createdAt: "desc" }
  });
  return orders.map(financeOrderRow);
}

export async function getAdminFinanceData(filters: FinanceFilters) {
  const where = orderWhere(filters);
  const rangeWhere = { createdAt: { gte: filters.from, lte: filters.to } };
  const [financeOrders, ledgerOrders, totalLedgerOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      select: orderFinanceSelect,
      orderBy: { createdAt: "asc" }
    }),
    prisma.order.findMany({
      where,
      select: orderFinanceSelect,
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize
    }),
    prisma.order.count({ where })
  ]);

  const packages = await prisma.productPackage.findMany({
    include: {
      category: { select: { name: true } },
      installationService: { select: { name: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        select: {
          quantity: true,
          product: { select: { name: true, sku: true, price: true, stock: true } },
          variant: { select: { title: true, sku: true, price: true, stock: true } }
        }
      },
      orderItems: {
        where: { order: rangeWhere },
        select: { orderId: true, quantity: true, total: true }
      },
      serviceBookings: {
        where: rangeWhere,
        select: {
          status: true,
          materialSubtotal: true,
          serviceCharge: true,
          quotedTotal: true,
          quotationAmount: true,
          convertedOrderId: true
        }
      }
    },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    take: 200
  });

  const [serviceBookings, quoteRequests, returnTickets] = await Promise.all([
    prisma.serviceBooking.findMany({
      where: rangeWhere,
      select: {
        id: true,
        requestNumber: true,
        customerName: true,
        phone: true,
        city: true,
        status: true,
        materialSubtotal: true,
        serviceCharge: true,
        quotedTotal: true,
        quotationAmount: true,
        createdAt: true,
        service: { select: { name: true } },
        package: { select: { name: true, sku: true } },
        convertedOrder: {
          select: {
            orderNumber: true,
            total: true,
            paymentMethod: true,
            paymentStatus: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 250
    }),
    prisma.quoteRequest.findMany({
      where: rangeWhere,
      select: {
        id: true,
        productName: true,
        customerName: true,
        customerPhone: true,
        city: true,
        status: true,
        quotedSubtotal: true,
        discountTotal: true,
        deliveryCharge: true,
        quotedTotal: true,
        createdAt: true,
        validUntil: true,
        _count: { select: { items: true } },
        convertedOrder: {
          select: {
            orderNumber: true,
            total: true,
            paymentMethod: true,
            paymentStatus: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 250
    }),
    prisma.supportTicket.findMany({
      where: {
        createdAt: { gte: filters.from, lte: filters.to },
        type: { in: ["RETURN", "RETURN_REQUEST", "REFUND"] }
      },
      select: {
        id: true,
        orderId: true,
        customerName: true,
        customerPhone: true,
        title: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ]);

  const isRevenueOrder = isRevenueFinanceOrder;
  const grossSales = financeOrders.filter(isRevenueOrder).reduce((sum, order) => sum + number(order.total), 0);
  const collected = financeOrders
    .filter((order) => isRevenueOrder(order) && order.paymentStatus === PaymentStatus.PAID)
    .reduce((sum, order) => sum + number(order.total), 0);
  const outstanding = financeOrders
    .filter((order) => isRevenueOrder(order) && order.paymentStatus === PaymentStatus.PENDING)
    .reduce((sum, order) => sum + number(order.codAmount || order.total), 0);
  const pendingCod = financeOrders
    .filter((order) => isRevenueOrder(order) && order.paymentMethod === PaymentMethod.COD && order.paymentStatus === PaymentStatus.PENDING)
    .reduce((sum, order) => sum + number(order.codAmount || order.total), 0);
  const refunded = financeOrders
    .filter((order) => order.paymentStatus === PaymentStatus.REFUNDED || order.status === OrderStatus.REFUNDED)
    .reduce((sum, order) => sum + number(order.total), 0);
  const cancelled = financeOrders
    .filter((order) => order.status === OrderStatus.CANCELLED)
    .reduce((sum, order) => sum + number(order.total), 0);
  const deliveryCharges = financeOrders.filter(isRevenueOrder).reduce(
    (sum, order) => sum + number(order.manualDeliveryCharge ?? order.deliveryCharge),
    0
  );
  const serviceCharges = financeOrders.filter(isRevenueOrder).reduce((sum, order) => sum + number(order.serviceCharge), 0);
  const discounts = financeOrders.filter(isRevenueOrder).reduce(
    (sum, order) => sum + number(order.discountTotal) + number(order.manualDiscount),
    0
  );
  const estimatedProfit = financeOrders.filter(isRevenueOrder).reduce((sum, order) => sum + number(order.profitMargin), 0);

  const byDay = new Map<string, { date: string; gross: number; collected: number; outstanding: number }>();
  for (const order of financeOrders) {
    const date = order.createdAt.toISOString().slice(0, 10);
    const current = byDay.get(date) || { date, gross: 0, collected: 0, outstanding: 0 };
    if (isRevenueOrder(order)) {
      current.gross += number(order.total);
      if (order.paymentStatus === PaymentStatus.PAID) current.collected += number(order.total);
      if (order.paymentStatus === PaymentStatus.PENDING) current.outstanding += number(order.codAmount || order.total);
    }
    byDay.set(date, current);
  }

  const paymentStatusMap = new Map<string, { status: string; count: number; amount: number }>();
  const paymentMethodMap = new Map<string, { method: string; count: number; amount: number }>();
  for (const order of financeOrders) {
    const statusRow = paymentStatusMap.get(order.paymentStatus) || { status: title(order.paymentStatus), count: 0, amount: 0 };
    statusRow.count += 1;
    statusRow.amount += number(order.total);
    paymentStatusMap.set(order.paymentStatus, statusRow);

    const methodRow = paymentMethodMap.get(order.paymentMethod) || { method: title(order.paymentMethod), count: 0, amount: 0 };
    methodRow.count += 1;
    methodRow.amount += number(order.total);
    paymentMethodMap.set(order.paymentMethod, methodRow);
  }

  const packageRows = packages.map((entry) => {
    const materialValue = entry.items.reduce((sum, item) => {
      const unitPrice = number(item.variant?.price ?? item.product.price);
      return sum + unitPrice * item.quantity;
    }, 0);
    const buildableUnits = entry.items.length
      ? Math.max(0, Math.min(...entry.items.map((item) => Math.floor(number(item.variant?.stock ?? item.product.stock) / Math.max(1, item.quantity)))))
      : 0;
    const orderIds = new Set(entry.orderItems.map((item) => item.orderId));
    const orderRevenue = entry.orderItems.reduce((sum, item) => sum + number(item.total), 0);
    const bookingQuotedValue = entry.serviceBookings.reduce(
      (sum, booking) => sum + number(booking.quotedTotal ?? booking.quotationAmount),
      0
    );
    return {
      id: entry.id,
      name: entry.name,
      sku: entry.sku,
      category: entry.category?.name || "Uncategorized",
      service: entry.installationService?.name || null,
      status: entry.status,
      isActive: entry.isActive,
      originalPrice: number(entry.originalPrice),
      fixedDiscount: number(entry.fixedDiscount),
      percentageDiscount: entry.percentageDiscount,
      finalPrice: number(entry.finalPrice),
      materialValue,
      itemCount: entry.items.length,
      buildableUnits,
      orderCount: orderIds.size,
      soldLineQuantity: entry.orderItems.reduce((sum, item) => sum + item.quantity, 0),
      orderRevenue,
      bookings: entry.serviceBookings.length,
      bookingQuotedValue,
      convertedBookings: entry.serviceBookings.filter((booking) => booking.convertedOrderId).length
    };
  }).sort((a, b) => b.orderRevenue + b.bookingQuotedValue - (a.orderRevenue + a.bookingQuotedValue));

  const serviceRows = serviceBookings.map((booking) => ({
    id: booking.id,
    requestNumber: booking.requestNumber,
    customerName: booking.customerName,
    phone: booking.phone,
    city: booking.city,
    service: booking.service.name,
    packageName: booking.package?.name || null,
    packageSku: booking.package?.sku || null,
    status: booking.status,
    materialSubtotal: number(booking.materialSubtotal),
    serviceCharge: number(booking.serviceCharge),
    quotedTotal: number(booking.quotedTotal ?? booking.quotationAmount),
    convertedOrderNumber: booking.convertedOrder?.orderNumber || null,
    convertedOrderTotal: number(booking.convertedOrder?.total),
    paymentMethod: booking.convertedOrder?.paymentMethod || null,
    paymentStatus: booking.convertedOrder?.paymentStatus || null,
    createdAt: booking.createdAt.toISOString()
  }));

  const wholesaleRows = quoteRequests.map((quote) => ({
    id: quote.id,
    reference: quote.id.slice(-8).toUpperCase(),
    customerName: quote.customerName,
    phone: quote.customerPhone,
    city: quote.city,
    productName: quote.productName,
    itemCount: quote._count.items,
    status: quote.status,
    subtotal: number(quote.quotedSubtotal),
    discount: number(quote.discountTotal),
    delivery: number(quote.deliveryCharge),
    total: number(quote.quotedTotal),
    validUntil: iso(quote.validUntil),
    convertedOrderNumber: quote.convertedOrder?.orderNumber || null,
    convertedOrderTotal: number(quote.convertedOrder?.total),
    paymentMethod: quote.convertedOrder?.paymentMethod || null,
    paymentStatus: quote.convertedOrder?.paymentStatus || null,
    createdAt: quote.createdAt.toISOString()
  }));

  return {
    generatedAt: new Date().toISOString(),
    range: {
      filter: filters.filter,
      label: filters.label,
      from: filters.from.toISOString().slice(0, 10),
      to: filters.to.toISOString().slice(0, 10)
    },
    appliedFilters: {
      q: filters.q,
      paymentMethod: filters.paymentMethod,
      paymentStatus: filters.paymentStatus,
      orderStatus: filters.orderStatus
    },
    summary: {
      grossSales,
      collected,
      outstanding,
      pendingCod,
      refunded,
      cancelled,
      deliveryCharges,
      serviceCharges,
      discounts,
      estimatedProfit,
      orderCount: financeOrders.length,
      paidOrders: financeOrders.filter((order) => order.paymentStatus === PaymentStatus.PAID).length,
      pendingOrders: financeOrders.filter((order) => order.paymentStatus === PaymentStatus.PENDING).length,
      refundedOrders: financeOrders.filter((order) => order.paymentStatus === PaymentStatus.REFUNDED || order.status === OrderStatus.REFUNDED).length,
      packageRevenue: packageRows.reduce((sum, entry) => sum + entry.orderRevenue, 0),
      packageQuotedPipeline: packageRows.reduce((sum, entry) => sum + entry.bookingQuotedValue, 0),
      serviceQuotedPipeline: serviceRows.reduce((sum, entry) => sum + entry.quotedTotal, 0),
      serviceCollected: serviceRows
        .filter((entry) => entry.paymentStatus === PaymentStatus.PAID)
        .reduce((sum, entry) => sum + entry.convertedOrderTotal, 0),
      wholesaleQuotedPipeline: wholesaleRows.reduce((sum, entry) => sum + entry.total, 0),
      wholesaleCollected: wholesaleRows
        .filter((entry) => entry.paymentStatus === PaymentStatus.PAID)
        .reduce((sum, entry) => sum + entry.convertedOrderTotal, 0),
      openReturnRequests: returnTickets.filter((ticket) => !["CLOSED", "REJECTED", "REFUNDED"].includes(ticket.status)).length
    },
    trend: Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date)),
    paymentStatuses: Array.from(paymentStatusMap.values()).sort((a, b) => b.amount - a.amount),
    paymentMethods: Array.from(paymentMethodMap.values()).sort((a, b) => b.amount - a.amount),
    revenueComposition: [
      { name: "Product subtotal", amount: financeOrders.filter(isRevenueOrder).reduce((sum, order) => sum + number(order.subtotal), 0) },
      { name: "Delivery charges", amount: deliveryCharges },
      { name: "Service charges", amount: serviceCharges },
      { name: "Discounts", amount: discounts }
    ],
    orders: ledgerOrders.map(financeOrderRow),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: totalLedgerOrders,
      pages: Math.max(1, Math.ceil(totalLedgerOrders / filters.pageSize))
    },
    packages: packageRows,
    serviceBookings: serviceRows,
    wholesaleQuotes: wholesaleRows,
    returnRequests: returnTickets.map((ticket) => ({
      id: ticket.id,
      orderId: ticket.orderId,
      customerName: ticket.customerName,
      customerPhone: ticket.customerPhone,
      title: ticket.title,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString()
    }))
  };
}

export type AdminFinanceData = Awaited<ReturnType<typeof getAdminFinanceData>>;

export function getEmptyAdminFinanceData(filters: FinanceFilters): AdminFinanceData {
  return {
    generatedAt: new Date().toISOString(),
    range: {
      filter: filters.filter,
      label: filters.label,
      from: filters.from.toISOString().slice(0, 10),
      to: filters.to.toISOString().slice(0, 10)
    },
    appliedFilters: {
      q: filters.q,
      paymentMethod: filters.paymentMethod,
      paymentStatus: filters.paymentStatus,
      orderStatus: filters.orderStatus
    },
    summary: {
      grossSales: 0,
      collected: 0,
      outstanding: 0,
      pendingCod: 0,
      refunded: 0,
      cancelled: 0,
      deliveryCharges: 0,
      serviceCharges: 0,
      discounts: 0,
      estimatedProfit: 0,
      orderCount: 0,
      paidOrders: 0,
      pendingOrders: 0,
      refundedOrders: 0,
      packageRevenue: 0,
      packageQuotedPipeline: 0,
      serviceQuotedPipeline: 0,
      serviceCollected: 0,
      wholesaleQuotedPipeline: 0,
      wholesaleCollected: 0,
      openReturnRequests: 0
    },
    trend: [],
    paymentStatuses: [],
    paymentMethods: [],
    revenueComposition: [
      { name: "Product subtotal", amount: 0 },
      { name: "Delivery charges", amount: 0 },
      { name: "Service charges", amount: 0 },
      { name: "Discounts", amount: 0 }
    ],
    orders: [],
    pagination: { page: 1, pageSize: filters.pageSize, total: 0, pages: 1 },
    packages: [],
    serviceBookings: [],
    wholesaleQuotes: [],
    returnRequests: []
  };
}
