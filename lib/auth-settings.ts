import { getSettings } from "@/lib/settings";

export const authSettingKeys = [
  "customer_registration_enabled",
  "customer_login_enabled",
  "guest_checkout_enabled",
  "login_required_for_checkout",
  "guest_email_required",
  "customer_email_verification_enabled",
  "google_customer_login_enabled",
  "forgot_password_enabled",
  "customer_account_pages_enabled"
] as const;

export type AuthSettings = {
  customerRegistrationEnabled: boolean;
  customerLoginEnabled: boolean;
  guestCheckoutEnabled: boolean;
  loginRequiredForCheckout: boolean;
  guestEmailRequired: boolean;
  customerEmailVerificationEnabled: boolean;
  googleCustomerLoginEnabled: boolean;
  forgotPasswordEnabled: boolean;
  customerAccountPagesEnabled: boolean;
};

function enabled(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value === "true";
}

export async function getAuthSettings(): Promise<AuthSettings> {
  const values = await getSettings([...authSettingKeys]);
  return {
    customerRegistrationEnabled: enabled(values.customer_registration_enabled, true),
    customerLoginEnabled: enabled(values.customer_login_enabled, true),
    guestCheckoutEnabled: enabled(values.guest_checkout_enabled, true),
    loginRequiredForCheckout: enabled(values.login_required_for_checkout, false),
    guestEmailRequired: enabled(values.guest_email_required, false),
    customerEmailVerificationEnabled: enabled(values.customer_email_verification_enabled, false),
    googleCustomerLoginEnabled: enabled(values.google_customer_login_enabled, true),
    forgotPasswordEnabled: enabled(values.forgot_password_enabled, true),
    customerAccountPagesEnabled: enabled(values.customer_account_pages_enabled, true)
  };
}
