"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  Bell,
  Boxes,
  Building2,
  BarChart3,
  ChevronDown,
  ClipboardList,
  Command,
  CircleDollarSign,
  CreditCard,
  FileText,
  Gift,
  Globe2,
  House,
  ImageIcon,
  Info,
  LayoutDashboard,
  KeyRound,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PackageSearch,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  Settings,
  PanelsTopLeft,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Sun,
  TicketPercent,
  Truck,
  UserCog,
  Users,
  Warehouse,
  X
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Permission, Role } from "@prisma/client";
import { canAccess, roleLabel } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { fetchWithTimeout, notifyAuthChanged, waitForSignedOut } from "@/lib/client-auth";
import { ADMIN_UI_THEMES, normalizeAdminUiLayout, normalizeAdminUiTheme, type AdminUiLayoutId, type AdminUiThemeId } from "@/lib/theme-config";

type AdminShellClientProps = {
  children: ReactNode;
  user: {
    name: string;
    email: string;
    role: Role;
    permissions?: Permission[];
  };
  initialDesign: AdminUiThemeId;
  initialLayout: AdminUiLayoutId;
};

const links = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin", permission: "DASHBOARD_READ" },
  { icon: ClipboardList, label: "Orders", href: "/admin/orders", permission: "ORDERS_READ" },
  { icon: CircleDollarSign, label: "Finance", href: "/admin/finance", permission: "REPORTS_READ" },
  { icon: Boxes, label: "Products", href: "/admin/products", permission: "PRODUCTS_READ" },
  { icon: PackageSearch, label: "Categories", href: "/admin/categories", permission: "CATEGORIES_WRITE" },
  { icon: Building2, label: "Brands", href: "/admin/brands", permission: "BRANDS_WRITE" },
  { icon: Warehouse, label: "Inventory", href: "/admin/inventory", permission: "INVENTORY_READ" },
  { icon: Users, label: "Customers", href: "/admin/customers", permission: "CUSTOMERS_READ" },
  { icon: ShoppingBag, label: "Abandoned Carts", href: "/admin/abandoned-carts", permission: "CUSTOMERS_READ" },
  { icon: Truck, label: "Delivery", href: "/admin/delivery", permission: "DELIVERY_READ" },
  { icon: CreditCard, label: "Couriers", href: "/admin/couriers", permission: "DELIVERY_READ" },
  { icon: UserCog, label: "Riders", href: "/admin/riders", permission: "DELIVERY_READ" },
  { icon: TicketPercent, label: "Coupons", href: "/admin/coupons", permission: "COUPONS_MANAGE" },
  { icon: ImageIcon, label: "Banners", href: "/admin/banners", permission: "BANNERS_MANAGE" },
  { icon: PanelsTopLeft, label: "Website", href: "/admin/website", permission: "CONTENT_MANAGE" },
  { icon: Sparkles, label: "3D Store", href: "/admin/store-design", permission: "SETTINGS_MANAGE" },
  { icon: Info, label: "About", href: "/admin/about", permission: "CONTENT_MANAGE" },
  { icon: PackageCheck, label: "Room Packages", href: "/admin/room-packages", permission: "PACKAGES_MANAGE" },
  { icon: Star, label: "Reviews", href: "/admin/reviews", permission: "REVIEWS_MANAGE" },
  { icon: RotateCcw, label: "Returns", href: "/admin/returns", permission: "RETURNS_MANAGE" },
  { icon: FileText, label: "Quotes", href: "/admin/quotes", permission: "SUPPORT_READ" },
  { icon: MessageSquare, label: "Messages", href: "/admin/messages", permission: "SUPPORT_READ" },
  { icon: House, label: "Room Services", href: "/admin/room-services", permission: "SERVICES_MANAGE" },
  { icon: Gift, label: "Support", href: "/admin/support", permission: "SUPPORT_READ" },
  { icon: Activity, label: "Reports", href: "/admin/reports", permission: "REPORTS_READ" },
  { icon: ShieldCheck, label: "Staff", href: "/admin/staff", permission: "STAFF_MANAGE" },
  { icon: Activity, label: "Activity Logs", href: "/admin/activity-logs", permission: "ACTIVITY_READ" },
  { icon: KeyRound, label: "Account", href: "/admin/account", permission: "DASHBOARD_READ" },
  { icon: Settings, label: "Settings", href: "/admin/settings", permission: "SETTINGS_MANAGE" }
] as const;

const linkGroups = [
  { title: "Control", items: ["/admin", "/admin/orders", "/admin/finance", "/admin/products", "/admin/inventory"] },
  { title: "Catalog", items: ["/admin/categories", "/admin/brands", "/admin/coupons", "/admin/banners", "/admin/website", "/admin/store-design", "/admin/about", "/admin/room-packages", "/admin/reviews"] },
  { title: "Customers", items: ["/admin/customers", "/admin/abandoned-carts", "/admin/messages", "/admin/room-services", "/admin/support", "/admin/quotes", "/admin/returns"] },
  { title: "Delivery", items: ["/admin/delivery", "/admin/couriers", "/admin/riders"] },
  { title: "System", items: ["/admin/reports", "/admin/staff", "/admin/activity-logs", "/admin/account", "/admin/settings"] }
] as const;

export function AdminShellClient({ children, user, initialDesign, initialLayout }: AdminShellClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [toast, setToast] = useState("");
  const [supportUnread, setSupportUnread] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [adminDesign, setAdminDesign] = useState<AdminUiThemeId>(initialDesign);
  const [adminLayout, setAdminLayout] = useState<AdminUiLayoutId>(initialLayout);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("hammer-admin-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(storedTheme ? storedTheme === "dark" : prefersDark);
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    window.localStorage.setItem("hammer-admin-theme", dark ? "dark" : "light");
  }, [dark, themeReady]);

  useEffect(() => {
    setAdminDesign(initialDesign);
  }, [initialDesign]);

  useEffect(() => {
    setAdminLayout(initialLayout);
  }, [initialLayout]);

  useEffect(() => {
    const syncDesign = (event: Event) => {
      const detail = (event as CustomEvent<{ design?: string; layout?: string }>).detail;
      setAdminDesign(normalizeAdminUiTheme(detail?.design));
      setAdminLayout(normalizeAdminUiLayout(detail?.layout));
    };
    window.addEventListener("hammer:admin-design", syncDesign);
    return () => window.removeEventListener("hammer:admin-design", syncDesign);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSupportUnread() {
      try {
        const response = await fetch("/api/admin/messages");
        const data = await response.json();
        if (!active || !response.ok || !Array.isArray(data.items)) return;
        setSupportUnread(data.items.reduce((sum: number, item: { adminUnreadCount?: number }) => sum + Number(item.adminUnreadCount || 0), 0));
      } catch {
        if (active) setSupportUnread(0);
      }
    }
    void loadSupportUnread();
    const timer = window.setInterval(() => void loadSupportUnread(), 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const allowedLinks = useMemo(
    () => links.filter((link) => canAccess(user, link.permission as Permission)),
    [user]
  );

  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replaceAll("-", " "));
  const pageTitle = breadcrumbs.at(-1) || "Dashboard";
  const adminDesignLabel = ADMIN_UI_THEMES.find((theme) => theme.id === adminDesign)?.name || "Operations";

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetchWithTimeout("/api/auth/logout", { method: "POST" }, 10_000);
      if (!response.ok) throw new Error("Logout failed");
      const sessionCleared = await waitForSignedOut(5_000);
      if (!sessionCleared) throw new Error("Session could not be cleared");
      notifyAuthChanged();
      setProfileOpen(false);
      router.replace("/admin/login?next=/admin");
      router.refresh();
    } catch {
      setToast("Logout could not be completed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  function search(formData: FormData) {
    const q = String(formData.get("q") || "").trim();
    if (!q) {
      setToast("Search something first.");
      return;
    }
    router.push(`/admin/products?q=${encodeURIComponent(q)}`);
  }

  function renderSidebar(isMobile = false) {
    const compact = isMobile ? false : collapsed;
    return (
    <aside
      style={{ width: compact ? 76 : 264 }}
      className="admin-sidebar h-full overflow-hidden border-r border-white/[0.08] text-white"
    >
      <div className="relative flex h-[68px] items-center justify-between border-b border-white/[0.08] px-3.5">
        <Link href="/admin" className="group flex min-w-0 items-center gap-3 font-black text-white">
          <span className="admin-logo-mark relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/[0.08] ring-1 ring-white/10">
            <Image src="/brand/htc-logo.png" alt="HTC" fill className="object-contain p-1 transition duration-300 group-hover:scale-105" sizes="40px" />
          </span>
          {!compact ? <span className="admin-brand-copy min-w-0"><span className="block truncate text-sm leading-tight">Hammer Trading</span><span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-400">{adminDesignLabel}</span></span> : null}
        </Link>
        <button className="admin-sidebar-collapse hidden rounded-md p-2 text-slate-400 transition hover:bg-white/[0.08] hover:text-white lg:block" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar">
          {compact ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      {!compact ? (
        <div className="admin-user-card mx-3 my-3 rounded-lg border border-white/[0.08] bg-white/[0.045] p-3">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-red-600 text-xs font-black text-white">{user.name.slice(0, 2).toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{roleLabel(user.role)}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-white/[0.08] pt-2.5 text-[11px] font-semibold text-slate-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Operations online
          </div>
        </div>
      ) : null}
      <nav className={cn("overflow-y-auto px-2.5 pb-5", compact ? "h-[calc(100vh-4.25rem)] pt-3" : "h-[calc(100vh-11rem)]")} data-lenis-prevent>
        {linkGroups.map((group) => {
          const groupLinks = allowedLinks.filter((link) => (group.items as readonly string[]).includes(link.href));
          if (!groupLinks.length) return null;
          return (
            <div key={group.title} className="mb-4">
              {!compact ? <p className="admin-nav-group-title mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{group.title}</p> : null}
              <div className="space-y-1">
                {groupLinks.map((link) => {
                  const active = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(`${link.href}/`));
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      data-testid={`admin-sidebar-${link.label.toLowerCase().replaceAll(" ", "-")}`}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "admin-nav-item relative flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-semibold transition duration-200",
                        active ? "is-active text-white" : "text-slate-400 hover:bg-white/[0.055] hover:text-white"
                      )}
                      title={compact ? link.label : undefined}
                    >
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-md transition", active ? "bg-red-600 text-white" : "text-slate-400")}>
                        <Icon size={17} />
                      </span>
                      {!compact ? <span className="admin-nav-label truncate">{link.label}</span> : null}
                      {(link.href === "/admin/messages" || link.href === "/admin/support") && supportUnread > 0 ? (
                        <span className={cn("ml-auto grid min-w-6 place-items-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white", compact && "absolute right-2 top-1 size-5 min-w-0 px-0")}>{supportUnread}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      {!compact ? <div className="admin-sidebar-footer mx-3 mb-3 flex items-center gap-2 border-t border-white/[0.08] pt-3 text-[11px] font-semibold text-slate-500"><Sparkles size={14} /> HTC admin workspace</div> : null}
    </aside>
    );
  }

  const desktopSidebar = renderSidebar(false);

  return (
    <div className="admin-console min-h-screen text-slate-950 transition-colors dark:text-slate-100" data-admin-design={adminDesign} data-admin-layout={adminLayout} data-sidebar-collapsed={collapsed ? "true" : "false"}>
      <div className="admin-sidebar-shell hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-[80] lg:block">{desktopSidebar}</div>
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              className="absolute inset-y-0 right-0 bg-slate-950/40"
              style={{ left: 264 }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            />
            <motion.div initial={{ x: -264 }} animate={{ x: 0 }} exit={{ x: -264 }} transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-y-0 left-0 w-[264px]">
              {renderSidebar(true)}
              <button className="absolute right-3 top-4 rounded-lg p-2 text-white hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="Close sidebar"><X size={18} /></button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className={cn("admin-content-shell relative transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]")}>
        <header className="admin-topbar sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0b0e12]/92">
          <div className="flex min-h-[68px] items-center gap-2.5 px-4 lg:px-6">
            <button className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{breadcrumbs.slice(0, -1).join(" / ") || "HTC Admin"}</p>
              <h1 className="truncate text-lg font-extrabold capitalize leading-tight text-slate-950 dark:text-white">{pageTitle}</h1>
            </div>
            <form action={search} className="admin-search hidden min-w-0 flex-1 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/[0.08] dark:bg-white/[0.035] md:flex">
              <Search size={17} className="text-slate-500" />
              <input name="q" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Search products, orders, customers..." />
              <span className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-400 dark:border-white/10 dark:bg-white/[0.04] xl:inline-flex"><Command size={12} /> K</span>
            </form>
            <Link href="/admin/reports" className="hidden min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-white xl:inline-flex">
              <BarChart3 size={17} /> Reports
            </Link>
            <Link href="/" className="hidden min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:text-white md:inline-flex">
              <Globe2 size={17} /> Store
            </Link>
            <button className="grid size-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">
              <motion.span animate={{ rotate: dark ? 180 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>{dark ? <Sun size={19} /> : <Moon size={19} />}</motion.span>
            </button>
            <div className="relative">
              <button className="relative grid size-10 place-items-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setNotificationsOpen((value) => !value)} aria-label="Notifications">
                <Bell size={19} />{supportUnread > 0 ? <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-red-600 text-[10px] font-black text-white">{supportUnread}</span> : <span className="absolute right-2 top-2 size-2 rounded-full bg-orange-500" />}
              </button>
              <AnimatePresence>
                {notificationsOpen ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="admin-popover absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-slate-950">
                    {supportUnread > 0 ? <Link href="/admin/messages" onClick={() => setNotificationsOpen(false)} className="block rounded-md p-3 text-sm font-bold text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">{supportUnread} unread customer message{supportUnread > 1 ? "s" : ""}</Link> : null}
                    {["Low-stock products need review", "Pending orders waiting confirmation", "Delivery delay alerts ready"].map((item) => <p key={item} className="rounded-md p-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-900">{item}</p>)}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
            <div className="relative">
              <button className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => setProfileOpen((value) => !value)}>
                <span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">{user.name.slice(0, 2).toUpperCase()}</span>
                <span className="hidden text-left text-sm md:block"><strong className="block">{user.name}</strong><span className="text-slate-500">{roleLabel(user.role)}</span></span>
                <ChevronDown size={16} />
              </button>
              <AnimatePresence>
                {profileOpen ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="admin-popover absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-slate-950">
                    <div className="px-3 py-2 text-sm"><strong>{user.email}</strong><p className="text-slate-500">{roleLabel(user.role)}</p></div>
                    <Link href="/admin/account" onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-900"><KeyRound size={17} /> Account & security</Link>
                    <button disabled={loggingOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/30" onClick={() => void logout()}><LogOut size={17} /> {loggingOut ? "Signing out..." : "Logout"}</button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </header>
        <main className="relative px-4 py-5 lg:px-7 lg:py-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 md:hidden">
            <div>
              <p className="text-sm font-semibold capitalize text-slate-500">{breadcrumbs.join(" / ") || "admin"}</p>
              <h1 className="mt-1 text-2xl font-black capitalize tracking-tight">{pageTitle}</h1>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </motion.div>
        </main>
      </div>
      <AnimatePresence>
        {toast ? (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl" onAnimationComplete={() => window.setTimeout(() => setToast(""), 2200)}>
            {toast}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
