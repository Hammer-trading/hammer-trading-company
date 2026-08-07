import { AdminShell } from "@/components/admin-shell";
import { AdminResourcePage } from "@/components/admin-resource-page";
import { ReportExportButtons } from "@/components/admin-ops-managers";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  let sales = 0;
  let todaySales = 0;
  let profit = 0;
  let carts = 0;
  let reports = 0;
  let codExposure = 0;
  let cancelled = 0;
  let returned = 0;
  let cityRows: Array<{ city: string; orders: number; revenue: number }> = [];
  let statusRows: Array<{ status: string; count: number }> = [];
  let paymentRows: Array<{ method: string; count: number }> = [];
  let topProducts: Array<{ name: string; sku: string; quantity: number; revenue: number }> = [];
  try {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const [orderAgg, todayAgg, cartCount, reportCount, recentOrders, itemRows] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true, profitMargin: true } }),
      prisma.order.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { total: true } }),
      prisma.cart.count({ where: { abandoned: true } }),
      prisma.reportSnapshot.count(),
      prisma.order.findMany({
        select: { city: true, status: true, paymentMethod: true, paymentStatus: true, codAmount: true, total: true },
        orderBy: { createdAt: "desc" },
        take: 500
      }),
      prisma.orderItem.findMany({
        select: { name: true, sku: true, quantity: true, total: true },
        take: 1000
      })
    ]);
    sales = Number(orderAgg._sum.total || 0);
    todaySales = Number(todayAgg._sum.total || 0);
    profit = Number(orderAgg._sum.profitMargin || 0);
    carts = cartCount;
    reports = reportCount;
    codExposure = recentOrders.filter((order) => order.paymentMethod === "COD" && order.paymentStatus === "PENDING").reduce((sum, order) => sum + Number(order.codAmount || order.total), 0);
    cancelled = recentOrders.filter((order) => order.status === "CANCELLED").length;
    returned = recentOrders.filter((order) => ["RETURNED", "REFUNDED"].includes(order.status)).length;

    const cityMap = new Map<string, { city: string; orders: number; revenue: number }>();
    const statusMap = new Map<string, number>();
    const paymentMap = new Map<string, number>();
    for (const order of recentOrders) {
      const city = order.city || "Unknown";
      const cityCurrent = cityMap.get(city) || { city, orders: 0, revenue: 0 };
      cityCurrent.orders += 1;
      cityCurrent.revenue += Number(order.total);
      cityMap.set(city, cityCurrent);
      statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
      paymentMap.set(order.paymentMethod, (paymentMap.get(order.paymentMethod) || 0) + 1);
    }
    cityRows = Array.from(cityMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    statusRows = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
    paymentRows = Array.from(paymentMap.entries()).map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count);

    const productMap = new Map<string, { name: string; sku: string; quantity: number; revenue: number }>();
    for (const item of itemRows) {
      const current = productMap.get(item.sku) || { name: item.name, sku: item.sku, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += Number(item.total);
      productMap.set(item.sku, current);
    }
    topProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue).slice(0, 8);
  } catch {}
  return (
    <AdminShell>
      <AdminResourcePage title="Reports" description="Sales, profit margin, best-seller calculation, abandoned carts, coupon expiry, low-stock, daily/monthly snapshots.">
        <ReportExportButtons />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-slate-200 p-4"><span className="text-sm text-slate-500">Daily sales</span><strong className="mt-2 block text-2xl">{money(todaySales)}</strong></div>
          <div className="rounded-md border border-slate-200 p-4"><span className="text-sm text-slate-500">Profit</span><strong className="mt-2 block text-2xl">{money(profit)}</strong></div>
          <div className="rounded-md border border-slate-200 p-4"><span className="text-sm text-slate-500">Abandoned carts</span><strong className="mt-2 block text-2xl">{carts}</strong></div>
          <div className="rounded-md border border-slate-200 p-4"><span className="text-sm text-slate-500">All-time sales</span><strong className="mt-2 block text-2xl">{money(sales)}</strong></div>
          <div className="rounded-md border border-slate-200 p-4"><span className="text-sm text-slate-500">Snapshots</span><strong className="mt-2 block text-2xl">{reports}</strong></div>
          <div className="rounded-md border border-slate-200 p-4"><span className="text-sm text-slate-500">Pending COD exposure</span><strong className="mt-2 block text-2xl">{money(codExposure)}</strong></div>
          <div className="rounded-md border border-slate-200 p-4"><span className="text-sm text-slate-500">Cancelled orders</span><strong className="mt-2 block text-2xl">{cancelled}</strong></div>
          <div className="rounded-md border border-slate-200 p-4"><span className="text-sm text-slate-500">Returns/refunds</span><strong className="mt-2 block text-2xl">{returned}</strong></div>
        </div>
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="rounded-md border border-slate-200 p-4">
            <h2 className="font-bold">City-wise sales</h2>
            <div className="mt-3 grid gap-2">{cityRows.length ? cityRows.map((row) => <div key={row.city} className="flex justify-between rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950"><span>{row.city} · {row.orders} orders</span><strong>{money(row.revenue)}</strong></div>) : <p className="text-sm text-slate-500">No city data yet.</p>}</div>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <h2 className="font-bold">Order status mix</h2>
            <div className="mt-3 grid gap-2">{statusRows.length ? statusRows.map((row) => <div key={row.status} className="flex justify-between rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950"><span>{row.status.replaceAll("_", " ")}</span><strong>{row.count}</strong></div>) : <p className="text-sm text-slate-500">No status data yet.</p>}</div>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <h2 className="font-bold">Payment method mix</h2>
            <div className="mt-3 grid gap-2">{paymentRows.length ? paymentRows.map((row) => <div key={row.method} className="flex justify-between rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950"><span>{row.method.replaceAll("_", " ")}</span><strong>{row.count}</strong></div>) : <p className="text-sm text-slate-500">No payment data yet.</p>}</div>
          </div>
          <div className="rounded-md border border-slate-200 p-4">
            <h2 className="font-bold">Top products</h2>
            <div className="mt-3 grid gap-2">{topProducts.length ? topProducts.map((row) => <div key={row.sku} className="flex justify-between gap-3 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-950"><span><strong>{row.name}</strong><br /><span className="font-mono text-xs text-slate-500">{row.sku} · {row.quantity} sold</span></span><strong>{money(row.revenue)}</strong></div>) : <p className="text-sm text-slate-500">No product data yet.</p>}</div>
          </div>
        </div>
      </AdminResourcePage>
    </AdminShell>
  );
}
