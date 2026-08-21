"use client";

import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, Copy, Download, Edit, ImagePlus, Plus, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { money, slugify } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";

type Lookup = { id: string; name: string; slug: string };
type ProductImageInput = { url: string; alt?: string; isMain: boolean; sortOrder: number };
type ProductSpecInput = { name: string; value: string };
type ProductVariantInput = {
  id?: string;
  title: string;
  sku: string;
  barcode?: string | null;
  price: number;
  compareAtPrice?: number | null;
  costPrice: number;
  wholesalePrice?: number | null;
  minWholesaleQuantity?: number | null;
  stock: number;
  lowStockThreshold: number;
  imageUrl?: string | null;
  modelUrl?: string | null;
  options: Record<string, string>;
  isDefault: boolean;
  isActive: boolean;
};
type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  brandId: string;
  categoryId: string;
  description: string;
  shortDescription: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number;
  dealerPrice: number | null;
  wholesalePrice: number | null;
  minWholesaleQuantity: number;
  stock: number;
  lowStockThreshold: number;
  weightKg: number;
  dimensions: string;
  warranty: string;
  returnPolicy: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  isHeavyItem: boolean;
  isBulky: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isActive: boolean;
  modelUrl: string;
  modelPosterUrl: string;
  images: ProductImageInput[];
  specs: ProductSpecInput[];
  variants: ProductVariantInput[];
};
type ProductRow = ProductForm & {
  brand: Lookup;
  category: Lookup;
  images: ProductImageInput[];
  variants: ProductVariantInput[];
};

const emptyProduct = (categories: Lookup[], brands: Lookup[]): ProductForm => ({
  name: "",
  slug: "",
  sku: "",
  barcode: "",
  brandId: brands[0]?.id || "",
  categoryId: categories[0]?.id || "",
  description: "",
  shortDescription: "",
  price: 0,
  compareAtPrice: null,
  costPrice: 0,
  dealerPrice: null,
  wholesalePrice: null,
  minWholesaleQuantity: 1,
  stock: 0,
  lowStockThreshold: 5,
  weightKg: 0,
  dimensions: "",
  warranty: "",
  returnPolicy: "",
  tags: [],
  seoTitle: "",
  seoDescription: "",
  isHeavyItem: false,
  isBulky: false,
  isBestSeller: false,
  isFeatured: false,
  isNewArrival: false,
  isActive: true,
  modelUrl: "",
  modelPosterUrl: "",
  images: [],
  specs: [],
  variants: []
});

function normalizeProduct(product: ProductRow): ProductForm {
  return {
    ...product,
    barcode: product.barcode || "",
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    costPrice: Number(product.costPrice || 0),
    dealerPrice: product.dealerPrice ? Number(product.dealerPrice) : null,
    wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
    price: Number(product.price || 0),
    weightKg: Number(product.weightKg || 0),
    dimensions: product.dimensions || "",
    warranty: product.warranty || "",
    returnPolicy: product.returnPolicy || "",
    seoTitle: product.seoTitle || "",
    seoDescription: product.seoDescription || "",
    modelUrl: product.modelUrl || "",
    modelPosterUrl: product.modelPosterUrl || "",
    images: product.images || [],
    specs: product.specs || [],
    variants: (product.variants || []).map((variant) => ({
      ...variant,
      wholesalePrice: variant.wholesalePrice ? Number(variant.wholesalePrice) : null,
      minWholesaleQuantity: variant.minWholesaleQuantity ? Number(variant.minWholesaleQuantity) : null
    }))
  };
}

function formatOptions(options: Record<string, string>) {
  return Object.entries(options).map(([key, value]) => `${key}: ${value}`).join("\n");
}

function parseOptions(value: string) {
  return Object.fromEntries(
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [key, ...rest] = line.split(":");
        return [key.trim(), rest.join(":").trim()];
      })
      .filter(([key, option]) => key && option)
  );
}

function variantStock(variants: ProductVariantInput[], fallbackStock: number) {
  if (!variants.length) return fallbackStock;
  const active = variants.filter((variant) => variant.isActive);
  const rows = active.length ? active : variants;
  return rows.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
}

function defaultVariant(variants: ProductVariantInput[]) {
  return variants.find((variant) => variant.isDefault) || variants[0];
}

function commaList(value: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image read failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image optimization failed"));
    image.src = url;
  });
}

async function optimizeProductImage(file: File, alt: string, isMain: boolean, sortOrder: number): Promise<ProductImageInput> {
  const source = await readFileAsDataUrl(file);
  return optimizeProductImageUrl(source, alt, isMain, sortOrder);
}

async function optimizeProductImageUrl(source: string, alt: string, isMain: boolean, sortOrder: number): Promise<ProductImageInput> {
  const image = await loadImage(source);
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  const maxEdge = 1600;
  const baseScale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
  const targetChars = 850_000;
  let best = source;

  for (const downscale of [1, 0.82, 0.68]) {
    const width = Math.max(1, Math.round(naturalWidth * baseScale * downscale));
    const height = Math.max(1, Math.round(naturalHeight * baseScale * downscale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, width, height);

    for (const quality of [0.9, 0.84, 0.78, 0.72, 0.66]) {
      const candidate = canvas.toDataURL("image/webp", quality);
      if (candidate.length < best.length) best = candidate;
      if (candidate.length <= targetChars) {
        return { url: candidate, alt, isMain, sortOrder };
      }
    }
  }

  return { url: best, alt, isMain, sortOrder };
}

async function prepareProductForSave(form: ProductForm): Promise<ProductForm> {
  const images = await Promise.all(form.images.slice(0, 4).map((image, index) => {
    const normalized = { ...image, isMain: image.isMain || index === 0, sortOrder: index, alt: image.alt || form.name };
    return image.url.startsWith("data:")
      ? optimizeProductImageUrl(image.url, normalized.alt || form.name, normalized.isMain, normalized.sortOrder)
      : Promise.resolve(normalized);
  }));
  const mainImage = images.find((image) => image.isMain)?.url || images[0]?.url || "/brand/htc-logo.png";
  return {
    ...form,
    images,
    variants: form.variants.map((variant) => ({
      ...variant,
      imageUrl: variant.imageUrl?.startsWith("data:") || variant.imageUrl === mainImage ? null : variant.imageUrl
    }))
  };
}

async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function AdminProductManager({ categories, brands }: { categories: Lookup[]; brands: Lookup[] }) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [active, setActive] = useState("");
  const [stock, setStock] = useState("");
  const [sort, setSort] = useState("updatedAt:desc");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [source, setSource] = useState<"database" | "fallback" | "">("");
  const [importErrors, setImportErrors] = useState<Array<{ row: number; error: string }>>([]);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "20", sort });
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (brandId) params.set("brandId", brandId);
    if (active) params.set("active", active);
    if (stock) params.set("stock", stock);
    return params.toString();
  }, [active, brandId, categoryId, page, q, sort, stock]);

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/admin/products?${query}`);
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setToast(result.error || "Unable to load products");
      return;
    }
    setProducts(result.items);
    setPages(result.pages || 1);
    setSource(result.source || "database");
    setSelected([]);
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  function startCreate() {
    setForm(emptyProduct(categories, brands));
  }

  async function save() {
    if (!form) return;
    setLoading(true);
    try {
      const preparedForm = await prepareProductForSave(form);
      const payload = { ...preparedForm, slug: preparedForm.slug || slugify(preparedForm.name), shortDescription: preparedForm.shortDescription || preparedForm.description.slice(0, 140) };
      const body = JSON.stringify(payload);
      if (body.length > 4_000_000) {
        setToast("Images are still too large. Remove extra images or upload smaller photos.");
        return;
      }
      const response = await fetch(form.id ? `/api/admin/products/${form.id}` : "/api/admin/products", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body
      });
      const result = await readResponseJson(response);
      if (!response.ok) {
        setToast(result?.error || (response.status === 413 ? "Images are too large. Upload optimized photos." : "Unable to save product"));
        return;
      }
      setToast("Product saved");
      setForm(null);
      await load();
    } catch {
      setToast("Save failed. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this product permanently?")) return;
    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!response.ok) setToast((await response.json()).error || "Delete failed");
    else {
      setToast("Product deleted");
      await load();
    }
  }

  async function editProduct(id: string) {
    if (!id) return;
    setLoading(true);
    const response = await fetch(`/api/admin/products/${id}`);
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setToast(result.error || "Unable to load product");
      return;
    }
    setForm(normalizeProduct(result));
  }

  async function duplicate(id: string) {
    const response = await fetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
    setToast(response.ok ? "Product duplicated as inactive copy" : (await response.json()).error || "Duplicate failed");
    await load();
  }

  async function bulk(action: string) {
    if (!selected.length) return setToast("Select products first");
    if (["delete", "deactivate"].includes(action) && !window.confirm(`Apply ${action} to ${selected.length} products?`)) return;
    let body: Record<string, unknown> = { ids: selected, action };
    if (action === "price") {
      const amount = Number(window.prompt("Enter new selling price or percent", "0"));
      const mode = window.prompt("Mode: set or percent", "set") || "set";
      body = { ...body, amount, mode };
    }
    if (action === "stock") {
      const amount = Number(window.prompt("Enter stock amount", "0"));
      const mode = window.prompt("Mode: set or adjust", "adjust") || "adjust";
      body = { ...body, amount, mode };
    }
    const response = await fetch("/api/admin/products/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setToast(response.ok ? "Bulk action completed" : (await response.json()).error || "Bulk action failed");
    await load();
  }

  async function readFiles(files: FileList | null) {
    if (!files || !form) return;
    const remainingSlots = Math.max(0, 4 - form.images.length);
    if (!remainingSlots) {
      setToast("Maximum 4 product images allowed");
      return;
    }
    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, remainingSlots);
    if (!selectedFiles.length) return;
    setToast("Optimizing images for high quality upload...");
    try {
      const optimized = await Promise.all(selectedFiles.map((file, index) =>
        optimizeProductImage(file, form.name, form.images.length === 0 && index === 0, form.images.length + index)
      ));
      update("images", [...form.images, ...optimized].map((image, index) => ({ ...image, isMain: image.isMain || index === 0, sortOrder: index })));
      setToast(selectedFiles.length < files.length ? "Added first 4 images only" : "Images optimized and added");
    } catch {
      setToast("Image optimization failed. Try another image.");
    }
  }

  async function uploadModelFile(file: File | undefined) {
    if (!file || !form) return;
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setToast("3D models must be .glb or .gltf files");
      return;
    }
    if (file.size > 20_000_000) {
      setToast("3D model exceeds the 20 MB limit");
      return;
    }
    setToast("Uploading 3D model...");
    try {
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "model";
      const blob = await upload(`htc/media/${Date.now()}-${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/media/upload",
        contentType: file.type || "model/gltf-binary",
        multipart: file.size > 5_000_000,
        clientPayload: JSON.stringify({
          kind: "MODEL",
          name: file.name,
          mimeType: file.type || "model/gltf-binary",
          sizeBytes: file.size
        })
      });
      update("modelUrl", blob.url);
      setToast("3D model uploaded. Save the product to apply it.");
    } catch (reason) {
      setToast(reason instanceof Error ? reason.message : "3D model upload failed");
    }
  }

  function addVariant() {
    if (!form) return;
    const index = form.variants.length + 1;
    const next: ProductVariantInput = {
      title: index === 1 ? "Default" : `Variant ${index}`,
      sku: `${form.sku || slugify(form.name).toUpperCase() || "HTC"}-${index}`,
      barcode: "",
      price: form.price,
      compareAtPrice: form.compareAtPrice,
      costPrice: form.costPrice,
      wholesalePrice: form.wholesalePrice,
      minWholesaleQuantity: form.minWholesaleQuantity,
      stock: form.stock,
      lowStockThreshold: form.lowStockThreshold,
      imageUrl: form.images.find((image) => image.isMain)?.url || form.images[0]?.url || "",
      options: index === 1 ? {} : { Size: "", Color: "" },
      isDefault: form.variants.length === 0,
      isActive: true
    };
    update("variants", [...form.variants, next]);
  }

  function updateVariant(index: number, patch: Partial<ProductVariantInput>) {
    if (!form) return;
    update("variants", form.variants.map((variant, variantIndex) => {
      const next = variantIndex === index ? { ...variant, ...patch } : variant;
      return patch.isDefault && variantIndex !== index ? { ...next, isDefault: false } : next;
    }));
  }

  function removeVariant(index: number) {
    if (!form) return;
    const next = form.variants.filter((_, variantIndex) => variantIndex !== index);
    update("variants", next.map((variant, variantIndex) => ({ ...variant, isDefault: next.some((item) => item.isDefault) ? variant.isDefault : variantIndex === 0 })));
  }

  function syncParentFromVariants() {
    if (!form || !form.variants.length) return;
    const selectedDefault = defaultVariant(form.variants);
    update("price", selectedDefault.price);
    update("compareAtPrice", selectedDefault.compareAtPrice || null);
    update("costPrice", selectedDefault.costPrice);
    update("stock", variantStock(form.variants, form.stock));
    update("lowStockThreshold", selectedDefault.lowStockThreshold);
  }

  function generateVariantMatrix() {
    if (!form) return;
    const sizesInput = window.prompt("Enter sizes / inches separated by comma", "5 inch, 6 inch");
    if (sizesInput === null) return;
    const colorsInput = window.prompt("Enter colors separated by comma. Leave blank if not needed.", "Black, White");
    if (colorsInput === null) return;
    const stockInput = window.prompt("Stock for each variant", String(Math.max(1, form.stock || 1)));
    if (stockInput === null) return;
    const sizes = commaList(sizesInput);
    const colors = commaList(colorsInput);
    const sizeRows = sizes.length ? sizes : [""];
    const colorRows = colors.length ? colors : [""];
    if (!sizes.length && !colors.length) {
      setToast("Add at least one size/inch or color");
      return;
    }
    const imageUrl = form.images.find((image) => image.isMain)?.url || form.images[0]?.url || "";
    const baseSku = (form.sku || slugify(form.name) || "HTC").toUpperCase();
    const stockEach = Math.max(0, Math.floor(Number(stockInput) || 0));
    const variants = sizeRows.flatMap((size) => colorRows.map((color, index) => {
      const title = [size, color].filter(Boolean).join(" ") || `Variant ${index + 1}`;
      const suffix = slugify(title).toUpperCase() || String(index + 1);
      return {
        title,
        sku: `${baseSku}-${suffix}`,
        barcode: "",
        price: form.price,
        compareAtPrice: form.compareAtPrice,
        costPrice: form.costPrice,
        stock: stockEach,
        lowStockThreshold: form.lowStockThreshold,
        imageUrl,
        options: Object.fromEntries([
          size ? ["Size", size] : null,
          color ? ["Color", color] : null
        ].filter(Boolean) as Array<[string, string]>),
        isDefault: false,
        isActive: true
      } satisfies ProductVariantInput;
    }));
    update("variants", variants.map((variant, index) => ({ ...variant, isDefault: index === 0 })));
    update("stock", variants.reduce((sum, variant) => sum + variant.stock, 0));
    setToast(`Generated ${variants.length} variants. Save product to publish them.`);
  }

  async function importCsv(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const dryRun = await fetch("/api/admin/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: text, dryRun: true }) });
    const dry = await dryRun.json();
    setImportErrors(dry.errors || []);
    if (dry.errors?.length) return setToast("Import validation failed");
    if (!window.confirm(`Import ${dry.rows} rows? Existing products will update by SKU.`)) return;
    const response = await fetch("/api/admin/products/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv: text }) });
    const result = await response.json();
    setToast(response.ok ? `Imported ${result.imported} rows` : result.error || "Import failed");
    await load();
  }

  return (
    <div className="space-y-4">
      {source === "fallback" ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          PostgreSQL is not connected yet, so admin products are using the local fallback store. Add, edit, delete, duplicate, bulk actions, and export are still available here.
        </motion.div>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap gap-2">
          <div className="flex min-w-64 flex-1 items-center rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"><Search size={17} /><input value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Search title, SKU, barcode" /></div>
          <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={brandId} onChange={(event) => { setBrandId(event.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">All brands</option>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select value={active} onChange={(event) => setActive(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">Any status</option><option value="true">Active</option><option value="false">Inactive</option></select>
          <select value={stock} onChange={(event) => setStock(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="">Any stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"><option value="updatedAt:desc">Newest</option><option value="name:asc">Title A-Z</option><option value="price:asc">Price low</option><option value="price:desc">Price high</option><option value="stock:asc">Stock low</option></select>
          <Button variant="accent" onClick={startCreate}><Plus size={17} /> Add product</Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => bulk("activate")}>Bulk activate</Button>
          <Button variant="outline" onClick={() => bulk("deactivate")}>Bulk deactivate</Button>
          <Button variant="outline" onClick={() => bulk("price")}>Bulk price</Button>
          <Button variant="outline" onClick={() => bulk("stock")}>Bulk stock</Button>
          <Button variant="outline" onClick={() => bulk("delete")}>Bulk delete</Button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => { window.location.href = "/api/admin/products/template"; }}><Download size={17} /> Template</button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold" onClick={() => { window.location.href = "/api/admin/products/export"; }}><Download size={17} /> Export CSV</button>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold"><Upload size={17} /> Import CSV/Excel<input type="file" accept=".csv,.xlsx" className="hidden" onChange={(event) => void importCsv(event.target.files?.[0])} /></label>
        </div>
        {importErrors.length ? <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{importErrors.map((item) => <p key={`${item.row}-${item.error}`}>Row {item.row}: {item.error}</p>)}</div> : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-500 dark:bg-slate-950"><tr><th className="p-3"><input type="checkbox" checked={selected.length === products.length && products.length > 0} onChange={(event) => setSelected(event.target.checked ? products.map((item) => item.id || "") : [])} /></th><th>Image</th><th>Product</th><th>Brand</th><th>Category</th><th>Variants</th><th>Stock</th><th>Price</th><th>Status</th><th>Flags</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={11} className="p-8 text-center text-slate-500"><RefreshCw className="mx-auto animate-spin" /> Loading products...</td></tr> : products.length === 0 ? <tr><td colSpan={11} className="p-8 text-center text-slate-500">No products found.</td></tr> : products.map((product) => {
              const main = product.images.find((image) => image.isMain) || product.images[0];
              const mainVariant = defaultVariant(product.variants);
              const stockTotal = variantStock(product.variants, product.stock);
              return <tr key={product.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3"><input type="checkbox" checked={selected.includes(product.id || "")} onChange={(event) => setSelected((current) => event.target.checked ? [...current, product.id || ""] : current.filter((id) => id !== product.id))} /></td><td>{main ? <Image src={main.url} alt={product.name} width={54} height={54} className="size-14 rounded-lg object-cover" unoptimized /> : <div className="grid size-14 place-items-center rounded-lg bg-slate-100"><ImagePlus size={18} /></div>}</td><td><strong>{product.name}</strong><p className="font-mono text-xs text-slate-500">{product.sku}</p></td><td>{product.brand.name}</td><td>{product.category.name}</td><td><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black dark:bg-slate-800">{product.variants.length || 1} option{(product.variants.length || 1) === 1 ? "" : "s"}</span><p className="mt-1 font-mono text-xs text-slate-500">{mainVariant?.sku || product.sku}</p></td><td><span className={stockTotal <= 0 ? "font-bold text-red-600" : stockTotal <= product.lowStockThreshold ? "font-bold text-amber-600" : ""}>{stockTotal}</span></td><td>{money(Number(mainVariant?.price || product.price))}</td><td><StatusBadge status={product.isActive ? "DELIVERED" : "CANCELLED"} className="capitalize" /></td><td className="text-xs text-slate-500">{[product.isFeatured && "Homepage", product.isBestSeller && "Best", product.isNewArrival && "New", product.isHeavyItem && "Heavy"].filter(Boolean).join(", ") || "-"}</td><td><div className="flex gap-1"><button className="rounded-md p-2 hover:bg-slate-100" onClick={() => void editProduct(product.id || "")} aria-label="Edit product"><Edit size={17} /></button><button className="rounded-md p-2 hover:bg-slate-100" onClick={() => void duplicate(product.id || "")} aria-label="Duplicate product"><Copy size={17} /></button><button className="rounded-md p-2 text-red-600 hover:bg-red-50" onClick={() => void remove(product.id || "")} aria-label="Delete product"><Trash2 size={17} /></button></div></td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span className="text-sm text-slate-500">Page {page} of {pages}</span><Button variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>

      <AnimatePresence>
        {form ? (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-950" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}>
              <div className="flex items-center justify-between"><h2 className="text-2xl font-black">{form.id ? "Edit product" : "Add product"}</h2><button onClick={() => setForm(null)}><X /></button></div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Product title" value={form.name} onChange={(event) => { update("name", event.target.value); if (!form.id) update("slug", slugify(event.target.value)); }} />
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Product slug" value={form.slug} onChange={(event) => update("slug", slugify(event.target.value))} />
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="SKU" value={form.sku} onChange={(event) => update("sku", event.target.value)} />
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Barcode" value={form.barcode} onChange={(event) => update("barcode", event.target.value)} />
                <select className="rounded-lg border p-2 dark:bg-slate-900" value={form.brandId} onChange={(event) => update("brandId", event.target.value)}>{brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <select className="rounded-lg border p-2 dark:bg-slate-900" value={form.categoryId} onChange={(event) => update("categoryId", event.target.value)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                {["costPrice:Purchase price", "price:Selling price", "compareAtPrice:Discount price", "dealerPrice:Dealer price", "wholesalePrice:Wholesale price", "minWholesaleQuantity:Minimum wholesale quantity", "stock:Stock quantity", "lowStockThreshold:Minimum stock level", "weightKg:Weight kg"].map((item) => { const [key, label] = item.split(":") as [keyof ProductForm, string]; return <label key={item} className="text-sm font-semibold">{label}<input type="number" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" value={Number(form[key] || 0)} onChange={(event) => update(key, Number(event.target.value) as never)} /></label>; })}
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Dimensions" value={form.dimensions} onChange={(event) => update("dimensions", event.target.value)} />
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Warranty" value={form.warranty} onChange={(event) => update("warranty", event.target.value)} />
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Return policy" value={form.returnPolicy} onChange={(event) => update("returnPolicy", event.target.value)} />
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Tags comma separated" value={form.tags.join(", ")} onChange={(event) => update("tags", event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} />
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="SEO title" value={form.seoTitle} onChange={(event) => update("seoTitle", event.target.value)} />
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="SEO description" value={form.seoDescription} onChange={(event) => update("seoDescription", event.target.value)} />
                <div className="flex gap-2">
                  <input className="min-w-0 flex-1 rounded-lg border p-2 dark:bg-slate-900" placeholder="3D model URL (.glb or .gltf, optional)" value={form.modelUrl} onChange={(event) => update("modelUrl", event.target.value)} />
                  <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-200" title="Upload a .glb or .gltf model (max 20 MB)"><Boxes size={15} /> Upload<input type="file" accept=".glb,.gltf,model/gltf-binary" className="hidden" onChange={(event) => { void uploadModelFile(event.target.files?.[0]); event.target.value = ""; }} /></label>
                </div>
                <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="3D model poster image URL (optional)" value={form.modelPosterUrl} onChange={(event) => update("modelPosterUrl", event.target.value)} />
                <textarea className="rounded-lg border p-2 md:col-span-2 dark:bg-slate-900" placeholder="Description" value={form.description} onChange={(event) => update("description", event.target.value)} />
                <textarea className="rounded-lg border p-2 md:col-span-2 dark:bg-slate-900" placeholder="Specifications, one per line: Name: Value" value={form.specs.map((spec) => `${spec.name}: ${spec.value}`).join("\n")} onChange={(event) => update("specs", event.target.value.split("\n").map((line) => { const [name, ...value] = line.split(":"); return name && value.length ? { name: name.trim(), value: value.join(":").trim() } : null; }).filter(Boolean) as ProductSpecInput[])} />
                <div className="md:col-span-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{["isActive:Active", "isFeatured:Homepage showcase", "isBestSeller:Best seller", "isNewArrival:New arrival", "isHeavyItem:Heavy", "isBulky:Bulky"].map((item) => { const [key, label] = item.split(":") as [keyof ProductForm, string]; return <label key={item} className="flex items-center gap-2 rounded-lg border p-2 text-sm"><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => update(key, event.target.checked as never)} />{label}</label>; })}</div>
                <div className="md:col-span-2 rounded-xl border border-dashed p-4" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void readFiles(event.dataTransfer.files); }}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-black">Product images</h3>
                      <p className="text-xs text-slate-500">Add 3-4 images, set one main image, and reorder thumbnails.</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900">{form.images.length} images</span>
                  </div>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-100 p-4 text-sm font-bold dark:bg-slate-900"><Upload size={18} /> Drag images here or choose files<input type="file" multiple accept="image/*" className="hidden" onChange={(event) => void readFiles(event.target.files)} /></label>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">{form.images.map((image, index) => <div key={`${image.url}-${index}`} className="rounded-lg border p-2"><Image src={image.url} alt={image.alt || form.name} width={180} height={120} className="h-24 w-full rounded-md object-cover" unoptimized /><div className="mt-2 flex flex-wrap gap-1"><button className="rounded bg-slate-100 px-2 py-1 text-xs" onClick={() => update("images", form.images.map((img, i) => ({ ...img, isMain: i === index })))}>Main</button><button className="rounded bg-slate-100 px-2 py-1 text-xs" onClick={() => update("images", form.images.filter((_, i) => i !== index))}>Remove</button><button className="rounded bg-slate-100 px-2 py-1 text-xs" onClick={() => { const next = [...form.images]; if (index > 0) [next[index - 1], next[index]] = [next[index], next[index - 1]]; update("images", next.map((img, i) => ({ ...img, sortOrder: i }))); }}>Up</button><button className="rounded bg-slate-100 px-2 py-1 text-xs" onClick={() => { const next = [...form.images]; if (index < next.length - 1) [next[index + 1], next[index]] = [next[index], next[index + 1]]; update("images", next.map((img, i) => ({ ...img, sortOrder: i }))); }}>Down</button></div>{image.isMain ? <p className="mt-1 text-xs font-bold text-orange-600">Main image</p> : null}</div>)}</div>
                </div>
                <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black">Variants</h3>
                      <p className="text-xs text-slate-500">Create size, color, inches or any custom option cards for this product.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.variants.length ? <Button type="button" variant="outline" onClick={syncParentFromVariants}>Sync parent stock</Button> : null}
                      <Button type="button" variant="outline" onClick={generateVariantMatrix}>Quick size/color builder</Button>
                      <Button type="button" variant="outline" onClick={addVariant}><Plus size={16} /> Add variant</Button>
                    </div>
                  </div>
                  {form.variants.length ? (
                    <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-4">
                      <div><span className="text-xs font-bold uppercase text-slate-500">Default SKU</span><strong className="block font-mono">{defaultVariant(form.variants)?.sku || form.sku}</strong></div>
                      <div><span className="text-xs font-bold uppercase text-slate-500">Default price</span><strong className="block">{money(defaultVariant(form.variants)?.price || form.price)}</strong></div>
                      <div><span className="text-xs font-bold uppercase text-slate-500">Variant stock</span><strong className="block">{variantStock(form.variants, form.stock)}</strong></div>
                      <div><span className="text-xs font-bold uppercase text-slate-500">Active options</span><strong className="block">{form.variants.filter((variant) => variant.isActive).length}</strong></div>
                    </div>
                  ) : null}
                  {form.variants.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950">
                      No variants yet. If you leave this empty, the system will create one default variant from the product price and stock.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4">
                      {form.variants.map((variant, index) => (
                        <div key={`${variant.id || variant.sku}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong>Variant {index + 1}</strong>
                            <div className="flex flex-wrap gap-2 text-xs font-bold">
                              <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-900"><input type="checkbox" checked={variant.isDefault} onChange={(event) => updateVariant(index, { isDefault: event.target.checked })} /> Default</label>
                              <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-900"><input type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(index, { isActive: event.target.checked })} /> Active</label>
                              <button type="button" className="rounded-full bg-red-50 px-3 py-1 text-red-700" onClick={() => removeVariant(index)}>Remove</button>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Variant title" value={variant.title} onChange={(event) => updateVariant(index, { title: event.target.value })} />
                            <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Variant SKU" value={variant.sku} onChange={(event) => updateVariant(index, { sku: event.target.value })} />
                            <input className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Variant barcode" value={variant.barcode || ""} onChange={(event) => updateVariant(index, { barcode: event.target.value })} />
                            <label className="text-xs font-bold uppercase text-slate-500">Price<input type="number" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" value={variant.price} onChange={(event) => updateVariant(index, { price: Number(event.target.value) })} /></label>
                            <label className="text-xs font-bold uppercase text-slate-500">Compare price<input type="number" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" value={Number(variant.compareAtPrice || 0)} onChange={(event) => updateVariant(index, { compareAtPrice: Number(event.target.value) || null })} /></label>
                            <label className="text-xs font-bold uppercase text-slate-500">Cost price<input type="number" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" value={variant.costPrice} onChange={(event) => updateVariant(index, { costPrice: Number(event.target.value) })} /></label>
                            <label className="text-xs font-bold uppercase text-slate-500">Wholesale price<input type="number" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" value={Number(variant.wholesalePrice || 0)} onChange={(event) => updateVariant(index, { wholesalePrice: Number(event.target.value) || null })} /></label>
                            <label className="text-xs font-bold uppercase text-slate-500">Wholesale minimum<input type="number" min={1} className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" value={Number(variant.minWholesaleQuantity || form.minWholesaleQuantity)} onChange={(event) => updateVariant(index, { minWholesaleQuantity: Number(event.target.value) || null })} /></label>
                            <label className="text-xs font-bold uppercase text-slate-500">Stock<input type="number" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" value={variant.stock} onChange={(event) => updateVariant(index, { stock: Number(event.target.value) })} /></label>
                            <label className="text-xs font-bold uppercase text-slate-500">Low stock<input type="number" className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" value={variant.lowStockThreshold} onChange={(event) => updateVariant(index, { lowStockThreshold: Number(event.target.value) })} /></label>
                            <label className="text-xs font-bold uppercase text-slate-500">Variant image URL<input className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" value={variant.imageUrl || ""} onChange={(event) => updateVariant(index, { imageUrl: event.target.value })} /></label>
                            <label className="text-xs font-bold uppercase text-slate-500">Variant 3D model URL<input className="mt-1 w-full rounded-lg border p-2 dark:bg-slate-900" placeholder="Optional .glb or .gltf URL" value={variant.modelUrl || ""} onChange={(event) => updateVariant(index, { modelUrl: event.target.value })} /></label>
                            {form.images.length ? (
                              <div className="md:col-span-3 flex flex-wrap gap-2">
                                {form.images.slice(0, 4).map((image, imageIndex) => (
                                  <button key={`${image.url}-${imageIndex}`} type="button" className={`rounded-full border px-3 py-1 text-xs font-bold transition hover:border-red-500 ${variant.imageUrl === image.url ? "border-red-600 bg-red-50 text-red-700" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`} onClick={() => updateVariant(index, { imageUrl: image.url })}>
                                    Use image {imageIndex + 1}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            <label className="md:col-span-3 text-xs font-bold uppercase text-slate-500">Options<textarea className="mt-1 min-h-24 w-full rounded-lg border p-2 normal-case dark:bg-slate-900" placeholder={"Color: Red\nSize: 12 inch"} value={formatOptions(variant.options)} onChange={(event) => updateVariant(index, { options: parseOptions(event.target.value) })} /></label>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setForm(null)}>Cancel</Button><Button variant="accent" onClick={() => void save()}>Save product</Button></div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence>{toast ? <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="fixed bottom-5 right-5 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white" onAnimationComplete={() => window.setTimeout(() => setToast(""), 2200)}>{toast}</motion.div> : null}</AnimatePresence>
    </div>
  );
}
