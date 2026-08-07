import { WholesaleForm } from "@/components/wholesale-form";
import { getSettings, settingValue } from "@/lib/settings";
import { getWholesaleCatalog } from "@/lib/wholesale";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function WholesalePage() {
  const [settings, catalog] = await Promise.all([
    getSettings(["whatsapp_number", "email"]),
    getWholesaleCatalog()
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-red-600">Hammer Trade Desk</p>
        <h1 className="mt-3 text-4xl font-black leading-tight text-slate-950 dark:text-white sm:text-5xl">
          Multi-product wholesale quotation
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Build one request with exact products, sizes, colors and quantities. Our team will confirm line pricing, delivery and quotation validity.
        </p>
        <p className="mt-4 text-sm font-semibold text-slate-500">
          WhatsApp: {settingValue(settings, "whatsapp_number", "Not configured")} <span aria-hidden="true">/</span> Email: {settingValue(settings, "email", "Not configured")}
        </p>
      </header>
      <WholesaleForm catalog={catalog} />
    </main>
  );
}
