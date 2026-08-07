"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { PageTransition } from "@/components/page-transition";
import { PremiumBackground } from "@/components/premium-background";
import { MobileStoreNav } from "@/components/mobile-store-nav";
import type { PublicNavigationItem } from "@/lib/navigation-types";
import { normalizeStorefrontLayout, normalizeStorefrontTheme, type StorefrontLayoutId, type StorefrontThemeId } from "@/lib/theme-config";

const CustomerChatWidget = dynamic(() => import("@/components/customer-chat-widget").then((mod) => mod.CustomerChatWidget), { ssr: false });
const PwaControls = dynamic(() => import("@/components/pwa-controls").then((mod) => mod.PwaControls), { ssr: false });
const SmartCommandPalette = dynamic(() => import("@/components/smart-command-palette").then((mod) => mod.SmartCommandPalette), { ssr: false });

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type NavbarCategory = {
  name: string;
  href: string;
};

export function SiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [deferredReady, setDeferredReady] = useState(false);
  const [navigation, setNavigation] = useState<PublicNavigationItem[]>([]);
  const [navbarCategories, setNavbarCategories] = useState<NavbarCategory[]>([]);
  const [publicSettings, setPublicSettings] = useState<Record<string, string>>({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeStorefrontTheme, setActiveStorefrontTheme] = useState<StorefrontThemeId | null>(null);
  const [activeStorefrontLayout, setActiveStorefrontLayout] = useState<StorefrontLayoutId | null>(null);
  const [adminSession, setAdminSession] = useState(false);
  const adminSurface = pathname.startsWith("/admin") || pathname === "/login" || pathname === "/forgot-password";
  const storefrontTheme = normalizeStorefrontTheme(publicSettings.storefront_theme);
  const storefrontLayout = normalizeStorefrontLayout(publicSettings.storefront_layout);
  const effectiveStorefrontTheme = activeStorefrontTheme || storefrontTheme;
  const effectiveStorefrontLayout = activeStorefrontLayout || storefrontLayout;
  const safeColor = (value?: string) => value && /^#[0-9a-f]{6}$/i.test(value) ? value : undefined;
  const themeStyle = effectiveStorefrontTheme === "industrial" ? {
    ...(safeColor(publicSettings.theme_primary_color) ? { "--brand": safeColor(publicSettings.theme_primary_color) } : {}),
    ...(safeColor(publicSettings.theme_surface_color) ? { "--surface-strong": safeColor(publicSettings.theme_surface_color) } : {}),
    ...(safeColor(publicSettings.theme_background_color) ? { "--bg": safeColor(publicSettings.theme_background_color) } : {})
  } as CSSProperties : undefined;

  useEffect(() => {
    if (adminSurface || deferredReady) return;
    let cancelled = false;
    const win = window as IdleWindow;
    const showDeferred = () => {
      if (!cancelled) setDeferredReady(true);
    };
    const fallbackId = window.setTimeout(showDeferred, 1800);
    const idleId = win.requestIdleCallback?.(
      () => {
        window.clearTimeout(fallbackId);
        showDeferred();
      },
      { timeout: 2200 }
    );
    return () => {
      cancelled = true;
      window.clearTimeout(fallbackId);
      if (idleId !== undefined) win.cancelIdleCallback?.(idleId);
    };
  }, [adminSurface, deferredReady]);

  useEffect(() => {
    if (adminSurface) return;
    const controller = new AbortController();
    Promise.all([
      fetch("/api/platform/navigation", { signal: controller.signal }).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/platform/categories", { signal: controller.signal }).then((response) => response.ok ? response.json() : { items: [] }),
      fetch("/api/platform/settings", { signal: controller.signal }).then((response) => response.ok ? response.json() : { settings: {} }),
      fetch("/api/auth/session", { cache: "no-store", signal: controller.signal }).then((response) => response.ok ? response.json() : { user: null })
    ])
      .then(([navigationData, categoryData, settingsData, sessionData]) => {
        setNavigation(Array.isArray(navigationData.items) ? navigationData.items : []);
        setNavbarCategories(Array.isArray(categoryData.items) ? categoryData.items : []);
        setPublicSettings(settingsData.settings && typeof settingsData.settings === "object" ? settingsData.settings : {});
        setSettingsLoaded(true);
        setAdminSession(Boolean(sessionData.user?.isAdmin));
      })
      .catch(() => {
        setNavigation([]);
        setNavbarCategories([]);
        setPublicSettings({});
        setSettingsLoaded(true);
      });
    return () => controller.abort();
  }, [adminSurface]);

  useEffect(() => {
    if (adminSurface || !settingsLoaded) return;
    const previewTheme = new URLSearchParams(window.location.search).get("theme-preview");
    const previewLayout = new URLSearchParams(window.location.search).get("layout-preview");
    const selectedTheme = previewTheme ? normalizeStorefrontTheme(previewTheme) : storefrontTheme;
    const selectedLayout = previewLayout ? normalizeStorefrontLayout(previewLayout) : storefrontLayout;
    setActiveStorefrontTheme(selectedTheme);
    setActiveStorefrontLayout(selectedLayout);
    document.documentElement.dataset.storeDesign = selectedTheme;
    document.documentElement.dataset.storeLayout = selectedLayout;
    window.localStorage.setItem("hammer-store-design", storefrontTheme);
    window.localStorage.setItem("hammer-store-layout", storefrontLayout);
    if (!window.localStorage.getItem("hammer-store-theme")) {
      const defaultDark = publicSettings.default_theme === "dark";
      document.documentElement.classList.toggle("dark", defaultDark);
      document.documentElement.dataset.storeTheme = defaultDark ? "dark" : "light";
      document.documentElement.style.colorScheme = defaultDark ? "dark" : "light";
      window.dispatchEvent(new CustomEvent("hammer:store-theme", { detail: { theme: defaultDark ? "dark" : "light" } }));
    }
  }, [adminSurface, publicSettings.default_theme, settingsLoaded, storefrontLayout, storefrontTheme]);

  useEffect(() => {
    if (adminSurface) return;
    const onOpenPalette = () => {
      window.sessionStorage.setItem("hammer-open-command-palette", "1");
      setDeferredReady(true);
    };
    window.addEventListener("hammer:open-command-palette", onOpenPalette);
    return () => window.removeEventListener("hammer:open-command-palette", onOpenPalette);
  }, [adminSurface]);

  if (adminSurface) return <>{children}</>;
  if (publicSettings.maintenance_enabled === "true" && !adminSession) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-2xl border border-white/15 bg-white/[0.04] p-7 text-center shadow-2xl sm:p-10">
          <Image src={publicSettings.logo || "/brand/htc-logo.png"} alt="Hammer Trading Company" width={220} height={96} className="mx-auto h-24 w-auto object-contain drop-shadow-[0_16px_30px_rgba(0,0,0,0.45)]" />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-red-400">Scheduled maintenance</p>
          <h1 className="mt-3 font-display text-5xl font-black uppercase leading-none">We will be back shortly</h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-slate-300">
            {publicSettings.maintenance_message || "Hammer Trading Company is receiving a scheduled system upgrade. Please check again shortly."}
          </p>
          <a href="/admin/login" className="mt-7 inline-flex min-h-11 items-center justify-center border border-white/20 px-5 text-sm font-bold transition-colors hover:border-red-400 hover:text-red-300">
            Admin access
          </a>
        </section>
      </main>
    );
  }
  return (
    <div
      className="storefront-root relative isolate min-h-screen overflow-x-hidden pb-24 md:pb-0"
      data-store-design={settingsLoaded ? effectiveStorefrontTheme : undefined}
      data-store-layout={settingsLoaded ? effectiveStorefrontLayout : undefined}
      style={themeStyle}
    >
      <PremiumBackground />
      <Navbar navigation={navigation} categories={navbarCategories} logoUrl={publicSettings.logo} />
      <PageTransition>{children}</PageTransition>
      <Footer navigation={navigation} settings={publicSettings} />
      <MobileStoreNav />
      {deferredReady ? (
        <>
          <PwaControls />
          <CustomerChatWidget />
          <SmartCommandPalette />
        </>
      ) : null}
    </div>
  );
}
