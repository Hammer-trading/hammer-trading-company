"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis
} from "recharts";
import type { AdminDashboardData } from "@/lib/admin-dashboard";
import { money } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1
});

const chartColors = {
  sales: "#dc2626",
  revenue: "#ea580c",
  orders: "#0f172a",
  category: "#059669",
  product: "#2563eb",
  stock: "#7c3aed"
};

const commonChartConfig = {
  sales: { label: "Sales", color: chartColors.sales },
  revenue: { label: "Revenue", color: chartColors.revenue },
  orders: { label: "Orders", color: chartColors.orders },
  quantity: { label: "Quantity", color: chartColors.product },
  count: { label: "Count", color: chartColors.stock }
} satisfies ChartConfig;

const statusColors = ["#ea580c", "#0f172a", "#059669", "#2563eb", "#7c3aed", "#dc2626", "#ca8a04"];

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function toTitle(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortLabel(value: string, maxLength = 14) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function ChartCard({
  title,
  description,
  children,
  empty = false
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <Card className="admin-surface admin-card-3d group overflow-hidden">
      <CardHeader className="border-b border-slate-100 pb-4 dark:border-white/[0.07]">
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{title}</span>
          <span className="size-2 rounded-full bg-red-600" />
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="grid h-[260px] place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/70 text-center text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950/55 dark:text-slate-400">
            No records for this range
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

export function AdminDashboardCharts({ data }: { data: AdminDashboardData }) {
  const dailyRows = useMemo(
    () =>
      data.salesChart.slice(-14).map((row) => ({
        ...row,
        dateLabel: formatDateLabel(row.date),
        sales: Math.round(row.sales),
        orders: row.orders
      })),
    [data.salesChart]
  );

  const revenueRows = useMemo(
    () =>
      data.revenueChart.slice(-14).map((row) => ({
        dateLabel: formatDateLabel(row.date),
        revenue: Math.round(row.sales)
      })),
    [data.revenueChart]
  );

  const categoryRows = useMemo(
    () =>
      data.categoryPerformance.map((row) => ({
        ...row,
        shortName: shortLabel(row.name, 12),
        revenue: Math.round(row.revenue),
        quantity: row.quantity
      })),
    [data.categoryPerformance]
  );

  const productRows = useMemo(
    () =>
      data.bestSellers.slice(0, 6).map((row) => ({
        ...row,
        shortName: shortLabel(row.name, 16),
        quantity: row.quantity,
        revenue: Math.round(row.revenue)
      })),
    [data.bestSellers]
  );

  const statusRows = useMemo(
    () =>
      Object.entries(data.statusCounts)
        .filter(([, count]) => count > 0)
        .map(([name, count], index) => ({
          name: toTitle(name),
          count,
          fill: statusColors[index % statusColors.length]
        })),
    [data.statusCounts]
  );

  const stockRows = useMemo(
    () =>
      data.stockChart.map((row, index) => ({
        ...row,
        fill: statusColors[(index + 3) % statusColors.length]
      })),
    [data.stockChart]
  );

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <ChartCard title="Sales overview" description="Daily sales with order volume" empty={dailyRows.length === 0}>
        <ChartContainer config={commonChartConfig} className="h-[280px] w-full">
          <LineChart data={dailyRows} margin={{ left: 8, right: 16, top: 12, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 6" />
            <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tickMargin={10} />
            <YAxis yAxisId="sales" axisLine={false} tickLine={false} tickFormatter={(value) => compactNumber.format(Number(value))} width={42} />
            <YAxis yAxisId="orders" orientation="right" axisLine={false} tickLine={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent valueFormatter={(value, name) => (name === "orders" ? value : money(value))} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line yAxisId="sales" type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={3} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
            <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="var(--color-orders)" strokeWidth={2.4} dot={false} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Revenue trend" description="Selected range revenue flow" empty={revenueRows.length === 0}>
        <ChartContainer config={commonChartConfig} className="h-[280px] w-full">
          <AreaChart data={revenueRows} margin={{ left: 8, right: 16, top: 12, bottom: 4 }}>
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.32} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="4 6" />
            <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tickMargin={10} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => compactNumber.format(Number(value))} width={42} />
            <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => money(value)} />} />
            <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={3} fill="url(#revenueFill)" isAnimationActive={false} />
          </AreaChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Orders by day" description="Order count for the latest active days" empty={dailyRows.length === 0}>
        <ChartContainer config={commonChartConfig} className="h-[280px] w-full">
          <BarChart data={dailyRows} margin={{ left: 8, right: 16, top: 12, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 6" />
            <XAxis dataKey="dateLabel" axisLine={false} tickLine={false} tickMargin={10} />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent valueFormatter={(value) => value} />} />
            <Bar dataKey="orders" fill="var(--color-orders)" radius={[7, 7, 2, 2]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Category performance" description="Revenue by product category" empty={categoryRows.length === 0}>
        <ChartContainer config={commonChartConfig} className="h-[300px] w-full">
          <BarChart data={categoryRows} margin={{ left: 8, right: 16, top: 12, bottom: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="4 6" />
            <XAxis dataKey="shortName" axisLine={false} tickLine={false} tickMargin={10} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => compactNumber.format(Number(value))} width={42} />
            <ChartTooltip content={<ChartTooltipContent valueFormatter={(value, name) => (name === "quantity" ? value : money(value))} />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="revenue" fill="var(--color-category)" radius={[7, 7, 2, 2]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard title="Top-selling products" description="Best sellers by units sold" empty={productRows.length === 0}>
        <ChartContainer config={commonChartConfig} className="h-[320px] w-full">
          <BarChart data={productRows} layout="vertical" margin={{ left: 12, right: 24, top: 12, bottom: 4 }}>
            <CartesianGrid horizontal={false} strokeDasharray="4 6" />
            <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis dataKey="shortName" type="category" axisLine={false} tickLine={false} width={104} />
            <ChartTooltip content={<ChartTooltipContent valueFormatter={(value, name) => (name === "quantity" ? `${value} sold` : money(value))} />} />
            <Bar dataKey="quantity" fill="var(--color-quantity)" radius={[2, 7, 7, 2]} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
        <ChartCard title="Order status" description="Live distribution for the selected range" empty={statusRows.length === 0}>
          <ChartContainer config={commonChartConfig} className="mx-auto h-[250px] w-full max-w-[360px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel valueFormatter={(value) => value} />} />
              <Pie data={statusRows} dataKey="count" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3} strokeWidth={0} isAnimationActive={false}>
                {statusRows.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        </ChartCard>

        <ChartCard title="Stock health" description="Low, out, and healthy stock split" empty={stockRows.length === 0}>
          <ChartContainer config={commonChartConfig} className="mx-auto h-[250px] w-full max-w-[360px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel valueFormatter={(value) => value} />} />
              <Pie data={stockRows} dataKey="count" nameKey="name" innerRadius={54} outerRadius={84} paddingAngle={3} strokeWidth={0} isAnimationActive={false}>
                {stockRows.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        </ChartCard>
      </div>
    </section>
  );
}
