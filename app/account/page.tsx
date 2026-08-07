import { LinkButton } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Heart, MapPin, MessageSquare, PackageSearch, RotateCcw } from "lucide-react";
import { getAuthSettings } from "@/lib/auth-settings";
import { adminRoles } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const accountTiles = [
  { href: "/account/messages", label: "Messages / Chat with Admin", body: "Private customer support thread", Icon: MessageSquare, featured: true },
  { href: "/track", label: "Track orders", body: "Check order and delivery status", Icon: PackageSearch },
  { href: "/wishlist", label: "Wishlist", body: "Save products for later", Icon: Heart },
  { href: "/returns", label: "Returns", body: "Return and support policy", Icon: RotateCcw },
  { href: "/shipping", label: "Shipping", body: "Delivery rules and estimates", Icon: MapPin }
];

export default async function AccountPage() {
  const [session, settings] = await Promise.all([getSession(), getAuthSettings()]);
  const isAdmin = Boolean(session && adminRoles.includes(session.role));

  if (!settings.customerAccountPagesEnabled) {
    return <div className="mx-auto max-w-2xl px-4 py-16"><section className="showroom-panel p-8 text-center"><h1 className="text-3xl font-black">Customer account is unavailable</h1><p className="mt-3 text-slate-600">Account pages are currently disabled. Shopping and guest checkout availability are controlled separately.</p><LinkButton href="/products" className="mt-6">Continue shopping</LinkButton></section></div>;
  }

  return (
    <div className={`mx-auto grid max-w-7xl gap-6 px-4 py-10 ${isAdmin ? "lg:grid-cols-3" : ""}`}>
      <section className={`premium-card overflow-hidden rounded-2xl ${isAdmin ? "lg:col-span-2" : ""}`}>
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 p-6 text-white">
          <p className="text-sm font-bold uppercase text-white/70">Customer portal</p>
          <h1 className="mt-2 text-3xl font-black">Customer account</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Manage support messages, tracking, saved products, shipping help, and return support from one clean customer area.</p>
        </div>
        <div className="p-5">
        {session ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <span>Signed in as <strong>{session.name}</strong> ({session.email})</span>
            <LogoutButton
              redirectTo="/login"
              showError
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 font-bold text-slate-800 transition hover:border-red-300 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30"
            />
          </div>
        ) : (
          <div className="mb-5 flex flex-wrap gap-2">
            <a href="/api/auth/google?flow=login&next=/account" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:border-red-200">
              Continue with Google
            </a>
            <Link href="/login?next=/account" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5">
              Sign in
            </Link>
          </div>
        )}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {accountTiles.map(({ href, label, body, Icon, featured }) => (
            <Link key={label} href={href} className={`group rounded-xl border p-4 font-semibold shadow-sm transition hover:-translate-y-0.5 ${featured ? "border-red-200 bg-red-50 text-red-800 hover:bg-white" : "border-slate-200 bg-white/75 text-slate-900 hover:border-red-200"}`}>
              <Icon className={`mb-3 ${featured ? "text-red-700" : "text-slate-500 group-hover:text-red-700"}`} size={22} />
              {label}
              <span className={`mt-2 block text-sm font-normal ${featured ? "text-red-700" : "text-slate-500"}`}>{body}</span>
            </Link>
          ))}
        </div>
        </div>
      </section>
      {isAdmin ? (
        <aside className="premium-card h-fit rounded-2xl p-5">
          <h2 className="text-xl font-bold">Admin access</h2>
          <p className="mt-2 text-sm text-slate-600">Your verified staff session has permission to open the management workspace.</p>
          <LinkButton href="/admin" className="mt-4 w-full">Open admin panel</LinkButton>
        </aside>
      ) : null}
    </div>
  );
}
