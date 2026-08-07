import { getSettings, settingValue } from "@/lib/settings";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function ShippingPage() {
  const settings = await getSettings(["default_delivery_charges", "free_delivery_amount", "whatsapp_number", "address"]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-black">Shipping and delivery</h1>
      <div className="premium-card mt-5 rounded-2xl p-6 leading-7 text-slate-700">
        <p>Delivery charges are configured by admin using city, area, weight, heavy-item, same-day, pickup, and free-delivery rules. Charges are not hardcoded in business data.</p>
        <p className="mt-3"><strong>Default delivery:</strong> {settingValue(settings, "default_delivery_charges", "250")} PKR</p>
        <p><strong>Free delivery threshold:</strong> {settingValue(settings, "free_delivery_amount", "25000")} PKR</p>
        <p><strong>Support WhatsApp:</strong> {settingValue(settings, "whatsapp_number", "Not configured")}</p>
      </div>
    </div>
  );
}
