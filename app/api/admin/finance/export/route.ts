import { Permission } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import {
  getAdminFinanceData,
  getAdminFinanceOrderExportRows,
  parseFinanceFilters,
  type AdminFinanceData
} from "@/lib/admin-finance";

export const dynamic = "force-dynamic";

type CsvRow = Record<string, string | number | null>;

function csvCell(value: string | number | null | undefined) {
  const plain = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(plain) ? `'${plain}` : plain;
  return `"${safe.replaceAll('"', '""')}"`;
}

function csv(rows: CsvRow[]) {
  const columns = [
    "recordType",
    "reference",
    "customer",
    "category",
    "status",
    "paymentMethod",
    "paymentStatus",
    "subtotal",
    "discount",
    "deliveryCharge",
    "serviceCharge",
    "total",
    "collected",
    "outstanding",
    "createdAt",
    "details"
  ];
  return [
    columns.map(csvCell).join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))
  ].join("\r\n");
}

function financeRows(data: AdminFinanceData): CsvRow[] {
  const orders: CsvRow[] = data.orders.map((order) => ({
    recordType: "Order",
    reference: order.orderNumber,
    customer: order.customerName,
    category: "Store order",
    status: order.orderStatus,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotal: order.subtotal,
    discount: order.discounts,
    deliveryCharge: order.deliveryCharge,
    serviceCharge: order.serviceCharge,
    total: order.total,
    collected: order.paidAmount,
    outstanding: order.outstandingAmount,
    createdAt: order.createdAt,
    details: order.invoiceNumber || ""
  }));
  const packages: CsvRow[] = data.packages.map((entry) => ({
    recordType: "Package",
    reference: entry.sku,
    customer: "",
    category: entry.category,
    status: entry.isActive ? entry.status : "INACTIVE",
    paymentMethod: "",
    paymentStatus: "",
    subtotal: entry.materialValue,
    discount: entry.fixedDiscount,
    deliveryCharge: 0,
    serviceCharge: 0,
    total: entry.finalPrice,
    collected: entry.orderRevenue,
    outstanding: entry.bookingQuotedValue,
    createdAt: "",
    details: `${entry.name}; ${entry.itemCount} products; ${entry.buildableUnits} buildable`
  }));
  const bookings: CsvRow[] = data.serviceBookings.map((entry) => ({
    recordType: "Service booking",
    reference: entry.requestNumber,
    customer: entry.customerName,
    category: entry.service,
    status: entry.status,
    paymentMethod: entry.paymentMethod,
    paymentStatus: entry.paymentStatus,
    subtotal: entry.materialSubtotal,
    discount: 0,
    deliveryCharge: 0,
    serviceCharge: entry.serviceCharge,
    total: entry.quotedTotal,
    collected: entry.paymentStatus === "PAID" ? entry.convertedOrderTotal : 0,
    outstanding: entry.paymentStatus === "PAID" ? 0 : entry.quotedTotal,
    createdAt: entry.createdAt,
    details: entry.packageName || "Custom service"
  }));
  const wholesale: CsvRow[] = data.wholesaleQuotes.map((entry) => ({
    recordType: "Wholesale quote",
    reference: entry.reference,
    customer: entry.customerName,
    category: "Wholesale",
    status: entry.status,
    paymentMethod: entry.paymentMethod,
    paymentStatus: entry.paymentStatus,
    subtotal: entry.subtotal,
    discount: entry.discount,
    deliveryCharge: entry.delivery,
    serviceCharge: 0,
    total: entry.total,
    collected: entry.paymentStatus === "PAID" ? entry.convertedOrderTotal : 0,
    outstanding: entry.paymentStatus === "PAID" ? 0 : entry.total,
    createdAt: entry.createdAt,
    details: `${entry.productName}; ${entry.itemCount} lines`
  }));
  const returns: CsvRow[] = data.returnRequests.map((entry) => ({
    recordType: "Return / refund request",
    reference: entry.orderId || entry.id,
    customer: entry.customerName,
    category: "Returns",
    status: entry.status,
    paymentMethod: "",
    paymentStatus: "",
    subtotal: 0,
    discount: 0,
    deliveryCharge: 0,
    serviceCharge: 0,
    total: 0,
    collected: 0,
    outstanding: 0,
    createdAt: entry.createdAt,
    details: entry.title
  }));
  return [...orders, ...packages, ...bookings, ...wholesale, ...returns];
}

export async function GET(request: Request) {
  const admin = await requirePermission(Permission.REPORTS_READ);
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const searchParams = new URL(request.url).searchParams;
    const filters = parseFinanceFilters({
      ...Object.fromEntries(searchParams.entries()),
      page: 1,
      pageSize: 100
    });
    const [firstPage, orderRows] = await Promise.all([
      getAdminFinanceData(filters),
      getAdminFinanceOrderExportRows(filters)
    ]);
    const allRows = financeRows({ ...firstPage, orders: orderRows });
    const body = `\uFEFF${csv(allRows)}`;
    const filename = `hammer-finance-${firstPage.range.from}-to-${firstPage.range.to}.csv`;

    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    console.error("Finance CSV export failed", error);
    return new Response("Finance export is temporarily unavailable.", { status: 503 });
  }
}
