"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Layout, Monitor, Smartphone, Tablet, Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STOREFRONT_THEMES, STOREFRONT_LAYOUTS, ADMIN_UI_THEMES, ADMIN_UI_LAYOUTS, type StorefrontThemeId, type StorefrontLayoutId, type AdminUiThemeId, type AdminUiLayoutId } from "@/lib/theme-config";
import { Card3D, GlassCard, AnimatedSection, FloatingElement, GradientOrb } from "./advanced-cards";

export function AdminThemeDesigner() {
  const [storefrontTheme, setStorefrontTheme] = useState<StorefrontThemeId>("industrial");
  const [storefrontLayout, setStorefrontLayout] = useState<StorefrontLayoutId>("showroom");
  const [adminTheme, setAdminTheme] = useState<AdminUiThemeId>("operations");
  const [adminLayout, setAdminLayout] = useState<AdminUiLayoutId>("operations");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"storefront" | "admin">("storefront");

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Settings unavailable");
        setStorefrontTheme(payload.storefront_theme || "industrial");
        setStorefrontLayout(payload.storefront_layout || "showroom");
        setAdminTheme(payload.admin_ui_theme || "operations");
        setAdminLayout(payload.admin_ui_layout || "operations");
        setAnimationsEnabled(payload.animations_enabled !== "false");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Settings unavailable"))
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings() {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storefront_theme: storefrontTheme,
          storefront_layout: storefrontLayout,
          admin_ui_theme: adminTheme,
          admin_ui_layout: adminLayout,
          animations_enabled: String(animationsEnabled)
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Settings could not be saved");
      setMessage("Design system updated successfully! Changes are now live.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Settings could not be saved");
    } finally {
      setSaving(false);
    }
  }

  const previewHref = `/?theme-preview=${storefrontTheme}&layout-preview=${storefrontLayout}`;
  const previewWidth = previewMode === "desktop" ? "100%" : previewMode === "tablet" ? "768px" : "390px";

  return (
    <div className="space-y-8 p-6">
      {/* Header with Gradient Orbs */}
      <AnimatedSection animation="fade-up" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <GradientOrb color="#d51f2c" size={400} blur={120} className="-top-20 -right-20" />
        <GradientOrb color="#16758b" size={300} blur={100} className="-bottom-10 -left-10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-red-400" />
            <p className="text-sm font-bold uppercase tracking-wider text-red-400">Design System Control</p>
          </div>
          <h1 className="mt-3 text-4xl font-black sm:text-5xl">Advanced Theme Designer</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
            Create stunning 3D animated experiences with glassmorphic cards, advanced themes, and responsive layouts. 
            Every change is instantly previewable and can be published across your entire platform.
          </p>
        </div>
      </AnimatedSection>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("storefront")}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
            activeTab === "storefront"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <Monitor size={18} />
          Storefront Design
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition-all ${
            activeTab === "admin"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          }`}
        >
          <Layout size={18} />
          Admin Panel Design
        </button>
      </div>

      {activeTab === "storefront" && (
        <>
          {/* Storefront Theme Selection */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <GlassCard variant="light" intensity="soft" className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <Palette className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-bold">Visual Theme</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {STOREFRONT_THEMES.map((theme) => (
                  <Card3D key={theme.id} glareEnabled rotateIntensity={8} scaleOnHover>
                    <button
                      type="button"
                      onClick={() => setStorefrontTheme(theme.id)}
                      className="group relative w-full overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div
                        className="mb-4 h-24 overflow-hidden rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
                        }}
                      >
                        <div className="flex h-full items-center justify-center">
                          <div
                            className="h-8 w-24 rounded-lg shadow-lg"
                            style={{ backgroundColor: theme.colors[2] }}
                          />
                        </div>
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="block text-base font-bold">{theme.name}</strong>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{theme.description}</p>
                        </div>
                        {storefrontTheme === theme.id && (
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white">
                            <Check size={15} />
                          </span>
                        )}
                      </div>
                    </button>
                  </Card3D>
                ))}
              </div>
            </GlassCard>
          </AnimatedSection>

          {/* Storefront Layout Selection */}
          <AnimatedSection animation="fade-up" delay={0.2}>
            <GlassCard variant="light" intensity="soft" className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <Layout className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-bold">Layout Structure</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {STOREFRONT_LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => setStorefrontLayout(layout.id)}
                    className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
                      storefrontLayout === layout.id
                        ? "border-red-600 bg-red-50 dark:bg-red-950/20"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="mb-4 flex h-20 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      <div className="grid grid-cols-3 gap-1">
                        {[...Array(6)].map((_, i) => (
                          <div
                            key={i}
                            className="h-6 w-6 rounded bg-slate-300 dark:bg-slate-600"
                            style={{
                              opacity: i % 2 === 0 ? 1 : 0.5
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <strong className="block text-base font-bold">{layout.name}</strong>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{layout.description}</p>
                      </div>
                      {storefrontLayout === layout.id && (
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white">
                          <Check size={15} />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          </AnimatedSection>
        </>
      )}

      {activeTab === "admin" && (
        <>
          {/* Admin Theme Selection */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <GlassCard variant="light" intensity="soft" className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <Palette className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-bold">Admin UI Theme</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ADMIN_UI_THEMES.map((theme) => (
                  <Card3D key={theme.id} glareEnabled rotateIntensity={8} scaleOnHover>
                    <button
                      type="button"
                      onClick={() => setAdminTheme(theme.id)}
                      className="group relative w-full overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div
                        className="mb-4 h-24 overflow-hidden rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`
                        }}
                      >
                        <div className="flex h-full items-center justify-center">
                          <div
                            className="h-8 w-24 rounded-lg shadow-lg"
                            style={{ backgroundColor: theme.colors[2] }}
                          />
                        </div>
                      </div>
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="block text-base font-bold">{theme.name}</strong>
                          <p className="mt-1 text-xs leading-5 text-slate-500">{theme.description}</p>
                        </div>
                        {adminTheme === theme.id && (
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white">
                            <Check size={15} />
                          </span>
                        )}
                      </div>
                    </button>
                  </Card3D>
                ))}
              </div>
            </GlassCard>
          </AnimatedSection>

          {/* Admin Layout Selection */}
          <AnimatedSection animation="fade-up" delay={0.2}>
            <GlassCard variant="light" intensity="soft" className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <Layout className="h-5 w-5 text-red-600" />
                <h2 className="text-xl font-bold">Admin Layout</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ADMIN_UI_LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => setAdminLayout(layout.id)}
                    className={`group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all duration-300 ${
                      adminLayout === layout.id
                        ? "border-red-600 bg-red-50 dark:bg-red-950/20"
                        : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="mb-4 flex h-20 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      <div className="flex gap-2">
                        <div className="h-12 w-3 rounded bg-slate-400 dark:bg-slate-500" />
                        <div className="h-12 w-16 rounded bg-slate-300 dark:bg-slate-600" />
                      </div>
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <strong className="block text-base font-bold">{layout.name}</strong>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{layout.description}</p>
                      </div>
                      {adminLayout === layout.id && (
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-red-600 text-white">
                          <Check size={15} />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </GlassCard>
          </AnimatedSection>
        </>
      )}

      {/* Animation Toggle */}
      <AnimatedSection animation="fade-up" delay={0.3}>
        <GlassCard variant="light" intensity="soft" className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-bold">Enable Animations</h3>
                <p className="text-sm text-slate-500">Toggle smooth transitions and motion effects across the platform</p>
              </div>
            </div>
            <button
              onClick={() => setAnimationsEnabled(!animationsEnabled)}
              className={`relative h-8 w-14 rounded-full transition-colors ${
                animationsEnabled ? "bg-red-600" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                  animationsEnabled ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </GlassCard>
      </AnimatedSection>

      {/* Preview Section */}
      <AnimatedSection animation="fade-up" delay={0.4}>
        <GlassCard variant="dark" intensity="medium" className="overflow-hidden p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Live Preview</h2>
              <p className="text-sm text-slate-500">Test your design across different device sizes</p>
            </div>
            <div className="flex items-center gap-2">
              {([
                ["desktop", Monitor, "Desktop"],
                ["tablet", Tablet, "Tablet"],
                ["mobile", Smartphone, "Mobile"]
              ] as const).map(([mode, Icon, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`grid h-10 w-10 place-items-center rounded-lg transition-all ${
                    previewMode === mode
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                  }`}
                  title={label}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl bg-slate-100 p-4 dark:bg-slate-900">
            <iframe
              key={`${storefrontTheme}-${storefrontLayout}-${previewMode}`}
              src={previewHref}
              className="mx-auto h-[60vh] w-full rounded-lg border-0 bg-white shadow-2xl"
              style={{ maxWidth: previewWidth === "100%" ? "none" : previewWidth }}
              loading="lazy"
            />
          </div>
        </GlassCard>
      </AnimatedSection>

      {/* Action Buttons */}
      <AnimatedSection animation="fade-up" delay={0.5}>
        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="accent"
            disabled={loading || saving}
            onClick={saveSettings}
            className="min-h-[50px] px-8 text-base"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Applying...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check size={18} />
                Publish Design System
              </span>
            )}
          </Button>
          <a
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[50px] items-center gap-2 rounded-lg border-2 border-slate-300 px-6 text-sm font-bold transition-all hover:border-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-white dark:hover:bg-slate-800"
          >
            Open in New Tab
          </a>
        </div>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 rounded-xl border p-4 ${
              message.includes("success")
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            <p className="font-bold">{message}</p>
          </motion.div>
        )}
      </AnimatedSection>
    </div>
  );
}
