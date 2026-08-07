import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="mx-auto max-w-md px-4 py-14"><Skeleton className="h-96" /></div>}><ResetPasswordForm /></Suspense>;
}
