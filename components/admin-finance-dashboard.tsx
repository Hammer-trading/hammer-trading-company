"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  HandCoins,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Search,
  TrendingUp,
  WalletCards
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis
} from "recharts";
import type { AdminFinanceData } from "@/lib/admin-finance";
import { money } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "payments", label: "Payments" },
  { id: "packages", label: "Packages & services" },
  { id: "pipeline", label: "Wholesale & returns" }
] as const;

type TabId = (typeof tabs)[number]["id"];

const chartConfig = {
  gross: { label: "Gross sales", color: "#dc2626" },
  collected: { label: "Collected", color: "#059669" },
  outstanding: { label: "Outstanding", color: "#d97706" },
  amount: { label: "Amount", color: "#2563eb" },
  orderRevenue: { label: "Order revenue", color: "#dc2626" },
  bookingQuotedValue: { label: "Booking pipeline", color: "#d97706" }
} satisfies ChartConfig;

const pieColors = ["#059669", "#d97706", "#dc2626", "#2563eb", "#64748b"];
const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function title(value: string | null | undefined) {
  if (!value) return "Not set";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dateTime(value: string | null | undefined) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function shortDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(parsed);
}

function statusTone(value: string | null | undefined) {
  if (value === "PAID" || value === "DELIVERED" || value === "CONVERTED" || value === "APPROVED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (value === "FAILED" || value === "CANCELLED" || value === "REFUNDED" || value === "REJECTED") {
    return "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-500/10 dark:text-red-300";
  }
  if (value === "PENDING" || value === "REPLIED" || value === "PROCESSING") {
    return "bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/10 dark:text-amber-300";
  }
  return "bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-white/[0.07] dark:text-slate-300";
}

function StatusPill({ value }: { value: string | null | undefined }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusTone(value)}`}>
      {title(value)}
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  hint,
  tone = "slate"
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  tone?: "red" | "green" | "amber" | "blue" | "slate";
}) {
  const tones = {
    red: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-white/[0.07] dark:text-slate-300"
  };
  return (
    <div className="admin-surface min-w-0 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <strong className="mt-3 block truncate text-xl tracking-tight text-slate-950 dark:text-white md:text-2xl">{value}</strong>
        </div>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>{icon}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function SectionCard({
  title: sectionTitle,
  description,
  children,
  className = ""
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`admin-surface overflow-hidden ${className}`}>
      <CardHeader className="border-b border-slate-100 dark:border-white/[0.07]">
        <CardTitle>{sectionTitle}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-5">{children}</CardContent>
    </Card>
  );
}

function EmptyRows({ label }: { label: string }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
      No {label.toLowerCase()} found for this range.
    </div>
  );
}

function currentQuery(data: AdminFinanceData, page?: number) {
  const params = new URLSearchParams();
  params.set("filter", data.range.filter);
  if (data.range.filter === "custom") {
    params.set("from", data.range.from);
    params.set("to", data.range.to);
  }
  if (data.appliedFilters.q) params.set("q", data.appliedFilters.q);
  if (data.appliedFilters.paymentMethod) params.set("paymentMethod", data.appliedFilters.paymentMethod);
  if (data.appliedFilters.paymentStatus) params.set("paymentStatus", data.appliedFilters.paymentStatus);
  if (data.appliedFilters.orderStatus) params.set("orderStatus", data.appliedFilters.orderStatus);
  if (page && page > 1) params.set("page", String(page));
  return params.toString();
}

function OrderLedger({ data }: { data: AdminFinanceData }) {
  if (!data.orders.length) return <EmptyRows label="order payments" />;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-3 py-3">Order</th>
              <th className="px-3 py-3">Customer</th>
              <th className="px-3 py-3">Method</th>
              <th className="px-3 py-3">Payment</th>
              <th className="px-3 py-3 text-right">Total</th>
              <th className="px-3 py-3 text-right">Collected</th>
              <th className="px-3 py-3 text-right">Outstanding</th>
              <th className="px-3 py-3 text-right">Profit</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100 align-top transition-colors hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.03]">
                <td className="px-3 py-4">
                  <Link href="/admin/orders" className="font-mono text-xs font-bold text-red-600 hover:underline dark:text-red-400">
                    {order.orderNumber}
                  </Link>
                  <div className="mt-1"><StatusPill value={order.orderStatus} /></div>
                </td>
                <td className="px-3 py-4">
                  <strong className="block max-w-44 truncate">{order.customerName}</strong>
                  <span className="text-xs text-slate-500">{order.city || "City not set"}</span>
                </td>
                <td className="px-3 py-4">{title(order.paymentMethod)}</td>
                <td className="px-3 py-4"><StatusPill value={order.paymentStatus} /></td>
                <td className="px-3 py-4 text-right font-semibold">{money(order.total)}</td>
                <td className="px-3 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{money(order.paidAmount)}</td>
                <td className="px-3 py-4 text-right font-semibold text-amber-600 dark:text-amber-400">{money(order.outstandingAmount)}</td>
                <td className="px-3 py-4 text-right">{money(order.profit)}</td>
                <td className="px-3 py-4 text-xs text-slate-500">{dateTime(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.pagination.pages > 1 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm dark:border-white/[0.07]">
          <span className="text-slate-500">
            Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} orders
          </span>
          <div className="flex gap-2">
            <Link
              aria-disabled={data.pagination.page <= 1}
              href={`/admin/finance?${currentQuery(data, Math.max(1, data.pagination.page - 1))}`}
              className={`grid size-9 place-items-center rounded-lg border border-slate-200 transition hover:border-red-300 hover:text-red-600 dark:border-slate-800 ${data.pagination.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
              aria-label="Previous finance page"
            >
              <ChevronLeft size={16} />
            </Link>
            <Link
              aria-disabled={data.pagination.page >= data.pagination.pages}
              href={`/admin/finance?${currentQuery(data, Math.min(data.pagination.pages, data.pagination.page + 1))}`}
              className={`grid size-9 place-items-center rounded-lg border border-slate-200 transition hover:border-red-300 hover:text-red-600 dark:border-slate-800 ${data.pagination.page >= data.pagination.pages ? "pointer-events-none opacity-40" : ""}`}
              aria-label="Next finance page"
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AdminFinanceDashboard({
  data,
  notice
}: {
  data: AdminFinanceData;
  notice?: { title: string; message: string };
}) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const trendRows = data.trend.map((row) => ({ ...row, label: shortDate(row.date) }));
  const paymentRows = data.paymentStatuses.map((row, index) => ({
    ...row,
    fill: pieColors[index % pieColors.length]
  }));
  const packageChartRows = data.packages.slice(0, 8).map((entry) => ({
    name: entry.name.length > 16 ? `${entry.name.slice(0, 15)}...` : entry.name,
    orderRevenue: entry.orderRevenue,
    bookingQuotedValue: entry.bookingQuotedValue
  }));
  const exportHref = `/api/admin/finance/export?${currentQuery(data)}`;

  return (
    <section className="space-y-5">
      <header className="admin-page-hero overflow-hidden p-5 md:p-6">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-red-600 dark:text-red-400">
              <CircleDollarSign size={15} />
              Financial control center
            </div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Finance</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Payments, COD exposure, package economics, service quotations, wholesale pipeline, refunds and order-level finance in one live workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              <CalendarDays size={15} />
              {data.range.label}
            </span>
            <a
              href={exportHref}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <Download size={16} />
              Export CSV
            </a>
          </div>
        </div>
      </header>

      {notice ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <div>
            <strong className="text-sm">{notice.title}</strong>
            <p className="mt-1 text-sm leading-6 opacity-80">{notice.message}</p>
          </div>
        </div>
      ) : null}

      <form action="/admin/finance" method="get" className="admin-surface grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <label className="relative min-w-0 lg:col-span-2">
          <span className="sr-only">Search finance records</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            name="q"
            defaultValue={data.appliedFilters.q}
            placeholder="Order, invoice, customer, phone or city"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-500/15 dark:border-slate-800 dark:bg-slate-950"
          />
        </label>
        <select name="filter" defaultValue={data.range.filter} aria-label="Date range" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400 dark:border-slate-800 dark:bg-slate-950">
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="month">This month</option>
          <option value="custom">Custom range</option>
        </select>
        <select name="paymentMethod" defaultValue={data.appliedFilters.paymentMethod || ""} aria-label="Payment method" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400 dark:border-slate-800 dark:bg-slate-950">
          <option value="">All methods</option>
          <option value="COD">Cash on delivery</option>
          <option value="BANK_TRANSFER">Bank transfer</option>
        </select>
        <select name="paymentStatus" defaultValue={data.appliedFilters.paymentStatus || ""} aria-label="Payment status" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400 dark:border-slate-800 dark:bg-slate-950">
          <option value="">All payments</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select name="orderStatus" defaultValue={data.appliedFilters.orderStatus || ""} aria-label="Order status" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-red-400 dark:border-slate-800 dark:bg-slate-950">
          <option value="">All order statuses</option>
          {["PENDING", "CONFIRMED", "PROCESSING", "PACKED", "READY_FOR_DISPATCH", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED", "REFUNDED", "DELIVERY_FAILED", "DISPUTED"].map((value) => (
            <option key={value} value={value}>{title(value)}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={data.range.from} aria-label="From date" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950" />
        <input type="date" name="to" defaultValue={data.range.to} aria-label="To date" className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950" />
        <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:bg-white dark:text-slate-950 dark:hover:bg-red-500 dark:hover:text-white">
          <Search size={16} />
          Apply
        </button>
      </form>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard icon={<TrendingUp size={18} />} label="Gross sales" value={money(data.summary.grossSales)} hint={`${data.summary.orderCount} orders in selected range`} tone="red" />
        <MetricCard icon={<Banknote size={18} />} label="Collected" value={money(data.summary.collected)} hint={`${data.summary.paidOrders} fully paid orders`} tone="green" />
        <MetricCard icon={<WalletCards size={18} />} label="Outstanding" value={money(data.summary.outstanding)} hint={`${data.summary.pendingOrders} payments still pending`} tone="amber" />
        <MetricCard icon={<HandCoins size={18} />} label="Pending COD" value={money(data.summary.pendingCod)} hint="Cash expected from active COD orders" tone="blue" />
        <MetricCard icon={<RotateCcw size={18} />} label="Refunded" value={money(data.summary.refunded)} hint={`${data.summary.refundedOrders} refunded orders`} tone="red" />
        <MetricCard icon={<ReceiptText size={18} />} label="Discounts" value={money(data.summary.discounts)} hint="Coupon and manual discounts" />
        <MetricCard icon={<PackageCheck size={18} />} label="Service charges" value={money(data.summary.serviceCharges)} hint={`${money(data.summary.deliveryCharges)} delivery charges`} tone="blue" />
        <MetricCard icon={<CircleDollarSign size={18} />} label="Estimated profit" value={money(data.summary.estimatedProfit)} hint="Based on saved order margins" tone="green" />
      </div>

      <div role="tablist" aria-label="Finance views" className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-950">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`h-10 shrink-0 rounded-md px-4 text-sm font-bold transition ${activeTab === tab.id ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-white/[0.06] dark:hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
            <SectionCard title="Cash flow trend" description="Gross sales, collected value and outstanding payments by day">
              {trendRows.length ? (
                <ChartContainer config={chartConfig} className="h-[310px] w-full">
                  <AreaChart data={trendRows} margin={{ left: 4, right: 14, top: 12, bottom: 4 }}>
                    <defs>
                      <linearGradient id="financeCollected" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-collected)" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="var(--color-collected)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="4 6" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis axisLine={false} tickLine={false} width={44} tickFormatter={(value) => compactNumber.format(Number(value))} />
                    <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => money(value)} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area type="monotone" dataKey="gross" stroke="var(--color-gross)" fill="transparent" strokeWidth={2.4} isAnimationActive={false} />
                    <Area type="monotone" dataKey="collected" stroke="var(--color-collected)" fill="url(#financeCollected)" strokeWidth={2.6} isAnimationActive={false} />
                    <Area type="monotone" dataKey="outstanding" stroke="var(--color-outstanding)" fill="transparent" strokeWidth={2.2} isAnimationActive={false} />
                  </AreaChart>
                </ChartContainer>
              ) : <EmptyRows label="finance activity" />}
            </SectionCard>
            <SectionCard title="Payment status" description="Value distribution across payment states">
              {paymentRows.length ? (
                <ChartContainer config={chartConfig} className="mx-auto h-[310px] w-full max-w-[390px]">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent hideLabel valueFormatter={(value) => money(value)} />} />
                    <Pie data={paymentRows} dataKey="amount" nameKey="status" innerRadius={66} outerRadius={96} paddingAngle={3} strokeWidth={0} isAnimationActive={false}>
                      {paymentRows.map((entry) => <Cell key={entry.status} fill={entry.fill} />)}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                  </PieChart>
                </ChartContainer>
              ) : <EmptyRows label="payment records" />}
            </SectionCard>
          </div>
          <SectionCard title="Recent payment ledger" description="Order-level totals, collection status, COD exposure and profit">
            <OrderLedger data={data} />
          </SectionCard>
        </>
      ) : null}

      {activeTab === "payments" ? (
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Payment methods" description="Order value by customer payment method">
              {data.paymentMethods.length ? (
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <BarChart data={data.paymentMethods} layout="vertical" margin={{ left: 12, right: 18, top: 8, bottom: 4 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="4 6" />
                    <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={(value) => compactNumber.format(Number(value))} />
                    <YAxis type="category" dataKey="method" width={112} axisLine={false} tickLine={false} />
                    <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => money(value)} />} />
                    <Bar dataKey="amount" fill="var(--color-amount)" radius={[2, 7, 7, 2]} isAnimationActive={false} />
                  </BarChart>
                </ChartContainer>
              ) : <EmptyRows label="payment methods" />}
            </SectionCard>
            <SectionCard title="Revenue composition" description="Product, delivery and service value before discounts">
              <div className="grid gap-3">
                {data.revenueComposition.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/70 p-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{entry.name}</span>
                    <strong className={entry.name === "Discounts" ? "text-red-600 dark:text-red-400" : ""}>{money(entry.amount)}</strong>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Complete order ledger" description="Use the filters above to reconcile a payment method, status, date or customer">
            <OrderLedger data={data} />
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "packages" ? (
        <div className="grid gap-4">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard title="Package performance" description="Order revenue compared with open service booking value">
              {packageChartRows.length ? (
                <ChartContainer config={chartConfig} className="h-[310px] w-full">
                  <BarChart data={packageChartRows} margin={{ left: 8, right: 12, top: 12, bottom: 44 }}>
                    <CartesianGrid vertical={false} strokeDasharray="4 6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} angle={-22} textAnchor="end" interval={0} height={58} />
                    <YAxis axisLine={false} tickLine={false} width={44} tickFormatter={(value) => compactNumber.format(Number(value))} />
                    <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => money(value)} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="orderRevenue" fill="var(--color-orderRevenue)" radius={[6, 6, 2, 2]} isAnimationActive={false} />
                    <Bar dataKey="bookingQuotedValue" fill="var(--color-bookingQuotedValue)" radius={[6, 6, 2, 2]} isAnimationActive={false} />
                  </BarChart>
                </ChartContainer>
              ) : <EmptyRows label="package performance" />}
            </SectionCard>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard icon={<PackageCheck size={18} />} label="Package revenue" value={money(data.summary.packageRevenue)} hint="Revenue from package order lines" tone="red" />
              <MetricCard icon={<WalletCards size={18} />} label="Package pipeline" value={money(data.summary.packageQuotedPipeline)} hint="Quoted package booking value" tone="amber" />
              <MetricCard icon={<HandCoins size={18} />} label="Service quoted" value={money(data.summary.serviceQuotedPipeline)} hint="All service quotations" tone="blue" />
              <MetricCard icon={<Banknote size={18} />} label="Service collected" value={money(data.summary.serviceCollected)} hint="Paid converted service orders" tone="green" />
            </div>
          </div>

          <SectionCard title="Room package finance" description="Pricing, embedded product value, capacity, sales and booking pipeline">
            {data.packages.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-3 py-3">Package</th><th className="px-3 py-3">Service</th><th className="px-3 py-3 text-right">Material value</th><th className="px-3 py-3 text-right">Sell price</th><th className="px-3 py-3 text-right">Discount</th><th className="px-3 py-3 text-right">Buildable</th><th className="px-3 py-3 text-right">Orders</th><th className="px-3 py-3 text-right">Revenue</th><th className="px-3 py-3 text-right">Booking pipeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.packages.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.03]">
                        <td className="px-3 py-4"><strong className="block max-w-56 truncate">{entry.name}</strong><span className="font-mono text-xs text-slate-500">{entry.sku} · {entry.itemCount} products</span></td>
                        <td className="px-3 py-4">{entry.service || "Not linked"}</td>
                        <td className="px-3 py-4 text-right">{money(entry.materialValue)}</td>
                        <td className="px-3 py-4 text-right font-semibold">{money(entry.finalPrice)}</td>
                        <td className="px-3 py-4 text-right text-red-600 dark:text-red-400">{money(entry.fixedDiscount)}</td>
                        <td className="px-3 py-4 text-right">{entry.buildableUnits}</td>
                        <td className="px-3 py-4 text-right">{entry.orderCount}</td>
                        <td className="px-3 py-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{money(entry.orderRevenue)}</td>
                        <td className="px-3 py-4 text-right font-semibold text-amber-600 dark:text-amber-400">{money(entry.bookingQuotedValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyRows label="room packages" />}
          </SectionCard>

          <SectionCard title="Service booking finance" description="Quotation value and converted-order payment status">
            {data.serviceBookings.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-3 py-3">Request</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Service / package</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Materials</th><th className="px-3 py-3 text-right">Service charge</th><th className="px-3 py-3 text-right">Quoted total</th><th className="px-3 py-3">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.serviceBookings.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.03]">
                        <td className="px-3 py-4"><span className="font-mono text-xs font-bold">{entry.requestNumber}</span><span className="mt-1 block text-xs text-slate-500">{dateTime(entry.createdAt)}</span></td>
                        <td className="px-3 py-4"><strong>{entry.customerName}</strong><span className="block text-xs text-slate-500">{entry.city}</span></td>
                        <td className="px-3 py-4"><strong className="block">{entry.service}</strong><span className="text-xs text-slate-500">{entry.packageName || "Custom solution"}</span></td>
                        <td className="px-3 py-4"><StatusPill value={entry.status} /></td>
                        <td className="px-3 py-4 text-right">{money(entry.materialSubtotal)}</td>
                        <td className="px-3 py-4 text-right">{money(entry.serviceCharge)}</td>
                        <td className="px-3 py-4 text-right font-semibold">{money(entry.quotedTotal)}</td>
                        <td className="px-3 py-4"><StatusPill value={entry.paymentStatus} /><span className="mt-1 block font-mono text-xs text-slate-500">{entry.convertedOrderNumber || "Not converted"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyRows label="service bookings" />}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === "pipeline" ? (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard icon={<ReceiptText size={18} />} label="Wholesale quoted" value={money(data.summary.wholesaleQuotedPipeline)} hint={`${data.wholesaleQuotes.length} quote requests`} tone="amber" />
            <MetricCard icon={<Banknote size={18} />} label="Wholesale collected" value={money(data.summary.wholesaleCollected)} hint="Paid converted wholesale orders" tone="green" />
            <MetricCard icon={<RotateCcw size={18} />} label="Open returns" value={String(data.summary.openReturnRequests)} hint="Return or refund cases needing review" tone="red" />
            <MetricCard icon={<CircleDollarSign size={18} />} label="Cancelled value" value={money(data.summary.cancelled)} hint="Orders excluded from recognized sales" />
          </div>
          <SectionCard title="Wholesale quotation pipeline" description="Multi-product quote value, conversion and payment collection">
            {data.wholesaleQuotes.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1040px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      <th className="px-3 py-3">Quote</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Products</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Subtotal</th><th className="px-3 py-3 text-right">Discount</th><th className="px-3 py-3 text-right">Delivery</th><th className="px-3 py-3 text-right">Quoted total</th><th className="px-3 py-3">Converted payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.wholesaleQuotes.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.03]">
                        <td className="px-3 py-4"><span className="font-mono text-xs font-bold">{entry.reference}</span><span className="mt-1 block text-xs text-slate-500">{dateTime(entry.createdAt)}</span></td>
                        <td className="px-3 py-4"><strong>{entry.customerName}</strong><span className="block text-xs text-slate-500">{entry.city}</span></td>
                        <td className="px-3 py-4"><span className="block max-w-48 truncate">{entry.productName}</span><span className="text-xs text-slate-500">{entry.itemCount} lines</span></td>
                        <td className="px-3 py-4"><StatusPill value={entry.status} /></td>
                        <td className="px-3 py-4 text-right">{money(entry.subtotal)}</td>
                        <td className="px-3 py-4 text-right text-red-600 dark:text-red-400">{money(entry.discount)}</td>
                        <td className="px-3 py-4 text-right">{money(entry.delivery)}</td>
                        <td className="px-3 py-4 text-right font-semibold">{money(entry.total)}</td>
                        <td className="px-3 py-4"><StatusPill value={entry.paymentStatus} /><span className="mt-1 block font-mono text-xs text-slate-500">{entry.convertedOrderNumber || "Not converted"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyRows label="wholesale quotes" />}
          </SectionCard>
          <SectionCard title="Return and refund queue" description="Financial risk signals from customer return and refund requests">
            {data.returnRequests.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    <tr className="border-b border-slate-200 dark:border-slate-800"><th className="px-3 py-3">Reference</th><th className="px-3 py-3">Customer</th><th className="px-3 py-3">Request</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Created</th></tr>
                  </thead>
                  <tbody>
                    {data.returnRequests.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-white/[0.03]">
                        <td className="px-3 py-4 font-mono text-xs">{entry.orderId || entry.id.slice(-10).toUpperCase()}</td>
                        <td className="px-3 py-4"><strong>{entry.customerName}</strong><span className="block text-xs text-slate-500">{entry.customerPhone}</span></td>
                        <td className="px-3 py-4">{entry.title}</td>
                        <td className="px-3 py-4"><StatusPill value={entry.status} /></td>
                        <td className="px-3 py-4 text-xs text-slate-500">{dateTime(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyRows label="return requests" />}
          </SectionCard>
        </div>
      ) : null}
    </section>
  );
}
