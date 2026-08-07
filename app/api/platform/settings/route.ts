import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

const publicSettingKeys = [
  "company_name",
  "logo",
  "address",
  "phone",
  "whatsapp_number",
  "email",
  "business_hours",
  "google_maps_link",
  "footer_description",
  "facebook_url",
  "instagram_url",
  "youtube_url",
  "linkedin_url",
  "theme_primary_color",
  "theme_surface_color",
  "theme_background_color",
  "storefront_theme",
  "storefront_layout",
  "default_theme",
  "animations_enabled",
  "maintenance_enabled",
  "maintenance_message",
  "announcement_bar",
  "payment_methods",
  "bank_transfer_details"
];

export async function GET() {
  const settings = await getSettings(publicSettingKeys);
  return NextResponse.json({ settings }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
