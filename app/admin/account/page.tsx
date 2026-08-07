import { AdminAccountManager } from "@/components/admin-account-manager";
import { AdminShell } from "@/components/admin-shell";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function AdminAccountPage() {
  return <AdminShell><Suspense fallback={<div className="admin-surface h-64 animate-pulse rounded-lg" />}><AdminAccountManager /></Suspense></AdminShell>;
}
