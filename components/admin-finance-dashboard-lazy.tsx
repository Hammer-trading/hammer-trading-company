"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { AdminFinanceDashboard as AdminFinanceDashboardType } from "@/components/admin-finance-dashboard";

type FinanceDashboardProps = ComponentProps<typeof AdminFinanceDashboardType>;

const LazyFinanceDashboard = dynamic(
  () => import("@/components/admin-finance-dashboard").then((module) => module.AdminFinanceDashboard),
  {
    ssr: false,
    loading: () => <div className="admin-surface h-[32rem] animate-pulse bg-slate-100 dark:bg-slate-900" aria-label="Loading finance dashboard" />
  }
);

export function AdminFinanceDashboardLazy(props: FinanceDashboardProps) {
  return <LazyFinanceDashboard {...props} />;
}
