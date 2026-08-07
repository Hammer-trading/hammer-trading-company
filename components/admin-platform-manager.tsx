"use client";

import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { Archive, ArrowDown, ArrowUp, Check, Copy, Edit3, Eye, EyeOff, ImageIcon, Loader2, PackageCheck, Plus, RefreshCw, Search, Trash2, WandSparkles, X } from "lucide-react";
import { AdminMediaUpload } from "@/components/admin-media-upload";
import { Button } from "@/components/ui/button";
import { money, slugify } from "@/lib/utils";
import { HOMEPAGE_SECTION_PRESETS } from "@/lib/homepage-section-presets";

export type AdminPlatformResource = "services" | "service-categories" | "bookings" | "packages" | "package-categories" | "projects" | "project-categories" | "about" | "media" | "navigation" | "sections";
type Resource = AdminPlatformResource;
type Item = Record<string, unknown> & { id: string };
type FormState = Record<string, unknown>;
type CatalogVariant = { id: string; title: string; sku: string; price?: number | string; stock?: number; options?: Record<string, string> };
type CatalogProduct = { id: string; name: string; sku: string; price?: number | string; stock?: number; variants?: CatalogVariant[] };
type PackageLine = { productId: string; variantId?: string | null; quantity: number; sortOrder: number };
type BookingLine = PackageLine & { unitPrice: number };
type ProjectLine = PackageLine & { note?: string | null };
type ProjectMediaLine = { id?: string; clientKey?: string; mediaAssetId?: string | null; type: "GALLERY" | "BEFORE" | "AFTER" | "VIDEO"; url: string; altText?: string | null; caption?: string | null; posterUrl?: string | null; sortOrder: number };
type ProjectUpdateLine = { id?: string; clientKey?: string; title: string; description?: string | null; progressPercent?: number | null; milestone?: string | null; media: string[]; isPublic: boolean; occurredAt: string; sortOrder: number };
type AboutStat = { value: string; label: string };
type AboutMilestone = { year: string; title: string; description: string };

const resources: Array<{ id: Resource; label: string }> = [
  { id: "services", label: "Services" },
  { id: "service-categories", label: "Service categories" },
  { id: "bookings", label: "Bookings" },
  { id: "packages", label: "Packages" },
  { id: "package-categories", label: "Package categories" },
  { id: "projects", label: "Projects" },
  { id: "project-categories", label: "Project categories" },
  { id: "about", label: "About" },
  { id: "media", label: "Media" },
  { id: "navigation", label: "Navigation" },
  { id: "sections", label: "Homepage" }
];

function defaults(resource: Resource): FormState {
  if (resource.includes("categories")) return { name: "", slug: "", description: "", image: "", sortOrder: 0, isActive: true };
  if (resource === "services") return { name: "", slug: "", categoryId: "", shortDescription: "", description: "", serviceMode: "PRODUCT_INSTALLATION", siteVisitRequired: true, siteVisitFee: 0, laborPricingNote: "", startingPrice: "", fixedPrice: "", coverImage: "", gallery: [], beforeAfter: [], videos: [], estimatedCompletionTime: "", availableDays: [], availableTimeSlots: [], cities: [], areas: [], warrantyInformation: "", includedWork: [], excludedWork: [], requiredMaterials: [], productIds: [], requestQuoteEnabled: true, bookingEnabled: true, whatsappEnabled: true, isFeatured: false, showOnHomepage: false, isActive: true, status: "DRAFT", sortOrder: 0, seoTitle: "", seoDescription: "", imageAlt: "" };
  if (resource === "packages") return { name: "", slug: "", sku: "", categoryId: "", coverImage: "", gallery: [], shortDescription: "", description: "", roomType: "Complete room", tier: "STANDARD", coverageSummary: "", customizationNotes: "", deliveryInformation: "", installationIncluded: false, fixedDiscount: 0, percentageDiscount: 0, badge: "", installationServiceId: "", isFeatured: false, showOnHomepage: false, isActive: true, status: "DRAFT", sortOrder: 0, seoTitle: "", seoDescription: "", imageAlt: "", items: [] };
  if (resource === "projects") return { title: "", slug: "", categoryId: "", serviceId: "", customerOrCompany: "", location: "", shortDescription: "", description: "", progressPercent: 0, isCustomerNamePublic: false, testimonial: "", startDate: "", expectedCompletionDate: "", actualCompletionDate: "", projectStatus: "UPCOMING", status: "DRAFT", isFeatured: false, showOnHomepage: false, coverImage: "", videos: [], seoTitle: "", seoDescription: "", imageAlt: "", sortOrder: 0, productIds: [], productItems: [], media: [], updates: [] };
  if (resource === "about") return { slug: "about", eyebrow: "Hammer Trading Company", heroTitle: "Built for the work that matters", heroSubtitle: "", heroImage: "", heroVideo: "", introTitle: "Hardware, service and field experience", introBody: "", mission: "", vision: "", values: [], serviceAreas: [], stats: [], milestones: [], gallery: [], ctaTitle: "", ctaText: "", ctaLabel: "Explore our services", ctaHref: "/services", status: "DRAFT", seoTitle: "", seoDescription: "" };
  if (resource === "media") return { kind: "IMAGE", name: "", url: "", mimeType: "", sizeBytes: "", altText: "", metadata: {} };
  if (resource === "navigation") return { label: "", href: "/", location: "HEADER", icon: "", parentId: "", sortOrder: 0, isActive: true, desktopVisible: true, mobileVisible: true, openInNewTab: false };
  if (resource === "sections") return { key: "", heading: "", subtitle: "", description: "", backgroundImage: "", backgroundVideo: "", buttonText: "", buttonLink: "", layout: "DEFAULT", configuration: {}, sortOrder: 0, isActive: true, desktopVisible: true, mobileVisible: true, animationEnabled: true, status: "PUBLISHED" };
  return {};
}

function toArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value || "").split(/[,\n]/).map((entry) => entry.trim()).filter(Boolean);
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function bool(value: unknown) {
  return Boolean(value);
}

function responseMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback;
  const payload = data as {
    error?: unknown;
    details?: {
      formErrors?: unknown;
      fieldErrors?: Record<string, unknown>;
    };
  };
  const fieldErrors = Object.entries(payload.details?.fieldErrors || {})
    .flatMap(([field, messages]) => Array.isArray(messages) ? messages.map((message) => `${field}: ${String(message)}`) : [])
    .filter(Boolean);
  const formErrors = Array.isArray(payload.details?.formErrors)
    ? payload.details.formErrors.map(String)
    : [];
  return [...formErrors, ...fieldErrors].join(" ") || text(payload.error) || fallback;
}

function validateForm(resource: Resource, form: FormState) {
  if (resource === "bookings") return "";
  if (resource === "navigation" || resource === "sections" || resource === "media" || resource.includes("categories")) return "";
  if (resource === "about") {
    if (text(form.heroTitle).trim().length < 2) return "Add a clear About hero title.";
    if (text(form.introTitle).trim().length < 2) return "Add an introduction title.";
    if (text(form.introBody).trim().length < 10) return "Add a useful company introduction with at least 10 characters.";
    return "";
  }
  const title = text(resource === "projects" ? form.title : form.name).trim();
  if (title.length < 2) return "Add a name with at least 2 characters.";
  if (text(form.slug).trim().length < 2) return "Add a valid URL slug.";
  if (text(form.description).trim().length < 10) return "Add a useful description with at least 10 characters.";
  if (resource !== "packages") return "";

  if (text(form.sku).trim().length < 2) return "Add a unique package SKU.";
  const lines = Array.isArray(form.items) ? form.items as PackageLine[] : [];
  if (!lines.length) return "Add at least one catalog product to this package.";
  if (lines.some((line) => !line.productId || Number(line.quantity) < 1)) return "Select a product and valid quantity for every package line.";
  const identities = lines.map((line) => `${line.productId}:${line.variantId || "parent"}`);
  if (new Set(identities).size !== identities.length) return "The same product or variant cannot be added twice. Increase its quantity instead.";
  return "";
}

function itemTitle(resource: Resource, item: Item) {
  if (resource === "bookings") return text(item.requestNumber);
  if (resource === "about") return text(item.heroTitle);
  return text(item.name || item.title || item.heading || item.label || item.key);
}

function normalizeItem(resource: Resource, item: Item): FormState {
  if (resource === "bookings") {
    const lines = Array.isArray(item.items) ? item.items as Array<BookingLine & { product?: { id?: string }; variant?: { id?: string } }> : [];
    return {
      ...defaults(resource),
      ...item,
      serviceCharge: Number(item.serviceCharge || 0),
      quotationAmount: item.quotedTotal ?? item.quotationAmount ?? "",
      items: lines.map((line, index) => ({
        productId: line.productId || line.product?.id || "",
        variantId: line.variantId || line.variant?.id || "",
        quantity: Number(line.quantity || 1),
        unitPrice: Number(line.unitPrice || 0),
        sortOrder: Number(line.sortOrder ?? index)
      }))
    };
  }
  if (resource === "services") {
    const products = Array.isArray(item.products) ? item.products as Array<{ productId?: string; product?: { id?: string } }> : [];
    return { ...defaults(resource), ...item, productIds: products.map((entry) => entry.productId || entry.product?.id).filter(Boolean) };
  }
  if (resource === "projects") {
    const products = Array.isArray(item.products) ? item.products as Array<ProjectLine & { product?: { id?: string }; variant?: { id?: string } }> : [];
    return {
      ...defaults(resource),
      ...item,
      productIds: products.map((entry) => entry.productId || entry.product?.id).filter(Boolean),
      productItems: products.map((entry, index) => ({
        productId: entry.productId || entry.product?.id || "",
        variantId: entry.variantId || entry.variant?.id || "",
        quantity: Number(entry.quantity || 1),
        note: entry.note || "",
        sortOrder: Number(entry.sortOrder ?? index)
      })),
      updates: (Array.isArray(item.updates) ? item.updates as ProjectUpdateLine[] : []).map((entry, index) => ({
        ...entry,
        occurredAt: text(entry.occurredAt).slice(0, 16),
        media: Array.isArray(entry.media) ? entry.media.map(String) : [],
        sortOrder: Number(entry.sortOrder ?? index)
      })),
      startDate: text(item.startDate).slice(0, 10),
      expectedCompletionDate: text(item.expectedCompletionDate).slice(0, 10),
      actualCompletionDate: text(item.actualCompletionDate).slice(0, 10)
    };
  }
  if (resource === "about") return {
    ...defaults(resource),
    ...item,
    values: toArray(item.values),
    serviceAreas: toArray(item.serviceAreas),
    stats: Array.isArray(item.stats) ? item.stats : [],
    milestones: Array.isArray(item.milestones) ? item.milestones : [],
    gallery: Array.isArray(item.gallery) ? item.gallery : []
  };
  if (resource === "packages") {
    const lines = Array.isArray(item.items) ? item.items as Array<PackageLine & { product?: { id?: string }; variant?: { id?: string } }> : [];
    return { ...defaults(resource), ...item, items: lines.map((line, index) => ({ productId: line.productId || line.product?.id || "", variantId: line.variantId || line.variant?.id || "", quantity: Number(line.quantity || 1), sortOrder: Number(line.sortOrder ?? index) })) };
  }
  return { ...defaults(resource), ...item };
}

export function AdminPlatformManager({ initialResource = "services" }: { initialResource?: Resource }) {
  const [resource, setResource] = useState<Resource>(initialResource);
  const [items, setItems] = useState<Item[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [lookups, setLookups] = useState<Record<string, Item[]>>({});
  const [query, setQuery] = useState("");
  const [mappingOnly, setMappingOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const apiResource = resource === "bookings" ? "service-bookings" : `platform/${resource}`;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/${apiResource}?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Load failed");
      const rows = Array.isArray(data.items) ? data.items as Item[] : [];
      setItems(rows);
      if (resource === "bookings" && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        const requestedId = url.searchParams.get("id");
        const requested = requestedId ? rows.find((item) => item.id === requestedId) : null;
        if (requested) {
          setEditingId(requested.id);
          setForm(normalizeItem(resource, requested));
          url.searchParams.delete("id");
          window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
        }
      }
    } catch (error) {
      setItems([]);
      setToast(error instanceof Error ? error.message : "Data could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [apiResource, query, resource]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 180); return () => window.clearTimeout(timer); }, [load]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/products?pageSize=100").then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(responseMessage(data, "Product catalog could not be loaded"));
        setCatalog(Array.isArray(data.items) ? data.items : []);
      }),
      ...["service-categories", "package-categories", "project-categories", "services", "navigation"].map(async (key) => {
        const response = await fetch(`/api/admin/platform/${key}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(responseMessage(data, `${key} could not be loaded`));
        setLookups((current) => ({ ...current, [key]: Array.isArray(data.items) ? data.items : [] }));
      })
    ]).catch(() => undefined);
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(defaults(resource));
  }

  function openEdit(item: Item) {
    setEditingId(item.id);
    setForm(normalizeItem(resource, item));
  }

  function duplicate(item: Item) {
    const next = normalizeItem(resource, item);
    const labelKey = resource === "projects" ? "title" : resource === "about" ? "heroTitle" : resource === "sections" ? "heading" : resource === "navigation" ? "label" : "name";
    const newLabel = `${text(next[labelKey])} Copy`;
    next[labelKey] = newLabel;
    if ("slug" in next) next.slug = `${slugify(newLabel)}-${Date.now().toString().slice(-4)}`;
    if ("sku" in next) next.sku = `${text(next.sku)}-COPY-${Date.now().toString().slice(-4)}`;
    if ("key" in next) next.key = `${slugify(text(next.key))}-copy-${Date.now().toString().slice(-4)}`;
    setEditingId(null);
    setForm(next);
  }

  async function initializeHomepageSections() {
    const existing = new Set(items.map((item) => text(item.key)));
    const missing = HOMEPAGE_SECTION_PRESETS.filter((preset) => !existing.has(preset.key));
    if (!missing.length) {
      setToast("All homepage sections are already available.");
      return;
    }
    setSaving(true);
    try {
      for (const preset of missing) {
        const response = await fetch("/api/admin/platform/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...defaults("sections"), ...preset })
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok && response.status !== 409) throw new Error(responseMessage(body, `Could not create ${preset.heading}`));
      }
      setToast(`${missing.length} homepage sections added.`);
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Homepage sections could not be initialized");
    } finally {
      setSaving(false);
    }
  }

  async function updateHomepageSection(item: Item, patch: Record<string, unknown>) {
    const response = await fetch(`/api/admin/platform/sections/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...normalizeItem("sections", item), ...patch })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(responseMessage(body, "Homepage section could not be updated"));
  }

  async function moveHomepageSection(item: Item, direction: -1 | 1) {
    const ordered = [...items].sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0));
    const index = ordered.findIndex((entry) => entry.id === item.id);
    const target = ordered[index + direction];
    if (!target) return;
    setSaving(true);
    try {
      const currentOrder = Number(item.sortOrder || index * 10);
      const targetOrder = Number(target.sortOrder || (index + direction) * 10);
      await Promise.all([
        updateHomepageSection(item, { sortOrder: targetOrder }),
        updateHomepageSection(target, { sortOrder: currentOrder })
      ]);
      setToast("Homepage order updated.");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Homepage order could not be updated");
    } finally {
      setSaving(false);
    }
  }

  async function toggleHomepageSection(item: Item) {
    setSaving(true);
    try {
      await updateHomepageSection(item, { isActive: !bool(item.isActive) });
      setToast(bool(item.isActive) ? "Section hidden from homepage." : "Section published on homepage.");
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Homepage visibility could not be updated");
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!form) return;
    const validationError = validateForm(resource, form);
    if (validationError) {
      setToast(validationError);
      return;
    }
    setSaving(true);
    try {
      const endpoint = resource === "bookings" ? `/api/admin/service-bookings/${editingId}` : `/api/admin/platform/${resource}${editingId ? `/${editingId}` : ""}`;
      const payload = resource === "bookings" && Array.isArray(form.items) && form.items.length === 0
        ? { ...form, items: undefined }
        : form;
      const response = await fetch(endpoint, { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(responseMessage(data, "Save failed"));
      const customerContent = ["services", "packages", "projects", "about"].includes(resource);
      const visible = text(form.status) === "PUBLISHED" && form.isActive !== false;
      setToast(
        customerContent && !visible
          ? `${editingId ? "Changes saved" : "Item created"} as draft. Set Publish status to PUBLISHED and keep Active enabled to show it to customers.`
          : editingId ? "Changes saved" : "Item created"
      );
      setForm(null);
      setEditingId(null);
      await load();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Item) {
    if (resource === "bookings") return;
    if (!window.confirm(`Delete or archive ${itemTitle(resource, item)}?`)) return;
    const response = await fetch(`/api/admin/platform/${resource}/${item.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => ({}));
    setToast(response.ok ? "Item removed" : text(data.error) || "Delete failed");
    if (response.ok) await load();
  }

  const publishedCount = useMemo(() => items.filter((item) => item.status === "PUBLISHED" || item.isActive === true).length, [items]);
  const needsMappingCount = useMemo(() => items.filter((item) => ["NEEDS_MAPPING", "PARTIAL"].includes(text(item.migrationStatus))).length, [items]);
  const visibleItems = useMemo(
    () => resource === "packages" && mappingOnly
      ? items.filter((item) => ["NEEDS_MAPPING", "PARTIAL"].includes(text(item.migrationStatus)))
      : items,
    [items, mappingOnly, resource]
  );

  function selectResource(next: Resource) {
    setResource(next);
    setQuery("");
    setMappingOnly(false);
    setForm(null);
    setEditingId(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      url.searchParams.delete("id");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }

  return (
    <div className="space-y-5">
      <section className="admin-surface overflow-hidden p-0">
        <div className="border-b border-slate-200 p-5 dark:border-white/10">
          <p className="text-xs font-black uppercase text-red-700 dark:text-red-300">Website operations</p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="text-2xl font-black">Content and service control</h2><p className="mt-1 text-sm text-slate-500">Database-backed storefront content, bookings and navigation.</p></div>
            <div className="flex gap-2"><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold dark:bg-white/10">{items.length} total</span><span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{publishedCount} live / active</span></div>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto p-2" data-lenis-prevent>
          {resources.map((entry) => <button key={entry.id} onClick={() => selectResource(entry.id)} className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-bold transition ${resource === entry.id ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"}`}>{entry.label}</button>)}
        </div>
      </section>

      <section className="admin-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-11 min-w-64 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-white/10"><Search size={17} className="text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder={`Search ${resources.find((entry) => entry.id === resource)?.label.toLowerCase()}`} /></label>
          <button onClick={() => void load()} className="grid size-11 place-items-center rounded-lg border border-slate-200 transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/10" aria-label="Refresh"><RefreshCw size={17}/></button>
          {resource === "packages" && needsMappingCount ? <button type="button" aria-pressed={mappingOnly} onClick={() => setMappingOnly((current) => !current)} className={`min-h-11 rounded-lg border px-3 text-xs font-black transition ${mappingOnly ? "border-amber-500 bg-amber-500 text-slate-950" : "border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-500 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"}`}>Needs mapping ({needsMappingCount})</button> : null}
          {resource === "sections" ? <Button variant="outline" disabled={saving} onClick={() => void initializeHomepageSections()}><WandSparkles size={17}/> Add default sections</Button> : null}
          {resource !== "bookings" ? <Button variant="accent" onClick={openCreate}><Plus size={17}/> Add new</Button> : null}
        </div>
      </section>

      <div className="grid gap-3">
        {loading ? <div className="admin-surface grid min-h-48 place-items-center"><Loader2 className="animate-spin text-red-600"/></div> : visibleItems.length ? visibleItems.map((item, index) => <PlatformRow key={item.id} resource={resource} item={item} onEdit={() => openEdit(item)} onDuplicate={() => duplicate(item)} onDelete={() => void remove(item)} onMoveUp={resource === "sections" && index > 0 ? () => void moveHomepageSection(item, -1) : undefined} onMoveDown={resource === "sections" && index < visibleItems.length - 1 ? () => void moveHomepageSection(item, 1) : undefined} onToggle={resource === "sections" ? () => void toggleHomepageSection(item) : undefined} />) : <div className="admin-surface grid min-h-56 place-items-center border-dashed p-8 text-center"><div><Archive className="mx-auto text-slate-400"/><h3 className="mt-3 font-black">{mappingOnly ? "No packages need mapping" : "Nothing here yet"}</h3><p className="mt-1 text-sm text-slate-500">{mappingOnly ? "All migrated package items are connected to catalog products." : "Create the first database-backed item for this section."}</p></div></div>}
      </div>

      {form ? <PlatformModal resource={resource} form={form} setForm={setForm} catalog={catalog} lookups={lookups} saving={saving} editing={Boolean(editingId)} onClose={() => setForm(null)} onSave={() => void save()} /> : null}
      {toast ? <div className="fixed bottom-5 right-5 z-[120] max-w-sm rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl" onAnimationEnd={() => setToast("")}>{toast}<button className="ml-3" onClick={() => setToast("")} aria-label="Close"><X size={14}/></button></div> : null}
    </div>
  );
}

function PlatformRow({ resource, item, onEdit, onDuplicate, onDelete, onMoveUp, onMoveDown, onToggle }: { resource: Resource; item: Item; onEdit: () => void; onDuplicate: () => void; onDelete: () => void; onMoveUp?: () => void; onMoveDown?: () => void; onToggle?: () => void }) {
  const status = text(item.status || item.projectStatus || (item.isActive ? "ACTIVE" : "INACTIVE"));
  const subtitle = resource === "bookings"
    ? `${text((item.service as { name?: string } | undefined)?.name)} · ${text(item.customerName)} · ${text(item.phone)}`
    : resource === "packages"
      ? `${text(item.sku)} · ${money(text(item.finalPrice || 0))}`
      : text(item.shortDescription || item.description || item.href || item.url || item.slug);
  return <article className="admin-surface flex flex-wrap items-center gap-4 p-4">
    <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">{resource === "media" ? <ImageIcon size={19}/> : <Check size={19}/>}</div>
    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-black">{itemTitle(resource, item)}</h3><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600 dark:bg-white/10 dark:text-slate-300">{status || "READY"}</span>{item.migrationStatus ? <span className={`rounded-md px-2 py-1 text-[10px] font-black uppercase ${item.migrationStatus === "MAPPED" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"}`}>{text(item.migrationStatus).replaceAll("_", " ")}</span> : null}</div><p className="mt-1 truncate text-sm text-slate-500">{subtitle || "No description"}</p></div>
    <div className="flex gap-1">{resource === "sections" ? <><button disabled={!onMoveUp} onClick={onMoveUp} className="grid size-10 place-items-center rounded-lg border border-slate-200 disabled:opacity-30 dark:border-white/10" aria-label="Move section up"><ArrowUp size={17}/></button><button disabled={!onMoveDown} onClick={onMoveDown} className="grid size-10 place-items-center rounded-lg border border-slate-200 disabled:opacity-30 dark:border-white/10" aria-label="Move section down"><ArrowDown size={17}/></button><button onClick={onToggle} className="grid size-10 place-items-center rounded-lg border border-slate-200 dark:border-white/10" aria-label={bool(item.isActive) ? "Hide section" : "Show section"}>{bool(item.isActive) ? <Eye size={17}/> : <EyeOff size={17}/>}</button></> : null}<button onClick={onEdit} className="grid size-10 place-items-center rounded-lg border border-slate-200 transition hover:border-red-200 hover:text-red-700 dark:border-white/10" aria-label="Edit"><Edit3 size={17}/></button>{resource !== "bookings" ? <><button onClick={onDuplicate} className="grid size-10 place-items-center rounded-lg border border-slate-200 transition hover:border-red-200 hover:text-red-700 dark:border-white/10" aria-label="Duplicate"><Copy size={17}/></button><button onClick={onDelete} className="grid size-10 place-items-center rounded-lg border border-slate-200 text-red-600 transition hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-950/30" aria-label="Delete"><Trash2 size={17}/></button></> : null}</div>
  </article>;
}

function PlatformModal({ resource, form, setForm, catalog, lookups, saving, editing, onClose, onSave }: { resource: Resource; form: FormState; setForm: Dispatch<SetStateAction<FormState | null>>; catalog: CatalogProduct[]; lookups: Record<string, Item[]>; saving: boolean; editing: boolean; onClose: () => void; onSave: () => void }) {
  const update = (key: string, value: unknown) => setForm((current) => current ? { ...current, [key]: value } : current);
  return <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/55 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${editing ? "Edit" : "Create"} ${resource}`}>
    <div className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-slate-950" data-lenis-prevent>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"><div><p className="text-xs font-black uppercase text-red-700 dark:text-red-300">{resources.find((entry) => entry.id === resource)?.label}</p><h2 className="text-xl font-black">{editing ? "Edit item" : "Create item"}</h2></div><button onClick={onClose} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Close"><X size={19}/></button></div>
      <div className="p-5"><PlatformFields resource={resource} form={form} update={update} catalog={catalog} lookups={lookups}/></div>
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-slate-950/95"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="accent" disabled={saving} onClick={onSave}>{saving ? <Loader2 size={17} className="animate-spin"/> : <Check size={17}/>} {saving ? "Saving..." : "Save"}</Button></div>
    </div>
  </div>;
}

function PlatformFields({ resource, form, update, catalog, lookups }: { resource: Resource; form: FormState; update: (key: string, value: unknown) => void; catalog: CatalogProduct[]; lookups: Record<string, Item[]> }) {
  if (String(resource) === "bookings") return <BookingFields form={form} update={update} catalog={catalog}/>;
  if (resource.includes("categories")) return <div className="grid gap-4 md:grid-cols-2"><Field label="Name" value={form.name} onChange={(value) => { update("name", value); if (!text(form.slug)) update("slug", slugify(value)); }}/><Field label="Slug" value={form.slug} onChange={(value) => update("slug", slugify(value))}/><Area label="Description" value={form.description} onChange={(value) => update("description", value)}/>{resource !== "project-categories" ? <Field label="Image URL" value={form.image} onChange={(value) => update("image", value)}/> : null}<Field label="Sort order" type="number" value={form.sortOrder} onChange={(value) => update("sortOrder", Number(value))}/><Toggle label="Active" checked={bool(form.isActive)} onChange={(value) => update("isActive", value)}/></div>;
  if (resource === "media") return <div className="grid gap-4 md:grid-cols-2"><Select label="Media type" value={form.kind} options={["IMAGE","VIDEO","PDF","DOCUMENT"]} onChange={(value) => update("kind", value)}/><Field label="Name" value={form.name} onChange={(value) => update("name", value)}/><div className="md:col-span-2"><AdminMediaUpload label="Upload to Vercel Blob" value={text(form.url)} altText={text(form.altText)} preferredKind={form.kind === "VIDEO" ? "VIDEO" : form.kind === "IMAGE" ? "IMAGE" : undefined} onChange={(url, asset) => { update("url", url); if (asset) { update("kind", asset.kind); update("name", asset.name); update("mimeType", asset.mimeType || ""); update("sizeBytes", asset.sizeBytes || 0); update("altText", asset.altText || ""); } }}/></div><Field label="Media URL" value={form.url} onChange={(value) => update("url", value)}/><Field label="Alt text" value={form.altText} onChange={(value) => update("altText", value)}/><Field label="MIME type" value={form.mimeType} onChange={(value) => update("mimeType", value)}/><Field label="Size in bytes" type="number" value={form.sizeBytes} onChange={(value) => update("sizeBytes", value ? Number(value) : null)}/></div>;
  if (resource === "navigation") return <div className="grid gap-4 md:grid-cols-2"><Field label="Label" value={form.label} onChange={(value) => update("label", value)}/><Field label="Link" value={form.href} onChange={(value) => update("href", value)}/><Select label="Location" value={form.location} options={["HEADER","FOOTER_SHOP","FOOTER_HELP","FOOTER_LEGAL"]} onChange={(value) => update("location", value)}/><Lookup label="Parent item" value={form.parentId} items={lookups.navigation || []} onChange={(value) => update("parentId", value)}/><Field label="Icon name" value={form.icon} onChange={(value) => update("icon", value)}/><Field label="Sort order" type="number" value={form.sortOrder} onChange={(value) => update("sortOrder", Number(value))}/><Toggle label="Active" checked={bool(form.isActive)} onChange={(value) => update("isActive", value)}/><Toggle label="Desktop" checked={bool(form.desktopVisible)} onChange={(value) => update("desktopVisible", value)}/><Toggle label="Mobile" checked={bool(form.mobileVisible)} onChange={(value) => update("mobileVisible", value)}/><Toggle label="Open in new tab" checked={bool(form.openInNewTab)} onChange={(value) => update("openInNewTab", value)}/></div>;
  if (resource === "sections") return <div className="grid gap-4 md:grid-cols-2"><Field label="Unique key" value={form.key} onChange={(value) => update("key", slugify(value))}/><Field label="Heading" value={form.heading} onChange={(value) => update("heading", value)}/><Field label="Subtitle" value={form.subtitle} onChange={(value) => update("subtitle", value)}/><Select label="Layout" value={form.layout} options={["DEFAULT","GRID","CAROUSEL","EDITORIAL","SPLIT"]} onChange={(value) => update("layout", value)}/><Area label="Description" value={form.description} onChange={(value) => update("description", value)}/><Field label="Background image" value={form.backgroundImage} onChange={(value) => update("backgroundImage", value)}/><Field label="Background video" value={form.backgroundVideo} onChange={(value) => update("backgroundVideo", value)}/><Field label="Button text" value={form.buttonText} onChange={(value) => update("buttonText", value)}/><Field label="Button link" value={form.buttonLink} onChange={(value) => update("buttonLink", value)}/><Field label="Sort order" type="number" value={form.sortOrder} onChange={(value) => update("sortOrder", Number(value))}/><StatusFields form={form} update={update}/><Toggle label="Desktop" checked={bool(form.desktopVisible)} onChange={(value) => update("desktopVisible", value)}/><Toggle label="Mobile" checked={bool(form.mobileVisible)} onChange={(value) => update("mobileVisible", value)}/><Toggle label="Animation" checked={bool(form.animationEnabled)} onChange={(value) => update("animationEnabled", value)}/></div>;
  if (resource === "about") return <AboutFields form={form} update={update}/>;

  const titleKey = resource === "projects" ? "title" : "name";
  const categoryKey = resource === "services" ? "service-categories" : resource === "packages" ? "package-categories" : "project-categories";
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2"><Field label={resource === "projects" ? "Project title" : "Name"} value={form[titleKey]} onChange={(value) => { update(titleKey, value); if (!text(form.slug)) update("slug", slugify(value)); if (resource === "packages" && !text(form.sku)) update("sku", `PKG-${slugify(value).replaceAll("-", "_").toUpperCase()}`); }}/><Field label="Slug" value={form.slug} onChange={(value) => update("slug", slugify(value))}/>{resource === "packages" ? <Field label="SKU" value={form.sku} onChange={(value) => update("sku", value.toUpperCase())}/> : null}<Lookup label="Category" value={form.categoryId} items={lookups[categoryKey] || []} onChange={(value) => update("categoryId", value)}/><div className="md:col-span-2"><AdminMediaUpload label="Cover image" value={text(form.coverImage)} altText={text(form.imageAlt)} preferredKind="IMAGE" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(url) => update("coverImage", url)}/><Field label="Cover image URL" value={form.coverImage} onChange={(value) => update("coverImage", value)}/></div>{resource === "projects" ? <><Field label="Location" value={form.location} onChange={(value) => update("location", value)}/><Field label="Customer / company" value={form.customerOrCompany} onChange={(value) => update("customerOrCompany", value)}/><Select label="Project status" value={form.projectStatus} options={["UPCOMING","ONGOING","COMPLETED","ON_HOLD","CANCELLED"]} onChange={(value) => update("projectStatus", value)}/></> : null}{resource === "services" ? <><Field label="Starting price" type="number" value={form.startingPrice} onChange={(value) => update("startingPrice", value ? Number(value) : null)}/><Field label="Fixed price" type="number" value={form.fixedPrice} onChange={(value) => update("fixedPrice", value ? Number(value) : null)}/><Field label="Estimated completion" value={form.estimatedCompletionTime} onChange={(value) => update("estimatedCompletionTime", value)}/></> : null}{resource === "packages" ? <><Field label="Fixed discount" type="number" value={form.fixedDiscount} onChange={(value) => update("fixedDiscount", Number(value))}/><Field label="Percentage discount" type="number" value={form.percentageDiscount} onChange={(value) => update("percentageDiscount", Number(value))}/><Field label="Badge" value={form.badge} onChange={(value) => update("badge", value)}/><Lookup label="Installation service (shows package on its service page)" value={form.installationServiceId} items={lookups.services || []} onChange={(value) => update("installationServiceId", value)}/></> : null}<Field label="Short description" value={form.shortDescription} onChange={(value) => update("shortDescription", value)}/><Area label="Full description" value={form.description} onChange={(value) => update("description", value)}/></div>
    {resource === "projects" ? <div className="grid gap-4 md:grid-cols-2"><Lookup label="Linked service" value={form.serviceId} items={lookups.services || []} onChange={(value) => update("serviceId", value)}/><Field label="Progress %" type="number" value={form.progressPercent} onChange={(value) => update("progressPercent", Number(value))}/><Field label="Start date" type="date" value={form.startDate} onChange={(value) => update("startDate", value)}/><Field label="Expected completion" type="date" value={form.expectedCompletionDate} onChange={(value) => update("expectedCompletionDate", value)}/><Field label="Actual completion" type="date" value={form.actualCompletionDate} onChange={(value) => update("actualCompletionDate", value)}/><Toggle label="Show customer/company publicly" checked={bool(form.isCustomerNamePublic)} onChange={(value) => update("isCustomerNamePublic", value)}/><Area label="Customer testimonial" value={form.testimonial} onChange={(value) => update("testimonial", value)}/></div> : null}
    {resource === "services" ? <div className="grid gap-4 md:grid-cols-2"><Select label="Service mode" value={form.serviceMode} options={["PRODUCT_INSTALLATION","INSTALLATION_ONLY","INSPECTION_REPAIR"]} onChange={(value) => update("serviceMode", value)}/><Toggle label="Site visit required" checked={bool(form.siteVisitRequired)} onChange={(value) => update("siteVisitRequired", value)}/><Field label="Site visit fee" type="number" value={form.siteVisitFee} onChange={(value) => update("siteVisitFee", Number(value))}/><Area label="Labour pricing note" value={form.laborPricingNote} onChange={(value) => update("laborPricingNote", value)}/><ListField label="Available days" value={form.availableDays} onChange={(value) => update("availableDays", value)}/><ListField label="Time slots" value={form.availableTimeSlots} onChange={(value) => update("availableTimeSlots", value)}/><ListField label="Cities" value={form.cities} onChange={(value) => update("cities", value)}/><ListField label="Areas" value={form.areas} onChange={(value) => update("areas", value)}/><ListField label="Included work" value={form.includedWork} onChange={(value) => update("includedWork", value)}/><ListField label="Excluded work" value={form.excludedWork} onChange={(value) => update("excludedWork", value)}/><ListField label="Required materials" value={form.requiredMaterials} onChange={(value) => update("requiredMaterials", value)}/><Area label="Warranty information" value={form.warrantyInformation} onChange={(value) => update("warrantyInformation", value)}/></div> : null}
    {resource === "packages" ? <div className="grid gap-4 rounded-lg border border-slate-200 p-4 md:grid-cols-2 dark:border-white/10"><div className="md:col-span-2"><h3 className="font-black">Supply-only room bundle</h3><p className="mt-1 text-xs text-slate-500">This package supplies products as one bundle. Installation is booked separately through the optional linked service.</p></div><Field label="Room type" value={form.roomType} onChange={(value) => update("roomType", value)}/><Select label="Package tier" value={form.tier} options={["ESSENTIAL","STANDARD","PREMIUM","CUSTOM"]} onChange={(value) => update("tier", value)}/><Area label="What this bundle covers" value={form.coverageSummary} onChange={(value) => update("coverageSummary", value)}/><Area label="Customization notes" value={form.customizationNotes} onChange={(value) => update("customizationNotes", value)}/><Area label="Delivery information" value={form.deliveryInformation} onChange={(value) => update("deliveryInformation", value)}/></div> : null}
    {resource === "packages" && form.legacyRoomPackageId ? <LegacyMappingSummary status={text(form.migrationStatus)} items={form.legacyItems}/> : null}
    {resource === "services" ? <ProductLinks value={Array.isArray(form.productIds) ? form.productIds.map(String) : []} catalog={catalog} onChange={(value) => update("productIds", value)}/> : null}
    {resource === "packages" ? <PackageItems value={(form.items as PackageLine[]) || []} catalog={catalog} onChange={(value) => update("items", value)}/> : null}
    {resource === "projects" ? <><ProjectUpdateEditor value={(form.updates as ProjectUpdateLine[]) || []} onChange={(value) => update("updates", value)}/><ProjectMediaEditor value={(form.media as ProjectMediaLine[]) || []} coverImage={text(form.coverImage)} onCoverChange={(value) => update("coverImage", value)} onChange={(value) => update("media", value)}/><ProjectItems value={(form.productItems as ProjectLine[]) || []} catalog={catalog} onChange={(value) => { update("productItems", value); update("productIds", value.map((entry) => entry.productId)); }}/></> : null}
    <div className="grid gap-4 md:grid-cols-2"><Field label="SEO title" value={form.seoTitle} onChange={(value) => update("seoTitle", value)}/><Field label="SEO description" value={form.seoDescription} onChange={(value) => update("seoDescription", value)}/><Field label="Image alt text" value={form.imageAlt} onChange={(value) => update("imageAlt", value)}/><Field label="Sort order" type="number" value={form.sortOrder} onChange={(value) => update("sortOrder", Number(value))}/><StatusFields form={form} update={update}/>{resource === "services" ? <><Toggle label="Bookings" checked={bool(form.bookingEnabled)} onChange={(value) => update("bookingEnabled", value)}/><Toggle label="Quote requests" checked={bool(form.requestQuoteEnabled)} onChange={(value) => update("requestQuoteEnabled", value)}/><Toggle label="WhatsApp" checked={bool(form.whatsappEnabled)} onChange={(value) => update("whatsappEnabled", value)}/></> : null}</div>
  </div>;
}

function AboutFields({ form, update }: { form: FormState; update: (key: string, value: unknown) => void }) {
  const stats = Array.isArray(form.stats) ? form.stats as AboutStat[] : [];
  const milestones = Array.isArray(form.milestones) ? form.milestones as AboutMilestone[] : [];
  const gallery = toArray(form.gallery);
  return <div className="space-y-6">
    <section className="grid gap-4 md:grid-cols-2">
      <Field label="Page slug" value={form.slug} onChange={(value) => update("slug", slugify(value))}/>
      <Field label="Eyebrow" value={form.eyebrow} onChange={(value) => update("eyebrow", value)}/>
      <Field label="Hero title" value={form.heroTitle} onChange={(value) => update("heroTitle", value)}/>
      <Field label="Hero subtitle" value={form.heroSubtitle} onChange={(value) => update("heroSubtitle", value)}/>
      <div className="md:col-span-2"><AdminMediaUpload label="About hero image" value={text(form.heroImage)} preferredKind="IMAGE" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(url) => update("heroImage", url)}/></div>
      <Field label="Hero image URL" value={form.heroImage} onChange={(value) => update("heroImage", value)}/>
      <Field label="Optional hero video URL" value={form.heroVideo} onChange={(value) => update("heroVideo", value)}/>
    </section>
    <section className="grid gap-4 md:grid-cols-2">
      <Field label="Introduction title" value={form.introTitle} onChange={(value) => update("introTitle", value)}/>
      <Area label="Introduction" value={form.introBody} onChange={(value) => update("introBody", value)}/>
      <Area label="Mission" value={form.mission} onChange={(value) => update("mission", value)}/>
      <Area label="Vision" value={form.vision} onChange={(value) => update("vision", value)}/>
      <ListField label="Company values" value={form.values} onChange={(value) => update("values", value)}/>
      <ListField label="Service areas" value={form.serviceAreas} onChange={(value) => update("serviceAreas", value)}/>
    </section>
    <AboutStatsEditor value={stats} onChange={(value) => update("stats", value)}/>
    <AboutMilestonesEditor value={milestones} onChange={(value) => update("milestones", value)}/>
    <section className="space-y-3">
      <div><h3 className="font-black">Company gallery</h3><p className="text-xs text-slate-500">Upload workshop, team and completed-work images. They appear in the same order below.</p></div>
      <AdminMediaUpload label="Add gallery image" value="" preferredKind="IMAGE" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(url) => { if (url && !gallery.includes(url)) update("gallery", [...gallery, url]); }}/>
      <div className="grid gap-2">{gallery.map((url, index) => <div key={`${url}-${index}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-white/10"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-black dark:bg-white/10">{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs text-slate-500">{url}</span><button type="button" onClick={() => update("gallery", gallery.filter((_, entryIndex) => entryIndex !== index))} className="grid size-9 place-items-center rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Remove gallery image ${index + 1}`}><Trash2 size={16}/></button></div>)}</div>
    </section>
    <section className="grid gap-4 md:grid-cols-2">
      <Field label="CTA title" value={form.ctaTitle} onChange={(value) => update("ctaTitle", value)}/>
      <Field label="CTA button label" value={form.ctaLabel} onChange={(value) => update("ctaLabel", value)}/>
      <Area label="CTA text" value={form.ctaText} onChange={(value) => update("ctaText", value)}/>
      <Field label="CTA link" value={form.ctaHref} onChange={(value) => update("ctaHref", value)}/>
      <Field label="SEO title" value={form.seoTitle} onChange={(value) => update("seoTitle", value)}/>
      <Field label="SEO description" value={form.seoDescription} onChange={(value) => update("seoDescription", value)}/>
      <Select label="Publish status" value={form.status} options={["DRAFT","PUBLISHED","ARCHIVED"]} onChange={(value) => update("status", value)}/>
    </section>
  </div>;
}

function AboutStatsEditor({ value, onChange }: { value: AboutStat[]; onChange: (value: AboutStat[]) => void }) {
  return <section><div className="flex items-center justify-between gap-3"><div><h3 className="font-black">Company statistics</h3><p className="text-xs text-slate-500">Short factual numbers shown on the public About page.</p></div><Button type="button" variant="outline" onClick={() => onChange([...value, { value: "", label: "" }])}><Plus size={16}/> Add stat</Button></div><div className="mt-3 grid gap-2">{value.map((entry, index) => <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[160px_1fr_44px] dark:border-white/10"><input aria-label={`Statistic value ${index + 1}`} className="admin-input" placeholder="25+" value={entry.value} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item))}/><input aria-label={`Statistic label ${index + 1}`} className="admin-input" placeholder="Years of experience" value={entry.label} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))}/><button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Remove statistic ${index + 1}`}><Trash2 size={17}/></button></div>)}</div></section>;
}

function AboutMilestonesEditor({ value, onChange }: { value: AboutMilestone[]; onChange: (value: AboutMilestone[]) => void }) {
  return <section><div className="flex items-center justify-between gap-3"><div><h3 className="font-black">Company timeline</h3><p className="text-xs text-slate-500">Add important milestones in chronological order.</p></div><Button type="button" variant="outline" onClick={() => onChange([...value, { year: "", title: "", description: "" }])}><Plus size={16}/> Add milestone</Button></div><div className="mt-3 grid gap-2">{value.map((entry, index) => <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 lg:grid-cols-[110px_1fr_1.5fr_44px] dark:border-white/10"><input aria-label={`Milestone year ${index + 1}`} className="admin-input" placeholder="2018" value={entry.year} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, year: event.target.value } : item))}/><input aria-label={`Milestone title ${index + 1}`} className="admin-input" placeholder="Milestone title" value={entry.title} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))}/><input aria-label={`Milestone description ${index + 1}`} className="admin-input" placeholder="What happened" value={entry.description} onChange={(event) => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))}/><button type="button" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Remove milestone ${index + 1}`}><Trash2 size={17}/></button></div>)}</div></section>;
}

function ProjectUpdateEditor({ value, onChange }: { value: ProjectUpdateLine[]; onChange: (value: ProjectUpdateLine[]) => void }) {
  function update(index: number, patch: Partial<ProjectUpdateLine>) { onChange(value.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry)); }
  return <section><div className="flex items-center justify-between gap-3"><div><h3 className="font-black">Public project progress</h3><p className="text-xs text-slate-500">Timeline updates make upcoming, ongoing and completed work clear on the customer page.</p></div><Button type="button" variant="outline" onClick={() => onChange([...value, { clientKey: crypto.randomUUID(), title: "", description: "", progressPercent: null, milestone: "", media: [], isPublic: true, occurredAt: new Date().toISOString().slice(0, 16), sortOrder: value.length }])}><Plus size={16}/> Add update</Button></div><div className="mt-3 grid gap-3">{value.map((entry, index) => <div key={entry.id || entry.clientKey || index} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-2 dark:border-white/10"><Field label="Update title" value={entry.title} onChange={(title) => update(index, { title })}/><Field label="Milestone" value={entry.milestone} onChange={(milestone) => update(index, { milestone })}/><Field label="Progress %" type="number" value={entry.progressPercent ?? ""} onChange={(progressPercent) => update(index, { progressPercent: progressPercent === "" ? null : Number(progressPercent) })}/><Field label="Update date" type="datetime-local" value={entry.occurredAt} onChange={(occurredAt) => update(index, { occurredAt })}/><Area label="Description" value={entry.description} onChange={(description) => update(index, { description })}/><ListField label="Image/video URLs" value={entry.media} onChange={(media) => update(index, { media })}/><Toggle label="Visible to customers" checked={entry.isPublic} onChange={(isPublic) => update(index, { isPublic })}/><button type="button" onClick={() => onChange(value.filter((_, entryIndex) => entryIndex !== index))} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-700 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"><Trash2 size={17}/> Remove update</button></div>)}</div></section>;
}

function BookingFields({ form, update, catalog }: { form: FormState; update: (key: string, value: unknown) => void; catalog: CatalogProduct[] }) {
  const [converting, setConverting] = useState(false);
  const [conversion, setConversion] = useState("");
  const lines = Array.isArray(form.items) ? form.items as BookingLine[] : [];
  const serviceCharge = Number(form.serviceCharge || 0);
  const materialSubtotal = lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || 0), 0);
  const total = materialSubtotal + serviceCharge;
  const convertedOrder = form.convertedOrder && typeof form.convertedOrder === "object" ? form.convertedOrder as Record<string, unknown> : null;

  function changeLine(index: number, patch: Partial<BookingLine>) {
    update("items", lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  async function convert() {
    const id = text(form.id);
    if (!id || text(form.status) !== "APPROVED") return;
    if (!window.confirm("Convert this approved service quotation into an order and deduct stock?")) return;
    setConverting(true);
    setConversion("");
    try {
      const response = await fetch(`/api/admin/service-bookings/${id}/convert`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Conversion failed");
      setConversion(`Order ${body.orderNumber} created`);
    } catch (error) {
      setConversion(error instanceof Error ? error.message : "Conversion failed");
    } finally {
      setConverting(false);
    }
  }

  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2"><ReadOnly label="Request" value={form.requestNumber}/><ReadOnly label="Customer" value={`${text(form.customerName)} · ${text(form.phone)}`}/><ReadOnly label="Service" value={text((form.service as Record<string, unknown> | undefined)?.name)}/><ReadOnly label="Package" value={text((form.package as Record<string, unknown> | undefined)?.name) || "Custom quotation"}/><Select label="Status" value={form.status} options={["NEW","CONTACTED","INSPECTION_REQUIRED","QUOTATION_SENT","APPROVED","SCHEDULED","IN_PROGRESS","COMPLETED","CANCELLED"]} onChange={(value) => update("status", value)}/><Field label="Service charge" type="number" value={serviceCharge} onChange={(value) => update("serviceCharge", Number(value || 0))}/><Area label="Internal note" value={form.internalNote} onChange={(value) => update("internalNote", value)}/><ReadOnly label="Address" value={`${text(form.address)}, ${text(form.city)}`}/></div><section><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Quotation products</h3><p className="text-xs text-slate-500">Save product changes before converting the approved quotation.</p></div><Button type="button" variant="outline" onClick={() => update("items", [...lines, { productId: catalog[0]?.id || "", variantId: "", quantity: 1, unitPrice: Number(catalog[0]?.price || 0), sortOrder: lines.length }])}><Plus size={16}/> Add product</Button></div><div className="mt-3 grid gap-2">{lines.map((line, index) => { const product = catalog.find((entry) => entry.id === line.productId); const variant = product?.variants?.find((entry) => entry.id === line.variantId); const stock = Number(variant?.stock ?? product?.stock ?? 0); return <div key={`${line.productId}-${line.variantId}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_90px_120px_44px] dark:border-white/10"><select className="admin-input" value={line.productId} onChange={(event) => { const next = catalog.find((entry) => entry.id === event.target.value); changeLine(index, { productId: event.target.value, variantId: "", unitPrice: Number(next?.price || 0) }); }}><option value="">Select product</option>{catalog.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.sku}</option>)}</select><select className="admin-input" value={line.variantId || ""} onChange={(event) => { const next = product?.variants?.find((entry) => entry.id === event.target.value); changeLine(index, { variantId: event.target.value, unitPrice: Number(next?.price ?? product?.price ?? 0) }); }}><option value="">Parent product</option>{product?.variants?.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {entry.sku}</option>)}</select><input aria-label="Quantity" type="number" min={1} className="admin-input" value={line.quantity} onChange={(event) => changeLine(index, { quantity: Number(event.target.value) })}/><input aria-label="Quoted unit price" type="number" min={0} className="admin-input" value={line.unitPrice} onChange={(event) => changeLine(index, { unitPrice: Number(event.target.value) })}/><button type="button" onClick={() => update("items", lines.filter((_, lineIndex) => lineIndex !== index))} className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label="Remove quotation product"><Trash2 size={17}/></button><div className="text-xs font-bold text-slate-500 lg:col-span-5">{variant?.sku || product?.sku || "No product"} · <span className={stock >= Number(line.quantity) ? "text-emerald-700" : "text-red-700"}>{stock} in stock</span> · {money(Number(line.unitPrice) * Number(line.quantity))}</div></div>; })}{!lines.length ? <p className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">Add products before sending a quotation.</p> : null}</div></section><div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-slate-950 p-4 text-white"><div className="grid grid-cols-3 gap-5 text-xs"><span>Materials<strong className="mt-1 block text-base">{money(materialSubtotal)}</strong></span><span>Service<strong className="mt-1 block text-base">{money(serviceCharge)}</strong></span><span>Total<strong className="mt-1 block text-base text-red-300">{money(total)}</strong></span></div>{convertedOrder ? <a href={`/admin/orders?order=${text(convertedOrder.orderNumber)}`} className="rounded-md bg-emerald-600 px-4 py-3 text-sm font-black">Open {text(convertedOrder.orderNumber)}</a> : <Button type="button" variant="accent" disabled={converting || text(form.status) !== "APPROVED" || !lines.length} onClick={() => void convert()}>{converting ? <Loader2 size={17} className="animate-spin"/> : <Check size={17}/>} Convert to order</Button>}</div>{conversion ? <p role="status" className={`rounded-md px-3 py-2 text-sm font-bold ${conversion.startsWith("Order") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{conversion}</p> : null}</div>;
}

function ProductLinks({ value, catalog, onChange }: { value: string[]; catalog: CatalogProduct[]; onChange: (value: string[]) => void }) {
  const [query, setQuery] = useState("");
  const selected = value.map((id) => catalog.find((product) => product.id === id)).filter((product): product is CatalogProduct => Boolean(product));
  const normalizedQuery = query.trim().toLowerCase();
  const available = catalog.filter((product) => !value.includes(product.id) && `${product.name} ${product.sku}`.toLowerCase().includes(normalizedQuery));

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return <section className="space-y-3">
    <div><h3 className="font-black">Recommended service products</h3><p className="text-xs text-slate-500">Search, attach and order the products shown on the customer service page. Exact quantities belong in a linked package or booking quotation.</p></div>
    {selected.length ? <div className="grid gap-2">{selected.map((product, index) => <div key={product.id} className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/70 p-3 dark:border-red-900/50 dark:bg-red-950/20"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-red-700 text-xs font-black text-white">{index + 1}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{product.name}</strong><span className="font-mono text-xs text-slate-500">{product.sku}</span></span><button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="grid size-9 place-items-center rounded-md hover:bg-white disabled:opacity-30 dark:hover:bg-white/10" aria-label={`Move ${product.name} up`}><ArrowUp size={16}/></button><button type="button" disabled={index === selected.length - 1} onClick={() => move(index, 1)} className="grid size-9 place-items-center rounded-md hover:bg-white disabled:opacity-30 dark:hover:bg-white/10" aria-label={`Move ${product.name} down`}><ArrowDown size={16}/></button><button type="button" onClick={() => onChange(value.filter((id) => id !== product.id))} className="grid size-9 place-items-center rounded-md text-red-700 hover:bg-white dark:hover:bg-white/10" aria-label={`Remove ${product.name}`}><Trash2 size={16}/></button></div>)}</div> : <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">No recommended products attached.</p>}
    <label className="relative block"><span className="sr-only">Search products to attach</span><Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-slate-400"/><input className="admin-input w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or SKU to attach"/></label>
    <div className="grid max-h-64 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-2 dark:border-white/10" data-lenis-prevent>{available.map((product) => <button type="button" key={product.id} onClick={() => onChange([...value, product.id])} className="flex items-center gap-3 rounded-md border border-slate-200 p-3 text-left text-sm transition hover:border-red-300 hover:bg-red-50 dark:border-white/10 dark:hover:bg-red-950/20"><Plus size={16} className="shrink-0 text-red-700"/><span className="min-w-0"><strong className="block truncate">{product.name}</strong><span className="font-mono text-xs text-slate-500">{product.sku}</span></span></button>)}{!available.length ? <p className="p-3 text-sm text-slate-500">No matching products available.</p> : null}</div>
  </section>;
}

function ProjectMediaEditor({ value, coverImage, onCoverChange, onChange }: { value: ProjectMediaLine[]; coverImage: string; onCoverChange: (value: string) => void; onChange: (value: ProjectMediaLine[]) => void }) {
  function update(index: number, patch: Partial<ProjectMediaLine>) {
    onChange(value.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry));
  }
  function add(type: ProjectMediaLine["type"]) {
    onChange([...value, { clientKey: crypto.randomUUID(), type, url: "", altText: "", caption: "", posterUrl: "", sortOrder: value.length }]);
  }
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((entry, sortOrder) => ({ ...entry, sortOrder })));
  }
  return <section><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-black">Project media</h3><p className="text-xs text-slate-500">Upload, reorder, caption and choose the cover for gallery, before/after and video assets.</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => add("GALLERY")}><ImageIcon size={16}/> Add image</Button><Button type="button" variant="outline" onClick={() => add("VIDEO")}><Plus size={16}/> Add video</Button></div></div><div className="mt-3 grid gap-3">{value.map((entry, index) => { const isCover = Boolean(entry.url && entry.url === coverImage); return <div key={entry.id || entry.mediaAssetId || entry.clientKey || entry.url} className={`grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)_44px] ${isCover ? "border-red-400 bg-red-50/40 dark:border-red-700 dark:bg-red-950/10" : "border-slate-200 dark:border-white/10"}`}><AdminMediaUpload label={`Media ${index + 1}`} value={entry.url} altText={entry.altText} preferredKind={entry.type === "VIDEO" ? "VIDEO" : "IMAGE"} accept={entry.type === "VIDEO" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"} onChange={(url, asset) => update(index, { url, mediaAssetId: asset?.id || entry.mediaAssetId || null })}/><div className="grid content-start gap-3 sm:grid-cols-2"><Select label="Media role" value={entry.type} options={["GALLERY","BEFORE","AFTER","VIDEO"]} onChange={(type) => update(index, { type: type as ProjectMediaLine["type"] })}/><Field label="Sort order" type="number" value={entry.sortOrder} onChange={(sortOrder) => update(index, { sortOrder: Number(sortOrder) })}/><Field label="Alt text" value={entry.altText} onChange={(altText) => update(index, { altText })}/><Field label="Caption" value={entry.caption} onChange={(caption) => update(index, { caption })}/>{entry.type === "VIDEO" ? <Field label="Poster URL" value={entry.posterUrl} onChange={(posterUrl) => update(index, { posterUrl })}/> : entry.url ? <Button type="button" variant={isCover ? "primary" : "outline"} onClick={() => onCoverChange(entry.url)}>{isCover ? <Check size={16}/> : <ImageIcon size={16}/>} {isCover ? "Project cover" : "Use as cover"}</Button> : null}</div><div className="flex flex-row gap-1 lg:flex-col"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="grid size-11 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10" aria-label={`Move media ${index + 1} up`}><ArrowUp size={17}/></button><button type="button" disabled={index === value.length - 1} onClick={() => move(index, 1)} className="grid size-11 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10" aria-label={`Move media ${index + 1} down`}><ArrowDown size={17}/></button><button type="button" onClick={() => onChange(value.filter((_, entryIndex) => entryIndex !== index))} className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Remove media ${index + 1}`}><Trash2 size={17}/></button></div></div>; })}{!value.length ? <p className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">No project media added yet.</p> : null}</div></section>;
}

function ProjectItems({ value, catalog, onChange }: { value: ProjectLine[]; catalog: CatalogProduct[]; onChange: (value: ProjectLine[]) => void }) {
  function update(index: number, patch: Partial<ProjectLine>) { onChange(value.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line)); }
  return <section><div className="flex items-center justify-between gap-3"><div><h3 className="font-black">Products used</h3><p className="text-xs text-slate-500">Show the exact product, variant and quantity used in this project.</p></div><Button type="button" variant="outline" onClick={() => onChange([...value, { productId: catalog[0]?.id || "", variantId: "", quantity: 1, note: "", sortOrder: value.length }])}><Plus size={16}/> Add product</Button></div><div className="mt-3 grid gap-2">{value.map((line, index) => { const product = catalog.find((entry) => entry.id === line.productId); return <div key={`${line.productId}-${line.variantId}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 p-3 lg:grid-cols-[1fr_1fr_90px_1fr_44px] dark:border-white/10"><select className="admin-input" value={line.productId} onChange={(event) => update(index, { productId: event.target.value, variantId: "" })}><option value="">Select product</option>{catalog.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.sku}</option>)}</select><select className="admin-input" value={line.variantId || ""} onChange={(event) => update(index, { variantId: event.target.value })}><option value="">Parent product</option>{product?.variants?.map((variant) => <option key={variant.id} value={variant.id}>{variant.title} · {variant.sku}</option>)}</select><input aria-label="Quantity used" type="number" min={1} className="admin-input" value={line.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })}/><input aria-label="Product note" className="admin-input" placeholder="Location or note" value={line.note || ""} onChange={(event) => update(index, { note: event.target.value })}/><button type="button" onClick={() => onChange(value.filter((_, lineIndex) => lineIndex !== index))} className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label="Remove project product"><Trash2 size={17}/></button></div>; })}</div></section>;
}

function PackageItems({ value, catalog, onChange }: { value: PackageLine[]; catalog: CatalogProduct[]; onChange: (value: PackageLine[]) => void }) {
  function update(index: number, patch: Partial<PackageLine>) { onChange(value.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line)); }
  return <section><div className="flex items-center justify-between"><div><h3 className="font-black">Package products</h3><p className="text-xs text-slate-500">Price and stock are calculated from these live products and exact variants.</p></div><Button type="button" variant="outline" onClick={() => onChange([...value, { productId: catalog[0]?.id || "", variantId: "", quantity: 1, sortOrder: value.length }])}><Plus size={16}/> Add product</Button></div><div className="mt-3 grid gap-2">{value.map((line, index) => { const product = catalog.find((entry) => entry.id === line.productId); const variant = product?.variants?.find((entry) => entry.id === line.variantId); const price = Number(variant?.price ?? product?.price ?? 0); const stock = Number(variant?.stock ?? product?.stock ?? 0); return <div key={`${index}-${line.productId}`} className="rounded-lg border border-slate-200 p-3 dark:border-white/10"><div className="grid gap-2 md:grid-cols-[1fr_1fr_110px_44px]"><select className="admin-input" value={line.productId} onChange={(event) => update(index, { productId: event.target.value, variantId: "" })}><option value="">Select product</option>{catalog.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {entry.sku}</option>)}</select><select className="admin-input" value={line.variantId || ""} onChange={(event) => update(index, { variantId: event.target.value })}><option value="">Parent product</option>{product?.variants?.map((entry) => <option key={entry.id} value={entry.id}>{entry.title} · {entry.sku}</option>)}</select><input aria-label="Quantity" type="number" min={1} className="admin-input" value={line.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })}/><button type="button" onClick={() => onChange(value.filter((_, lineIndex) => lineIndex !== index))} className="grid size-11 place-items-center rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label="Remove product"><Trash2 size={17}/></button></div>{product ? <div className="mt-2 flex flex-wrap gap-3 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-1"><PackageCheck size={14}/> {variant?.sku || product.sku}</span><span>{money(price)} each</span><span className={stock >= line.quantity ? "text-emerald-700" : "text-red-700"}>{stock} in stock</span><span>{money(price * Number(line.quantity || 0))} line total</span></div> : null}</div>; })}{!value.length ? <p className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">Add at least one product.</p> : null}</div></section>;
}

function LegacyMappingSummary({ status, items }: { status: string; items: unknown }) {
  const rows = Array.isArray(items) ? items as Array<Record<string, unknown>> : [];
  return <section className="rounded-lg border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/20"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-black">Legacy package mapping</h3><p className="text-xs text-slate-600 dark:text-slate-400">Attach one exact catalog product or variant for every original line below, then save.</p></div><span className="rounded-md bg-amber-500 px-2 py-1 text-[10px] font-black uppercase text-slate-950">{status.replaceAll("_", " ") || "Needs mapping"}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{rows.map((item, index) => <div key={`${text(item.sku || item.name)}-${index}`} className="rounded-md border border-amber-200 bg-white p-3 text-sm dark:border-amber-900/70 dark:bg-slate-950"><strong className="block">{text(item.name) || `Legacy item ${index + 1}`}</strong><span className="mt-1 block font-mono text-xs text-slate-500">{text(item.sku) || "No SKU"} · Qty {text(item.quantity) || "1"}</span></div>)}</div>{!rows.length ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">No original line metadata was available. Review the package products before publishing.</p> : null}</section>;
}

function StatusFields({ form, update }: { form: FormState; update: (key: string, value: unknown) => void }) { return <><Select label="Publish status" value={form.status} options={["DRAFT","PUBLISHED","ARCHIVED"]} onChange={(value) => update("status", value)}/><Toggle label="Active" checked={bool(form.isActive)} onChange={(value) => update("isActive", value)}/><Toggle label="Featured" checked={bool(form.isFeatured)} onChange={(value) => update("isFeatured", value)}/><Toggle label="Homepage" checked={bool(form.showOnHomepage)} onChange={(value) => update("showOnHomepage", value)}/></>; }
function Field({ label, value, onChange, type = "text" }: { label: string; value: unknown; onChange: (value: string) => void; type?: string }) { return <label className="text-sm font-bold">{label}<input type={type} className="admin-input mt-1 w-full" value={text(value)} onChange={(event) => onChange(event.target.value)}/></label>; }
function Area({ label, value, onChange }: { label: string; value: unknown; onChange: (value: string) => void }) { return <label className="text-sm font-bold md:col-span-2">{label}<textarea rows={4} className="admin-input mt-1 w-full resize-y py-3" value={text(value)} onChange={(event) => onChange(event.target.value)}/></label>; }
function ListField({ label, value, onChange }: { label: string; value: unknown; onChange: (value: string[]) => void }) { return <label className="text-sm font-bold">{label}<textarea rows={3} className="admin-input mt-1 w-full resize-y py-3" value={toArray(value).join("\n")} onChange={(event) => onChange(toArray(event.target.value))}/><span className="mt-1 block text-[11px] font-normal text-slate-500">One per line or comma separated.</span></label>; }
function Select({ label, value, options, onChange }: { label: string; value: unknown; options: string[]; onChange: (value: string) => void }) { return <label className="text-sm font-bold">{label}<select className="admin-input mt-1 w-full" value={text(value)} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</select></label>; }
function Lookup({ label, value, items, onChange }: { label: string; value: unknown; items: Item[]; onChange: (value: string) => void }) { return <label className="text-sm font-bold">{label}<select className="admin-input mt-1 w-full" value={text(value)} onChange={(event) => onChange(event.target.value)}><option value="">None</option>{items.map((item) => <option key={item.id} value={item.id}>{itemTitle("services", item)}</option>)}</select></label>; }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 text-sm font-bold dark:border-white/10"><span>{label}</span><input type="checkbox" className="size-4 accent-red-700" checked={checked} onChange={(event) => onChange(event.target.checked)}/></label>; }
function ReadOnly({ label, value }: { label: string; value: unknown }) { return <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{text(value) || "Not provided"}</p></div>; }
