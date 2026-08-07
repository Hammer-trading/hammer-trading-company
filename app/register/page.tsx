import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthSettings } from "@/lib/auth-settings";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const settings = await getAuthSettings();
  if (!settings.customerRegistrationEnabled || !settings.customerLoginEnabled) redirect("/login?disabled=registration");
  return <Suspense fallback={<div className="mx-auto max-w-md px-4 py-14"><Skeleton className="h-[36rem]" /></div>}><RegisterForm googleLoginEnabled={settings.googleCustomerLoginEnabled} /></Suspense>;
}
