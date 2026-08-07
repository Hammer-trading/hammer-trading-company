import { redirect } from "next/navigation";
import { ReturnRequestManager } from "@/components/return-request-manager";
import { getSession } from "@/lib/auth";
import { getSettings, settingValue } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ReturnsPage() {
  const [session, settings] = await Promise.all([
    getSession(),
    getSettings(["return_policy", "privacy_policy", "terms_conditions"])
  ]);
  if (!session || session.role !== "CUSTOMER") redirect("/login?next=/returns");

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Customer support</p>
      <h1 className="mt-2 text-4xl font-black">Returns and disputes</h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
        {settingValue(settings, "return_policy", "Delivered orders can be submitted for review within 14 days. Approval and refund decisions are recorded in the order and support timeline.")}
      </p>
      <ReturnRequestManager />
      <section className="mt-10 grid gap-5 border-t border-slate-200 pt-8 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:text-slate-300 md:grid-cols-2">
        <div><h2 className="text-lg font-black text-slate-950 dark:text-white">Terms</h2><p className="mt-2">{settingValue(settings, "terms_conditions", "Orders are subject to stock availability and delivery confirmation.")}</p></div>
        <div><h2 className="text-lg font-black text-slate-950 dark:text-white">Privacy</h2><p className="mt-2">{settingValue(settings, "privacy_policy", "Customer data is used only for order processing and support.")}</p></div>
      </section>
    </main>
  );
}
