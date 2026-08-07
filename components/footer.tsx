import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, ExternalLink, House, Mail, MapPin, MessageCircle, Phone, ShieldCheck, Truck } from "lucide-react";
import type { PublicNavigationItem } from "@/lib/navigation-types";

const shopLinks = [
  ["Products", "/products"], ["Categories", "/categories"], ["Brands", "/brands"],
  ["Room Service", "/home-service"], ["Services", "/services"], ["Packages", "/packages"],
  ["Projects", "/projects"], ["About", "/about"], ["Gallery", "/gallery"], ["Wholesale", "/wholesale"]
];

const helpLinks = [
  ["Track order", "/track"], ["Contact", "/contact"], ["Shipping", "/shipping"],
  ["Returns", "/returns"], ["Wishlist", "/wishlist"]
];

export function Footer({ navigation = [], settings = {} }: { navigation?: PublicNavigationItem[]; settings?: Record<string, string> }) {
  const managedShop = navigation.filter((item) => item.location === "FOOTER_SHOP" && item.desktopVisible).map((item) => [item.label, item.href]);
  const managedHelp = navigation.filter((item) => item.location === "FOOTER_HELP" && item.desktopVisible).map((item) => [item.label, item.href]);
  const visibleShopLinks = managedShop.length ? managedShop : shopLinks;
  const visibleHelpLinks = managedHelp.length ? managedHelp : helpLinks;
  const companyName = settings.company_name || "Hammer Trading Company";
  const logoUrl = settings.logo || "/brand/htc-logo.png";
  const phone = settings.phone?.trim();
  const whatsapp = settings.whatsapp_number?.replace(/\D/g, "");
  const email = settings.email?.trim();
  const socialLinks = [
    ["Facebook", settings.facebook_url], ["Instagram", settings.instagram_url],
    ["YouTube", settings.youtube_url], ["LinkedIn", settings.linkedin_url]
  ].filter((item): item is [string, string] => Boolean(item[1]?.startsWith("https://")));

  return (
    <footer className="store-footer relative z-10 overflow-hidden bg-[#171c20] text-white">
      <div className="border-y border-white/10 bg-white/[0.035]">
        <div className="mx-auto grid max-w-[92rem] divide-y divide-white/10 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8 xl:px-10">
          {[
            [Truck, "Nationwide delivery", "Clear dispatch and tracking updates"],
            [ShieldCheck, "Verified handover", "QR and OTP delivery confirmation"],
            [MessageCircle, "Private support", "Direct account chat with HTC"]
          ].map(([Icon, title, body]) => {
            const FeatureIcon = Icon as typeof Truck;
            return (
              <div key={title as string} className="flex min-h-24 items-center gap-4 px-2 py-5 sm:px-5">
                <FeatureIcon size={21} className="shrink-0 text-red-400" aria-hidden="true" />
                <div><strong className="block text-xs font-black uppercase">{title as string}</strong><span className="mt-1 block text-xs leading-5 text-slate-400">{body as string}</span></div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto grid max-w-[92rem] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.25fr_0.75fr_0.75fr_1.15fr] lg:px-8 lg:py-16 xl:px-10">
        <div>
          <Link href="/" className="relative block h-20 w-56 rounded-lg outline-none transition-transform duration-200 hover:translate-x-1 focus-visible:ring-2 focus-visible:ring-red-500" aria-label="Hammer Trading Company home">
            <Image src={logoUrl} alt={companyName} fill unoptimized={!logoUrl.startsWith("/")} className="object-contain object-left drop-shadow-[0_10px_18px_rgba(0,0,0,0.3)]" sizes="224px" />
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">{settings.footer_description || "Professional hardware, exact product variants, complete room packages, installation services, and verified delivery support."}</p>
          <Link href="/products" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-5 text-xs font-black uppercase text-white transition duration-200 hover:-translate-y-0.5 hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-white">
            Shop the catalogue <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase text-white">Shop</h2>
          <div className="mt-5 grid gap-1 text-sm text-slate-400">{visibleShopLinks.map(([label, href]) => <FooterLink key={href} href={href} label={label} />)}</div>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase text-white">Support</h2>
          <div className="mt-5 grid gap-1 text-sm text-slate-400">{visibleHelpLinks.map(([label, href]) => <FooterLink key={href} href={href} label={label} />)}</div>
        </div>

        <div>
          <h2 className="text-xs font-black uppercase text-white">Contact HTC</h2>
          <div className="mt-5 grid gap-1 text-sm text-slate-400">
            {settings.address ? <p className="flex items-start gap-3 py-2"><MapPin size={16} className="mt-0.5 shrink-0 text-red-400" /> {settings.address}</p> : null}
            {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="footer-contact-link"><Phone size={16} /> {phone}</a> : null}
            {email ? <a href={`mailto:${email}`} className="footer-contact-link"><Mail size={16} /> {email}</a> : null}
            {settings.business_hours ? <p className="flex items-start gap-3 py-2"><Clock3 size={16} className="mt-0.5 shrink-0 text-red-400" /> {settings.business_hours}</p> : null}
            {whatsapp ? <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="footer-contact-link"><MessageCircle size={16} /> WhatsApp support</a> : null}
            <Link href="/account/messages" className="footer-contact-link"><MessageCircle size={16} /> Customer messages</Link>
            <Link href="/home-service" className="footer-contact-link"><House size={16} /> Room installation service</Link>
            {socialLinks.length ? <div className="mt-3 flex flex-wrap gap-2">{socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-white/[0.06] px-3 text-[10px] font-bold text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-white">{label}<ExternalLink size={11} /></a>)}</div> : null}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-[10px] font-bold uppercase text-slate-500">
        &copy; {new Date().getFullYear()} {companyName}. Home Solution Provider.
      </div>
    </footer>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group inline-flex min-h-9 items-center gap-2 rounded-sm py-1 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-red-500">
      <ArrowRight size={13} className="text-red-400 opacity-50 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
