"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Building2,
  BriefcaseBusiness,
  ChevronDown,
  Heart,
  Home,
  ImageIcon,
  Info,
  Mail,
  Menu,
  MessageCircle,
  PackageSearch,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  UserCircle,
  X,
  type LucideIcon
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { LazyAnimatedValue } from "@/components/lazy-animated-value";
import { LogoutButton } from "@/components/logout-button";
import { CartDrawer } from "@/components/cart-drawer";
import { useCart } from "@/components/cart-provider";
import { CustomerThemeToggle } from "@/components/customer-theme-toggle";
import type { PublicNavigationItem } from "@/lib/navigation-types";
import { cn } from "@/lib/utils";
import { onAuthChanged } from "@/lib/client-auth";

type NavLinkItem = {
  label: string;
  href: string;
  Icon: LucideIcon;
  openInNewTab?: boolean;
  children?: NavLinkItem[];
};

type NavbarSession = {
  id: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
};

type NavbarCategory = {
  name: string;
  href: string;
};

const primaryLinks: NavLinkItem[] = [
  { label: "Home", href: "/", Icon: Home },
  { label: "Products", href: "/products", Icon: PackageSearch },
  { label: "Services", href: "/services", Icon: Home },
  { label: "Packages", href: "/packages", Icon: ShoppingCart },
  { label: "Projects", href: "/projects", Icon: BriefcaseBusiness },
  { label: "About", href: "/about", Icon: Info },
  { label: "Wholesale", href: "/wholesale", Icon: Building2 },
  { label: "Track", href: "/track", Icon: Truck }
];

const drawerLinks: NavLinkItem[] = [
  ...primaryLinks,
  { label: "Contact", href: "/contact", Icon: Mail },
  { label: "Brands", href: "/brands", Icon: Tags },
  { label: "Shipping", href: "/shipping", Icon: Truck },
  { label: "Returns", href: "/returns", Icon: RotateCcw },
  { label: "Wishlist", href: "/wishlist", Icon: Heart },
  { label: "Account", href: "/account", Icon: UserCircle }
];

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  products: PackageSearch,
  shop: PackageSearch,
  categories: Boxes,
  services: Home,
  packages: ShoppingCart,
  projects: BriefcaseBusiness,
  gallery: ImageIcon,
  wholesale: Building2,
  track: Truck,
  brands: Tags,
  account: UserCircle,
  wishlist: Heart,
  contact: Mail,
  about: Info
};

function toNavItem(item: PublicNavigationItem): NavLinkItem {
  const iconKey = String(item.icon || item.label).toLowerCase().replaceAll(" ", "-");
  return {
    label: item.label,
    href: item.href,
    Icon: iconMap[iconKey] || iconMap[iconKey.replaceAll("-", "")] || PackageSearch,
    openInNewTab: item.openInNewTab,
    children: item.children?.map(toNavItem)
  };
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isCategoryLink(item: NavLinkItem) {
  return item.href === "/categories" || item.label.trim().toLowerCase() === "categories";
}

function ensureAboutLink(items: NavLinkItem[]) {
  const withoutCategories = items.filter((item) => !isCategoryLink(item));
  if (withoutCategories.some((item) => item.href === "/about")) return withoutCategories;
  const trackIndex = withoutCategories.findIndex((item) => item.href === "/track");
  const insertAt = trackIndex >= 0 ? trackIndex : withoutCategories.length;
  return [
    ...withoutCategories.slice(0, insertAt),
    { label: "About", href: "/about", Icon: Info },
    ...withoutCategories.slice(insertAt)
  ];
}

function DesktopLink({ item, pathname }: { item: NavLinkItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const Icon = item.Icon;
  const anchor = (
    <Link
      href={item.href}
      prefetch={!item.href.startsWith("http")}
      target={item.openInNewTab ? "_blank" : undefined}
      rel={item.openInNewTab ? "noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative inline-flex h-11 shrink-0 items-center gap-1.5 px-2.5 text-[11px] font-extrabold uppercase text-slate-600 outline-none transition-colors duration-200 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:text-slate-300 dark:hover:text-white",
        active && "text-slate-950 dark:text-white"
      )}
    >
      <Icon size={14} className={cn("shrink-0 transition-colors", active ? "text-red-600" : "text-slate-400 group-hover:text-red-600")} />
      <span>{item.label}</span>
      {item.children?.length ? <ChevronDown size={12} className="transition-transform duration-200 group-hover:rotate-180" /> : null}
      {active ? (
        <motion.span layoutId="store-nav-active" className="absolute inset-x-2.5 bottom-0 h-0.5 bg-red-600" />
      ) : (
        <span className="absolute inset-x-2.5 bottom-0 h-0.5 origin-left scale-x-0 bg-red-600 transition-transform duration-200 group-hover:scale-x-100" />
      )}
    </Link>
  );

  if (!item.children?.length) return anchor;
  return (
    <div className="group relative shrink-0">
      {anchor}
      <div className="invisible absolute left-0 top-full z-20 w-64 translate-y-2 rounded-lg border border-slate-200 bg-white p-2 opacity-0 shadow-[0_22px_60px_rgba(15,23,42,0.16)] transition duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-900">
        {item.children.map((child) => (
          <Link key={`${child.href}-${child.label}`} href={child.href} target={child.openInNewTab ? "_blank" : undefined} rel={child.openInNewTab ? "noreferrer" : undefined} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:text-slate-200 dark:hover:bg-slate-800">
            <child.Icon size={16} /> {child.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function DrawerLink({ item, pathname, onClick }: { item: NavLinkItem; pathname: string; onClick: () => void }) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      prefetch={!item.href.startsWith("http")}
      target={item.openInNewTab ? "_blank" : undefined}
      rel={item.openInNewTab ? "noreferrer" : undefined}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(
        "group flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-extrabold text-slate-700 outline-none transition duration-200 hover:bg-slate-100 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:text-slate-200 dark:hover:bg-slate-800",
        active && "bg-slate-950 text-white hover:bg-slate-950 hover:text-white dark:bg-white dark:text-slate-950"
      )}
    >
      <item.Icon size={18} className={active ? "text-red-400" : "text-slate-400 group-hover:text-red-600"} />
      <span>{item.label}</span>
    </Link>
  );
}

export function Navbar({
  navigation = [],
  categories = [],
  logoUrl = "/brand/htc-logo.png"
}: {
  navigation?: PublicNavigationItem[];
  categories?: NavbarCategory[];
  logoUrl?: string;
}) {
  const pathname = usePathname();
  const cart = useCart();
  const reduceMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<NavbarSession | null>(null);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const scrolledRef = useRef(false);
  const managedHeader = useMemo(() => navigation.filter((item) => item.location === "HEADER"), [navigation]);
  const desktopLinks = useMemo(
    () => ensureAboutLink(managedHeader.length ? managedHeader.filter((item) => item.desktopVisible).map(toNavItem) : primaryLinks),
    [managedHeader]
  );
  const mobileLinks = useMemo(
    () => ensureAboutLink(managedHeader.length ? managedHeader.filter((item) => item.mobileVisible).map(toNavItem) : drawerLinks),
    [managedHeader]
  );

  useEffect(() => {
    let active = true;
    const refreshSession = () => {
      fetch("/api/auth/session", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((data) => { if (active) setSessionUser(data?.user || null); })
        .catch(() => { if (active) setSessionUser(null); });
    };
    refreshSession();
    const unsubscribe = onAuthChanged(refreshSession);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [pathname]);

  useEffect(() => {
    const update = () => {
      frameRef.current = null;
      const scrollY = window.scrollY;
      const nextScrolled = scrollY > 14;
      if (nextScrolled !== scrolledRef.current) {
        scrolledRef.current = nextScrolled;
        setScrolled(nextScrolled);
      }
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, scrollY / scrollable) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setCategoriesOpen(false);
    setMobileCategoriesOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!categoriesOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!categoryMenuRef.current?.contains(event.target as Node)) setCategoriesOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [categoriesOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [drawerOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDrawerOpen(false);
      setCategoriesOpen(false);
      setMobileCategoriesOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function openSearch() {
    window.dispatchEvent(new Event("hammer:open-command-palette"));
  }

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50"
      initial={reduceMotion ? false : { y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="store-nav-top flex h-7 items-center bg-slate-950 px-4 text-[10px] font-extrabold uppercase text-white dark:bg-black">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4">
          <span className="truncate">Trade-ready hardware. Secure delivery across Pakistan.</span>
          <Link href="/track" className="hidden items-center gap-1.5 text-slate-300 transition-colors hover:text-white sm:inline-flex"><Truck size={13} /> Track an order</Link>
        </div>
      </div>

      <div className={cn("store-nav-main border-b border-slate-200 bg-white/95 transition-[box-shadow,background-color] duration-300 dark:border-slate-800 dark:bg-slate-950/95", scrolled && "is-scrolled bg-white/90 shadow-[0_12px_32px_rgba(15,23,42,0.1)] backdrop-blur-md dark:bg-slate-950/90")}>
        <div className="store-nav-row mx-auto grid h-[68px] max-w-[90rem] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6 lg:gap-6 lg:px-10">
          <Link href="/" className="relative h-12 w-24 shrink-0 rounded-md outline-none transition-transform duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-red-600/30 sm:w-36" aria-label="Hammer Trading Company home">
            <Image src={logoUrl || "/brand/htc-logo.png"} alt="Hammer Trading Company" fill priority unoptimized={Boolean(logoUrl && !logoUrl.startsWith("/"))} className="object-contain object-left" sizes="144px" />
          </Link>

          <button type="button" onClick={openSearch} className="store-nav-search group mx-auto hidden h-11 w-full max-w-2xl items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 text-left text-sm text-slate-500 shadow-inner transition duration-200 hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-600 lg:flex" aria-label="Open product search">
            <Search size={18} className="shrink-0 text-slate-400 transition-colors group-hover:text-red-600" />
            <span className="min-w-0 flex-1 truncate">Search products, categories, brands or SKU</span>
            <span className="rounded-md bg-white px-2 py-1 font-mono text-[10px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">Search</span>
          </button>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <button type="button" onClick={openSearch} className="store-nav-icon grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-200 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:bg-slate-800 dark:text-slate-200 lg:hidden" aria-label="Open product search"><Search size={18} /></button>
            <span className="hidden sm:block"><CustomerThemeToggle /></span>
            <Link href="/account" aria-label="Account" title="Account" className="store-nav-icon hidden size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-200 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:bg-slate-800 dark:text-slate-200 sm:grid"><UserCircle size={19} /></Link>
            <Link href="/wishlist" aria-label="Wishlist" title="Wishlist" className="store-nav-icon hidden size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-200 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:bg-slate-800 dark:text-slate-200 sm:grid"><Heart size={18} /></Link>
            {sessionUser?.isAdmin ? <Link href="/admin" aria-label="Admin panel" title="Admin panel" className="hidden size-10 place-items-center rounded-lg bg-slate-950 text-white transition duration-200 hover:-translate-y-0.5 hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 sm:grid"><ShieldCheck size={18} /></Link> : null}
            {sessionUser ? <LogoutButton iconOnly redirectTo="/login" className="hidden size-10 place-items-center rounded-lg bg-slate-100 text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-red-950/40 lg:grid" /> : null}
            <Link href="/cart" className="store-nav-cart group relative inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-700 px-3 text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-600/30" aria-label={`Cart, ${cart.count} items`}>
              <ShoppingCart size={18} />
              <span className="hidden text-xs font-black uppercase lg:inline">Cart</span>
              {cart.count > 0 ? <span className="grid min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-black text-red-700"><LazyAnimatedValue value={cart.count} /></span> : null}
            </Link>
            <button type="button" className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-800 transition duration-200 hover:bg-slate-200 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:bg-slate-800 dark:text-slate-100 xl:hidden" aria-label="Open navigation menu" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}><Menu size={21} /></button>
          </div>
        </div>
      </div>

      <div className="store-nav-linkbar hidden border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 xl:block">
        <div className="mx-auto flex h-11 max-w-[90rem] items-stretch px-10">
          <div ref={categoryMenuRef} className="relative w-56 shrink-0">
            <button
              type="button"
              onClick={() => setCategoriesOpen((open) => !open)}
              aria-expanded={categoriesOpen}
              aria-haspopup="menu"
              aria-controls="desktop-category-menu"
              className="store-nav-categories inline-flex h-full w-full items-center gap-3 bg-slate-950 px-4 text-xs font-black uppercase text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-inset dark:bg-white dark:text-slate-950 dark:hover:bg-red-600 dark:hover:text-white"
            >
              <Boxes size={17} />
              Browse categories
              <ChevronDown size={13} className={cn("ml-auto transition-transform duration-200", categoriesOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {categoriesOpen ? (
                <motion.div
                  id="desktop-category-menu"
                  role="menu"
                  initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-0 top-[calc(100%+1px)] z-40 w-[min(46rem,calc(100vw-5rem))] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="mb-3 flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-700">
                    <div>
                      <p className="font-display text-xl font-black uppercase text-slate-950 dark:text-white">Shop by category</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Choose a department to see matching products.</p>
                    </div>
                    <Link href="/categories" role="menuitem" onClick={() => setCategoriesOpen(false)} className="shrink-0 text-xs font-black uppercase text-red-700 transition-colors hover:text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 dark:text-red-400">
                      View all
                    </Link>
                  </div>
                  {categories.length ? (
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {categories.map((category) => (
                        <Link
                          key={`${category.href}-${category.name}`}
                          href={category.href}
                          role="menuitem"
                          onClick={() => setCategoriesOpen(false)}
                          className="group flex min-h-12 items-center gap-3 border border-transparent px-3 text-sm font-bold text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-slate-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800"
                        >
                          <span className="grid size-8 shrink-0 place-items-center bg-slate-100 text-slate-500 transition-colors group-hover:bg-red-50 group-hover:text-red-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-red-950/40 dark:group-hover:text-red-300">
                            <Boxes size={15} />
                          </span>
                          <span className="line-clamp-2">{category.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex min-h-20 items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                      Categories are loading...
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <nav aria-label="Primary navigation" className="flex min-w-0 flex-1 items-center overflow-x-auto px-3">
            {desktopLinks.map((item) => <DesktopLink key={`${item.href}-${item.label}`} item={item} pathname={pathname} />)}
          </nav>
          <Link href="/account/messages" className="inline-flex shrink-0 items-center gap-2 px-3 text-xs font-extrabold text-slate-600 transition-colors hover:text-red-700 dark:text-slate-300 dark:hover:text-red-400"><MessageCircle size={15} /> Support</Link>
        </div>
      </div>
      <div ref={progressRef} className="h-0.5 origin-left scale-x-0 bg-red-600" aria-hidden="true" />

      <AnimatePresence>
        {drawerOpen ? (
          <motion.div className="fixed inset-0 z-[100] xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-slate-950/45" onClick={() => setDrawerOpen(false)} aria-label="Close navigation menu" />
            <motion.aside role="dialog" aria-modal="true" aria-label="Mobile navigation" className="absolute right-0 top-0 h-dvh w-[90vw] max-w-sm overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-950" initial={reduceMotion ? false : { x: "100%" }} animate={{ x: 0 }} exit={reduceMotion ? { opacity: 0 } : { x: "100%" }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}>
              <div className="mb-5 flex items-center justify-between">
                <Link href="/" onClick={() => setDrawerOpen(false)} className="relative h-12 w-40 rounded-md focus-visible:ring-2 focus-visible:ring-red-600/30" aria-label="Hammer Trading Company home"><Image src={logoUrl || "/brand/htc-logo.png"} alt="Hammer Trading Company" fill unoptimized={Boolean(logoUrl && !logoUrl.startsWith("/"))} className="object-contain object-left" sizes="160px" /></Link>
                <button type="button" autoFocus onClick={() => setDrawerOpen(false)} className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-800 transition-colors hover:bg-slate-200 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:bg-slate-800 dark:text-white" aria-label="Close navigation menu"><X size={19} /></button>
              </div>
              <button type="button" onClick={() => { setDrawerOpen(false); window.setTimeout(openSearch, 150); }} className="mb-4 flex h-12 w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><Search size={18} /> Search the store</button>
              <div className="mb-4 flex min-h-12 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <span>Store appearance</span>
                <CustomerThemeToggle />
              </div>
              {sessionUser?.isAdmin ? <Link href="/admin" onClick={() => setDrawerOpen(false)} className="mb-4 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-black text-white dark:bg-white dark:text-slate-950"><ShieldCheck size={17} /> Admin panel</Link> : null}
              {sessionUser ? <LogoutButton redirectTo="/login" onLoggedOut={() => setDrawerOpen(false)} className="mb-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300" /> : null}
              <div className="mb-2 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setMobileCategoriesOpen((open) => !open)}
                  aria-expanded={mobileCategoriesOpen}
                  aria-controls="mobile-category-menu"
                  className="flex min-h-12 w-full items-center gap-3 px-3 text-left text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <Boxes size={18} className="text-red-600" />
                  <span className="flex-1">Categories</span>
                  <ChevronDown size={16} className={cn("transition-transform duration-200", mobileCategoriesOpen && "rotate-180")} />
                </button>
                <AnimatePresence initial={false}>
                  {mobileCategoriesOpen ? (
                    <motion.div
                      id="mobile-category-menu"
                      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.18 }}
                      className="grid grid-cols-2 gap-1 border-t border-slate-200 p-2 dark:border-slate-700"
                    >
                      {categories.map((category) => (
                        <Link
                          key={`${category.href}-${category.name}`}
                          href={category.href}
                          onClick={() => setDrawerOpen(false)}
                          className="flex min-h-11 items-center px-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          {category.name}
                        </Link>
                      ))}
                      <Link href="/categories" onClick={() => setDrawerOpen(false)} className="col-span-2 flex min-h-11 items-center justify-center bg-slate-950 px-3 text-xs font-black uppercase text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30 dark:bg-white dark:text-slate-950">
                        View all categories
                      </Link>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
              <nav aria-label="Mobile primary navigation" className="grid gap-1.5">
                {mobileLinks.map((item, index) => (
                  <motion.div key={`${item.href}-${item.label}`} initial={reduceMotion ? false : { opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.025 }}>
                    <DrawerLink item={item} pathname={pathname} onClick={() => setDrawerOpen(false)} />
                    {item.children?.length ? <div className="ml-6 mt-1 grid gap-1 border-l border-slate-200 pl-3 dark:border-slate-700">{item.children.map((child) => <DrawerLink key={`${child.href}-${child.label}`} item={child} pathname={pathname} onClick={() => setDrawerOpen(false)} />)}</div> : null}
                  </motion.div>
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
