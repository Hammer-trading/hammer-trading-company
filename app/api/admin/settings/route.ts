import { Permission, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeAdminUiLayout, normalizeAdminUiTheme, normalizeStorefrontLayout, normalizeStorefrontTheme } from "@/lib/theme-config";

const allowedKeys = [
  "company_name", "logo", "favicon", "address", "phone", "whatsapp_number", "email", "business_hours", "google_maps_link", "footer_description", "facebook_url", "instagram_url", "youtube_url", "linkedin_url", "currency", "tax_settings", "invoice_prefix", "order_prefix", "low_stock_threshold", "free_delivery_amount", "default_delivery_charges", "return_policy", "privacy_policy", "terms_conditions", "delivery_policy", "warranty_policy", "about_us", "faq", "announcement_bar", "social_links", "payment_methods", "bank_transfer_details", "easypaisa_qr", "jazzcash_qr", "notification_settings", "theme_primary_color", "theme_surface_color", "theme_background_color", "storefront_theme", "storefront_layout", "admin_ui_theme", "admin_ui_layout", "default_theme", "animations_enabled", "maintenance_enabled", "maintenance_message",
  "customer_registration_enabled", "customer_login_enabled", "guest_checkout_enabled", "login_required_for_checkout", "guest_email_required", "customer_email_verification_enabled", "google_customer_login_enabled", "forgot_password_enabled", "customer_account_pages_enabled"
];

export async function GET() {
  const admin = await requirePermission(Permission.SETTINGS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.systemSetting.findMany();
  return NextResponse.json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
}

export async function PATCH(request: Request) {
  const admin = await requirePermission(Permission.SETTINGS_MANAGE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const entries = Object.entries(body)
    .filter(([key]) => allowedKeys.includes(key))
    .map(([key, value]) => [
      key,
      key === "storefront_theme"
        ? normalizeStorefrontTheme(String(value ?? ""))
        : key === "storefront_layout"
          ? normalizeStorefrontLayout(String(value ?? ""))
        : key === "admin_ui_theme"
          ? normalizeAdminUiTheme(String(value ?? ""))
          : key === "admin_ui_layout"
            ? normalizeAdminUiLayout(String(value ?? ""))
          : String(value ?? "")
    ] as const);
  await prisma.$transaction(entries.map(([key, value]) => prisma.systemSetting.upsert({ where: { key }, update: { value: String(value ?? "") }, create: { key, value: String(value ?? "") } })));
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "SETTINGS_UPDATED", entity: "SystemSetting", newValue: Object.fromEntries(entries) as Prisma.InputJsonValue } });
  revalidateTag("system-settings");
  revalidatePath("/", "layout");
  revalidatePath("/api/platform/settings");
  return NextResponse.json({ ok: true });
}
