"use client";

import Link from "next/link";
import { Check, ExternalLink, Monitor, MonitorPlay, Power, Save, Smartphone, Sparkles, Tablet, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { STOREFRONT_INTERFACES, type StorefrontInterfaceId, type StorefrontThemeId } from "@/lib/theme-config";

const spatialThemes = STOREFRONT_INTERFACES;

export function AdminStore3DManager() {
  const [selected, setSelected] = useState<StorefrontInterfaceId>("foundry-cinema");
  const [published, setPublished] = useState<StorefrontThemeId>("industrial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Settings unavailable");
        const current = String(payload.storefront_theme || "industrial") as StorefrontThemeId;
        setPublished(current);
        const matchingInterface = spatialThemes.find((item) => item.theme === current);
        if (matchingInterface) setSelected(matchingInterface.id);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Settings unavailable"))
      .finally(() => setLoading(false));
  }, []);

  async function publish(interfaceId: StorefrontInterfaceId | "standard") {
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const selectedInterface = spatialThemes.find((item) => item.id === interfaceId);
      const theme = selectedInterface?.theme || "industrial";
      const layout = selectedInterface?.layout || "showroom";
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storefront_theme: theme, storefront_layout: layout })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Storefront could not be updated");
      setPublished(theme);
      window.localStorage.setItem("hammer-store-design", theme);
      window.localStorage.setItem("hammer-store-layout", layout);
      setMessage(theme === "industrial" ? "3D experience disabled. HTC Industrial is now live." : `${selectedInterface?.name || "3D experience"} is now live across the complete storefront.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Storefront could not be updated");
    } finally {
      setSaving(false);
    }
  }

  const selectedInterface = spatialThemes.find((item) => item.id === selected) || spatialThemes[0];
  const previewHref = `/?theme-preview=${selectedInterface.theme}&layout-preview=${selectedInterface.layout}`;
  const previewWidth = previewViewport === "desktop" ? "100%" : previewViewport === "tablet" ? "768px" : "390px";

  return (
    <div className="space-y-6">
      <section className="admin-surface overflow-hidden p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase text-red-700 dark:text-red-300"><Sparkles size={15} /> Store experience</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">3D Storefront</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">Select a complete spatial interface. Desktop gets the interactive WebGL hero and depth motion; mobile automatically uses the fast image fallback.</p>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-black ${["foundry3d", "axonometric", "prism3d"].includes(published) ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            <span className={`size-2 rounded-full ${["foundry3d", "axonometric", "prism3d"].includes(published) ? "bg-emerald-500" : "bg-slate-400"}`} />
            {["foundry3d", "axonometric", "prism3d"].includes(published) ? "3D live" : "Standard live"}
          </span>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {spatialThemes.map((theme) => {
            const active = selected === theme.id;
            const live = published === theme.theme;
            return (
              <button key={theme.id} type="button" onClick={() => setSelected(theme.id)} className={`admin-3d-theme-card group relative overflow-hidden border p-4 text-left transition duration-200 hover:-translate-y-1 hover:shadow-xl ${active ? "border-red-500 ring-2 ring-red-500/20" : "border-slate-200 dark:border-slate-800"}`} aria-pressed={active}>
                <span className={`admin-3d-preview admin-3d-preview-${theme.theme}`} aria-hidden="true"><i /><i /><i /><b /></span>
                <span className="mt-4 flex items-start justify-between gap-3">
                  <span><strong className="block text-base">{theme.name}</strong><small className="mt-1 block font-black uppercase text-red-600">{theme.signature}</small><small className="mt-1 block leading-5 text-slate-500">{theme.description}</small></span>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full ${active ? "bg-red-600 text-white" : "bg-slate-100 text-transparent dark:bg-slate-800"}`}><Check size={15} /></span>
                </span>
                {live ? <span className="absolute left-6 top-6 rounded-sm bg-emerald-500 px-2 py-1 text-[10px] font-black uppercase text-white">Live</span> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <Button variant="accent" disabled={loading || saving} onClick={() => void publish(selected)}><Save size={17} /> {saving ? "Applying..." : "Apply complete interface"}</Button>
          <Button variant="outline" onClick={() => setPreviewOpen(true)}><MonitorPlay size={17} /> Responsive preview</Button>
          <Link href={previewHref} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold transition hover:border-slate-950 dark:border-slate-700 dark:hover:border-white">Open new tab <ExternalLink size={14} /></Link>
          <Button variant="outline" disabled={loading || saving || !["foundry3d", "axonometric", "prism3d"].includes(published)} onClick={() => void publish("standard")}><Power size={17} /> Use standard store</Button>
        </div>
        {message ? <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold dark:border-slate-800 dark:bg-slate-900">{message}</p> : null}
      </section>

      <section className="admin-surface grid gap-4 p-5 md:grid-cols-3">
        <div><strong className="text-sm">Performance mode</strong><p className="mt-1 text-xs leading-5 text-slate-500">Adaptive DPR, one WebGL canvas and lazy loading keep the product flow responsive.</p></div>
        <div><strong className="text-sm">Mobile fallback</strong><p className="mt-1 text-xs leading-5 text-slate-500">Small screens retain the complete shopping UI without loading the 3D canvas.</p></div>
        <div><strong className="text-sm">Accessibility</strong><p className="mt-1 text-xs leading-5 text-slate-500">Reduced-motion visitors automatically receive static transforms and native scrolling.</p></div>
      </section>

      {previewOpen ? (
        <section className="admin-surface overflow-hidden" aria-label={`${selectedInterface.name} responsive preview`}>
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-slate-800">
            <div>
              <strong className="text-sm">{selectedInterface.name}</strong>
              <p className="text-xs text-slate-500">Live data preview. Publishing is still a separate action.</p>
            </div>
            <div className="flex items-center gap-1" role="group" aria-label="Preview viewport">
              {([
                ["desktop", Monitor, "Desktop"],
                ["tablet", Tablet, "Tablet"],
                ["mobile", Smartphone, "Mobile"]
              ] as const).map(([viewport, Icon, label]) => (
                <button key={viewport} type="button" title={label} aria-label={`${label} preview`} aria-pressed={previewViewport === viewport} onClick={() => setPreviewViewport(viewport)} className={`grid size-10 place-items-center rounded-md transition ${previewViewport === viewport ? "bg-red-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}><Icon size={17} /></button>
              ))}
              <button type="button" title="Close preview" aria-label="Close preview" onClick={() => setPreviewOpen(false)} className="ml-2 grid size-10 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
            </div>
          </header>
          <div className="overflow-auto bg-slate-200 p-3 dark:bg-slate-950 sm:p-5">
            <iframe key={`${selectedInterface.id}-${previewViewport}`} title={`${selectedInterface.name} ${previewViewport} preview`} src={previewHref} className="mx-auto block h-[72vh] max-w-full border-0 bg-white shadow-2xl" style={{ width: previewWidth }} loading="lazy" />
          </div>
        </section>
      ) : null}
    </div>
  );
}
