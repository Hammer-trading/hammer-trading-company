"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Boxes, ClipboardList, DollarSign, MessageSquare, PackageX, RotateCcw, ShoppingBag, Truck, Users, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import type { AdminDashboardData, DateFilterKey } from "@/lib/admin-dashboard";
import { money } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { AnimatedMoney, AnimatedValue } from "@/components/animated-value";

type DashboardViewProps = {
  data: AdminDashboardData;
  filter: DateFilterKey;
  from: string;
  to: string;
  notice?: {
    title: string;
    message: string;
  };
};

const AdminDashboardCharts = dynamic(
  () => import("@/components/admin-dashboard-charts").then((mod) => mod.AdminDashboardCharts),
  {
    ssr: false,
    loading: () => (
      <section className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="admin-surface p-5">
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-2 h-4 w-56 rounded bg-slate-100 dark:bg-slate-950" />
            <div className="mt-6 h-[260px] rounded-xl bg-slate-100 dark:bg-slate-950" />
          </div>
        ))}
      </section>
    )
  }
);

const adminQuickActions = [
  { icon: ClipboardList, label: "Process orders", href: "/admin/orders", primary: true },
  { icon: Boxes, label: "Manage products", href: "/admin/products" },
  { icon: MessageSquare, label: "Reply messages", href: "/admin/messages" },
  { icon: Truck, label: "Delivery desk", href: "/admin/delivery" }
];

function pakistanDateTime(value: string) {
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi"
  }).format(new Date(value));
}

function MetricCard({ label, value, hint, icon: Icon, currency = false, tone = "up" }: { label: string; value: number; hint: string; icon: typeof DollarSign; currency?: boolean; tone?: "up" | "down" }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} className="admin-surface admin-card-3d group p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <strong className="mt-3 block text-2xl tracking-tight">{currency ? <AnimatedMoney value={value} /> : <AnimatedValue value={value} />}</strong>
        </div>
        <span className={`grid size-10 place-items-center rounded-md transition group-hover:scale-105 ${tone === "down" ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300" : "bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300"}`}><Icon size={19} /></span>
      </div>
      <p className="mt-4 flex items-center gap-1 text-sm text-slate-500">
        {tone === "up" ? <ArrowUpRight size={16} className="text-emerald-600" /> : <ArrowDownRight size={16} className="text-red-600" />}
        {hint}
      </p>
    </motion.div>
  );
}

function InsightList({
  title,
  rows,
  empty,
  render
}: {
  title: string;
  rows: unknown[];
  empty: string;
  render: (row: unknown) => ReactNode;
}) {
  return (
    <div className="admin-surface p-5">
      <h2 className="text-sm font-extrabold tracking-tight">{title}</h2>
      <div className="mt-4 grid gap-3">
        {rows.length ? rows.map((row, index) => <div key={index}>{render(row)}</div>) : <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">{empty}</p>}
      </div>
    </div>
  );
}

export function AdminDashboardView({ data, filter, from, to, notice }: DashboardViewProps) {
  const filters = [
    ["today", "Today"],
    ["yesterday", "Yesterday"],
    ["7d", "Last 7 days"],
    ["30d", "Last 30 days"],
    ["month", "This month"]
  ] as const;

  return (
    <div className="space-y-6">
      <section className="admin-hero overflow-hidden text-white">
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center md:p-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-red-300">Live business overview</p>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight md:text-2xl">Sales, orders, stock and customer activity</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Review the current operating picture and move directly to the work that needs attention.</p>
          </div>
          <div className="grid min-w-56 grid-cols-2 gap-5 border-l border-white/10 px-5 py-1 max-md:border-l-0 max-md:border-t max-md:px-0 max-md:pt-4">
            <div>
              <p className="text-xs text-slate-400">Range sales</p>
              <strong className="text-lg">{money(data.totals.sales)}</strong>
            </div>
            <div>
              <p className="text-xs text-slate-400">Range orders</p>
              <strong className="text-lg">{data.totals.scopedOrders}</strong>
            </div>
          </div>
        </div>
      </section>

      {notice ? (
        <section className="rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-amber-950 shadow-lg shadow-amber-950/5 backdrop-blur dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          <h2 className="font-black">{notice.title}</h2>
          <p className="mt-1 text-sm leading-6">{notice.message}</p>
        </section>
      ) : null}

      <section className="admin-surface grid overflow-hidden md:grid-cols-2 xl:grid-cols-4">
        {adminQuickActions.map(({ icon: Icon, label, href, primary }) => (
          <Link key={href} href={href} className="group flex min-h-20 items-center justify-between gap-4 border-b border-slate-200 p-4 transition duration-200 hover:bg-slate-50 md:border-r xl:border-b-0 dark:border-white/[0.08] dark:hover:bg-white/[0.035]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Quick action</p>
              <h2 className="mt-1.5 text-sm font-extrabold">{label}</h2>
            </div>
            <span className={`grid size-10 shrink-0 place-items-center rounded-md transition duration-200 group-hover:scale-105 ${primary ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300"}`}>
              <Icon size={19} />
            </span>
          </Link>
        ))}
      </section>

      <section className="admin-surface p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map(([key, label]) => (
            <a key={key} href={`/admin?filter=${key}`} className={`rounded-md px-3 py-2 text-xs font-bold transition ${filter === key ? "bg-red-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.06]"}`}>{label}</a>
          ))}
          <form className="ml-auto flex flex-wrap gap-2" action="/admin">
            <input type="hidden" name="filter" value="custom" />
            <input name="from" type="date" defaultValue={from} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <input name="to" type="date" defaultValue={to} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
            <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-700 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200">Apply</button>
          </form>
        </div>
      </section>

      <motion.section initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.045 } } }} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={DollarSign} label="Total sales" value={data.totals.sales} hint="All-time revenue" currency />
        <MetricCard icon={WalletCards} label="Today's sales" value={data.totals.todaySales} hint="Since midnight" currency />
        <MetricCard icon={ShoppingBag} label="Monthly sales" value={data.totals.monthlySales} hint="Current month" currency />
        <MetricCard icon={ClipboardList} label="Today's orders" value={data.totals.todayOrders} hint="Created today" />
        <MetricCard icon={ClipboardList} label="Total orders" value={data.totals.orders} hint={`${data.totals.scopedOrders} in selected range`} />
        <MetricCard icon={ClipboardList} label="Pending orders" value={data.totals.pendingOrders} hint="Needs admin action" tone="down" />
        <MetricCard icon={Users} label="Customers" value={data.totals.customers} hint="Registered customer accounts" />
        <MetricCard icon={Boxes} label="Products" value={data.totals.products} hint="Catalog SKUs" />
        <MetricCard icon={PackageX} label="Low stock" value={data.totals.lowStockProducts} hint="Needs inventory action" tone="down" />
        <MetricCard icon={PackageX} label="Out of stock" value={data.totals.outOfStockProducts} hint="Unavailable SKUs" tone="down" />
        <MetricCard icon={MessageSquare} label="Customer messages" value={data.totals.customerMessages} hint="Unread support inbox" tone={data.totals.customerMessages ? "down" : "up"} />
        <MetricCard icon={RotateCcw} label="Returns" value={data.totals.returnRequests} hint="Open return/refund cases" tone="down" />
        <MetricCard icon={ShoppingBag} label="Abandoned carts" value={data.totals.abandonedCarts} hint="Recovery candidates" tone="down" />
        <MetricCard icon={Truck} label="Delivery charges" value={data.totals.deliveryCharges} hint="Selected range" currency />
        <MetricCard icon={DollarSign} label="Discounts" value={data.totals.discounts} hint="Selected range" currency tone="down" />
        <MetricCard icon={WalletCards} label="Estimated profit" value={data.totals.estimatedProfit} hint="Selected range" currency />
      </motion.section>

      <AdminDashboardCharts data={data} />

      <section className="grid gap-4 xl:grid-cols-2">
        <InsightList
          title="Smart pricing suggestions"
          rows={[
            ...data.discountSuggestions.map((item) => ({ ...item, action: "Add discount" })),
            ...data.featureSuggestions.map((item) => ({ ...item, action: "Feature on homepage" }))
          ].slice(0, 8)}
          empty="No pricing suggestions right now."
          render={(row) => {
            const item = row as { name: string; sku: string; stock: number; sold: number; action: string };
            return <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><div><strong>{item.name}</strong><p className="text-xs text-slate-500">{item.sku} - Stock {item.stock} - Sold {item.sold}</p></div><span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800">{item.action}</span></div>;
          }}
        />
        <InsightList
          title="Low stock products"
          rows={data.lowStockList}
          empty="No low stock products."
          render={(row) => {
            const item = row as { name: string; sku: string; stock: number; lowStockThreshold: number };
            return <a href={`/admin/products?q=${encodeURIComponent(item.sku)}`} className="flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-red-950 transition hover:bg-red-100 dark:bg-red-950/30 dark:text-red-100"><div><strong>{item.name}</strong><p className="text-xs opacity-75">{item.sku} - threshold {item.lowStockThreshold}</p></div><span className="rounded-full bg-red-700 px-3 py-1 text-xs font-black text-white">{item.stock} left</span></a>;
          }}
        />
        <InsightList
          title="Slow-moving products"
          rows={data.slowMovingProducts}
          empty="No slow-moving products detected."
          render={(row) => {
            const item = row as { name: string; sku: string; stock: number; sold: number };
            return <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950"><div><strong>{item.name}</strong><p className="text-xs text-slate-500">{item.sku}</p></div><span className="text-sm font-bold">{item.sold} sold / {item.stock} stock</span></div>;
          }}
        />
        <InsightList
          title="Abandoned carts"
          rows={data.abandonedCartList}
          empty="No abandoned carts tracked yet."
          render={(row) => {
            const item = row as { id: string; customerName: string; itemCount: number; subtotal: number; updatedAt: string };
            return <a href="/admin/abandoned-carts" className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 transition hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800"><div><strong>{item.customerName}</strong><p className="text-xs text-slate-500">{item.itemCount} items - {pakistanDateTime(item.updatedAt)}</p></div><strong>{money(item.subtotal)}</strong></a>;
          }}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="admin-surface min-w-0 p-5">
          <h2 className="font-bold">Recent orders</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><th className="py-3">Order</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                {data.recentOrders.length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-slate-500">No orders found for this range.</td></tr> : data.recentOrders.map((order) => (
                  <tr key={order.orderNumber} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-3 font-mono">{order.orderNumber}</td>
                    <td>{order.customerName}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td className="font-bold">{money(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="admin-surface min-w-0 p-5">
          <h2 className="font-bold">Best-selling products</h2>
          <div className="mt-4 grid gap-3">
            {data.bestSellers.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No sold products yet.</p> : data.bestSellers.map((item) => (
              <div key={item.productId} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                <div><strong>{item.name}</strong><p className="text-xs text-slate-500">{item.sku} - {item.quantity} sold</p></div>
                <strong>{money(item.revenue)}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
