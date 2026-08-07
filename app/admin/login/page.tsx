import { Suspense } from "react";
import { AdminLoginForm } from "@/components/admin-login-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoginPage() {
  const devFallbackEnabled = process.env.NODE_ENV !== "production" && process.env.ENABLE_DEV_ADMIN_FALLBACK === "true";
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-14"><Skeleton className="h-96" /></div>}>
      <AdminLoginForm devFallbackEnabled={devFallbackEnabled} />
    </Suspense>
  );
}
