import { Clock3, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { getSettings, settingValue } from "@/lib/settings";

export const revalidate = 300;
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getSettings(["company_name", "address", "phone", "whatsapp_number", "email", "business_hours", "google_maps_link"]);
  const company = settingValue(settings, "company_name", "Hammer Trading Company");
  const whatsapp = settings.whatsapp_number?.replace(/\D/g, "");
  return <main className="pb-16 pt-28">
    <header className="mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-10"><p className="showroom-eyebrow text-red-700">Direct support</p><h1 className="mt-2 font-display text-6xl font-black uppercase leading-none sm:text-7xl">Contact {company}</h1><p className="mt-4 max-w-2xl text-slate-600">Product, delivery, wholesale and home-service requests are saved directly in the admin support workspace.</p></header>
    <section className="mx-auto grid max-w-[90rem] gap-6 px-4 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-10">
      <div className="showroom-panel p-5 sm:p-7"><h2 className="text-2xl font-black">Contact details</h2><div className="mt-5 grid gap-3 text-sm">
        {settings.address ? <p className="flex items-start gap-3"><MapPin className="mt-0.5 shrink-0 text-red-700" size={18} />{settings.address}</p> : null}
        {settings.phone ? <a href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-3 hover:text-red-700"><Phone className="text-red-700" size={18} />{settings.phone}</a> : null}
        {settings.email ? <a href={`mailto:${settings.email}`} className="flex items-center gap-3 hover:text-red-700"><Mail className="text-red-700" size={18} />{settings.email}</a> : null}
        {settings.business_hours ? <p className="flex items-start gap-3"><Clock3 className="mt-0.5 shrink-0 text-red-700" size={18} />{settings.business_hours}</p> : null}
        {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-red-700"><MessageCircle className="text-red-700" size={18} />WhatsApp support</a> : null}
        {settings.google_maps_link?.startsWith("https://") ? <a href={settings.google_maps_link} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 px-4 font-black transition hover:border-red-300 hover:text-red-700">Open map</a> : null}
      </div></div>
      <div className="showroom-panel p-5 sm:p-7"><h2 className="text-2xl font-black">Send a request</h2><p className="mt-2 text-sm text-slate-500">For private account chat and history, sign in and use Customer Messages.</p><div className="mt-5"><ContactForm /></div></div>
    </section>
  </main>;
}
