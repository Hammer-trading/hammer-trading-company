import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { getAuthSettings } from "@/lib/auth-settings";
import { LinkButton } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const settings = await getAuthSettings();
  if (!settings.forgotPasswordEnabled) {
    return <div className="mx-auto max-w-md px-4 py-14"><section className="premium-card rounded-2xl p-6 text-center"><h1 className="text-3xl font-black">Password reset unavailable</h1><p className="mt-3 text-sm text-slate-600">Password reset is currently disabled. Contact support for account assistance.</p><LinkButton href="/contact" className="mt-6">Contact support</LinkButton></section></div>;
  }
  return <ForgotPasswordForm />;
}
