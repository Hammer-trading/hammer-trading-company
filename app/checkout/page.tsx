import { CheckoutForm } from "@/components/checkout-form";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getAuthSettings } from "@/lib/auth-settings";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [session, settings] = await Promise.all([getSession(), getAuthSettings()]);
  const isCustomer = session?.role === "CUSTOMER";
  if (!isCustomer && (!settings.guestCheckoutEnabled || settings.loginRequiredForCheckout)) {
    redirect("/login?next=/checkout");
  }
  return <CheckoutForm />;
}
