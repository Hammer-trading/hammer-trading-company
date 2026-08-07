import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthSettings } from "@/lib/auth-settings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getAuthSettings();
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-14"><Skeleton className="h-80" /></div>}>
      <LoginForm customerLoginEnabled={settings.customerLoginEnabled} googleLoginEnabled={settings.googleCustomerLoginEnabled} registrationEnabled={settings.customerRegistrationEnabled} />
    </Suspense>
  );
}
