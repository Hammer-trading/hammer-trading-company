"use client";

import Link from "next/link";
import { Home, Menu, Search, ShoppingBag, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/products", label: "Browse", Icon: Menu },
  { href: "#search", label: "Search", Icon: Search },
  { href: "/cart", label: "Cart", Icon: ShoppingBag },
  { href: "/account", label: "Account", Icon: UserRound }
];

export function MobileStoreNav() {
  const pathname = usePathname();
  const cart = useCart();
  const distractionFreeRoute = [
    "/admin",
    "/buy-now",
    "/checkout",
    "/confirm-delivery",
    "/forgot-password",
    "/login",
    "/orders",
    "/register",
    "/reset-password"
  ].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (distractionFreeRoute) return null;
  return <nav aria-label="Mobile store navigation" className="mobile-store-nav md:hidden">
    {links.map(({ href, label, Icon }) => {
      const search = href === "#search";
      const active = !search && (href === "/" ? pathname === href : pathname.startsWith(href));
      return search ? <button key={label} type="button" onClick={() => window.dispatchEvent(new Event("hammer:open-command-palette"))} className="mobile-store-nav-item" aria-label="Search products"><Icon size={19} /><span>{label}</span></button> : <Link key={label} href={href} className={cn("mobile-store-nav-item", active && "is-active")} aria-current={active ? "page" : undefined}><span className="relative"><Icon size={19} />{label === "Cart" && cart.count ? <i>{cart.count > 9 ? "9+" : cart.count}</i> : null}</span><span>{label}</span></Link>;
    })}
  </nav>;
}
