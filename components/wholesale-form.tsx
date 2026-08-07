"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Minus, PackageCheck, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WholesaleCatalogProduct, WholesaleCatalogVariant } from "@/lib/wholesale";
import { money } from "@/lib/utils";

type BasketLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  requestedTargetPrice: number | null;
};

type Feedback = {
  kind: "success" | "error";
  message: string;
} | null;

function selectedVariant(product: WholesaleCatalogProduct, variantId: string | null) {
  return product.variants.find((variant) => variant.id === variantId) || null;
}

function lineKey(productId: string, variantId: string | null) {
  return `${productId}:${variantId || "base"}`;
}

function variantLabel(variant: WholesaleCatalogVariant | null) {
  if (!variant) return "Standard product";
  const options = Object.entries(variant.options).map(([key, value]) => `${key}: ${value}`).join(" / ");
  return options || variant.title;
}

export function WholesaleForm({ catalog }: { catalog: WholesaleCatalogProduct[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [variantByProduct, setVariantByProduct] = useState<Record<string, string | null>>({});
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(false);

  const productMap = useMemo(() => new Map(catalog.map((product) => [product.id, product])), [catalog]);
  const categories = useMemo(
    () => ["All", ...Array.from(new Set(catalog.map((product) => product.category))).sort()],
    [catalog]
  );
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesSearch = !term || [
        product.name,
        product.sku,
        product.brand,
        product.category,
        ...product.variants.flatMap((variant) => [variant.title, variant.sku, ...Object.values(variant.options)])
      ].join(" ").toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [catalog, category, query]);

  const basketTotal = basket.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    if (!product) return sum;
    const variant = selectedVariant(product, line.variantId);
    return sum + (variant?.wholesalePrice ?? product.wholesalePrice ?? 0) * line.quantity;
  }, 0);

  function addProduct(product: WholesaleCatalogProduct) {
    const preferredVariantId = variantByProduct[product.id] ?? product.variants[0]?.id ?? null;
    const variant = selectedVariant(product, preferredVariantId);
    const minQuantity = variant?.minQuantity ?? product.minQuantity;
    const stock = variant?.stock ?? product.stock;
    if (stock <= 0 || stock < minQuantity) {
      setFeedback({ kind: "error", message: `${product.name} does not currently have enough wholesale stock.` });
      return;
    }
    setBasket((current) => {
      const key = lineKey(product.id, preferredVariantId);
      const existing = current.find((line) => lineKey(line.productId, line.variantId) === key);
      if (existing) {
        return current.map((line) => lineKey(line.productId, line.variantId) === key
          ? { ...line, quantity: Math.min(stock, line.quantity + minQuantity) }
          : line);
      }
      return [...current, {
        productId: product.id,
        variantId: preferredVariantId,
        quantity: minQuantity,
        requestedTargetPrice: null
      }];
    });
    setFeedback(null);
  }

  function updateLine(key: string, patch: Partial<BasketLine>) {
    setBasket((current) => current.map((line) => (
      lineKey(line.productId, line.variantId) === key ? { ...line, ...patch } : line
    )));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !basket.length) return;
    setLoading(true);
    setFeedback(null);
    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: basket,
          customerName: formData.get("customerName"),
          customerPhone: formData.get("phone"),
          customerEmail: formData.get("email"),
          city: formData.get("city"),
          note: formData.get("description")
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Quotation request could not be saved.");
      setBasket([]);
      event.currentTarget.reset();
      setFeedback({
        kind: "success",
        message: `Quotation ${data.reference || data.id} has been submitted. Our team will review every product line.`
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Quotation request could not be saved."
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-8">
      <section aria-labelledby="wholesale-catalog-title">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Live trade catalog</p>
            <h2 id="wholesale-catalog-title" className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              Select products and exact variants
            </h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(240px,1fr)_180px]">
            <label className="flex min-h-11 items-center border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">
              <Search aria-hidden="true" size={17} className="text-slate-400" />
              <span className="sr-only">Search wholesale products</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search product, SKU or brand"
                className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none"
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-h-11 w-full border border-slate-300 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950"
              >
                {categories.map((item) => <option key={item} value={item}>{item === "All" ? "All categories" : item}</option>)}
              </select>
            </label>
          </div>
        </div>

        {!catalog.length ? (
          <div className="mt-5 border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <PackageCheck className="mx-auto text-slate-400" />
            <p className="mt-3 font-bold">The wholesale catalog is temporarily unavailable.</p>
            <p className="mt-1 text-sm text-slate-500">Please refresh shortly or contact our sales team.</p>
          </div>
        ) : null}

        {catalog.length && !filtered.length ? (
          <div className="mt-5 border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
            No products match this search.
          </div>
        ) : null}

        <div className="mt-5 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => {
            const activeVariantId = variantByProduct[product.id] ?? product.variants[0]?.id ?? null;
            const variant = selectedVariant(product, activeVariantId);
            const price = variant?.wholesalePrice ?? product.wholesalePrice;
            const stock = variant?.stock ?? product.stock;
            const minimum = variant?.minQuantity ?? product.minQuantity;
            const image = variant?.imageUrl || product.image;
            return (
              <article key={product.id} className="flex min-w-0 flex-col bg-white p-4 dark:bg-slate-950">
                <div className="flex gap-4">
                  <div className="relative aspect-square w-24 shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-900">
                    <Image src={image} alt={product.name} fill sizes="96px" className="object-contain p-2" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase text-slate-500">{product.brand} / {product.category}</p>
                    <h3 className="mt-1 line-clamp-2 font-black text-slate-950 dark:text-white">{product.name}</h3>
                    <p className="mt-1 font-mono text-xs text-slate-500">{variant?.sku || product.sku}</p>
                    <p className="mt-2 text-lg font-black text-red-600">{price === null ? "Request price" : money(price)}</p>
                  </div>
                </div>

                {product.variants.length ? (
                  <label className="mt-4 text-xs font-bold uppercase text-slate-500">
                    Variant
                    <select
                      value={activeVariantId || ""}
                      onChange={(event) => setVariantByProduct((current) => ({ ...current, [product.id]: event.target.value }))}
                      className="mt-1 min-h-11 w-full border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      {product.variants.map((item) => (
                        <option key={item.id} value={item.id}>{variantLabel(item)} - {item.stock} available</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="mt-4 min-h-11 border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-500 dark:border-slate-800">
                    Standard product
                  </p>
                )}

                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <div className="text-xs text-slate-500">
                    <p><strong className="text-slate-900 dark:text-white">{stock}</strong> in stock</p>
                    <p>Minimum {minimum} units</p>
                  </div>
                  <Button type="button" variant="accent" onClick={() => addProduct(product)} disabled={stock < minimum}>
                    <Plus size={16} /> Add
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Quotation basket</p>
              <h2 className="mt-1 text-2xl font-black">Products for pricing</h2>
            </div>
            <span className="font-mono text-sm font-bold">{basket.length} lines</span>
          </div>

          {!basket.length ? (
            <div className="mt-4 border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
              <ShoppingCart className="mx-auto text-slate-400" />
              <p className="mt-3 font-bold">Your quotation basket is empty.</p>
              <p className="mt-1 text-sm text-slate-500">Add one or more catalog products above.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {basket.map((line) => {
                const product = productMap.get(line.productId);
                if (!product) return null;
                const variant = selectedVariant(product, line.variantId);
                const key = lineKey(line.productId, line.variantId);
                const minimum = variant?.minQuantity ?? product.minQuantity;
                const stock = variant?.stock ?? product.stock;
                const estimate = variant?.wholesalePrice ?? product.wholesalePrice;
                return (
                  <div key={key} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="font-black">{product.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{variantLabel(variant)} / {variant?.sku || product.sku}</p>
                      {estimate !== null ? <p className="mt-1 text-sm font-bold text-red-600">Estimated {money(estimate)} each</p> : null}
                    </div>
                    <div className="flex h-11 w-fit items-center border border-slate-300 dark:border-slate-700">
                      <button
                        type="button"
                        aria-label={`Reduce ${product.name} quantity`}
                        className="grid h-10 w-10 place-items-center transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 dark:hover:bg-slate-900"
                        onClick={() => updateLine(key, { quantity: Math.max(minimum, line.quantity - 1) })}
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        aria-label={`${product.name} quantity`}
                        type="number"
                        min={minimum}
                        max={stock}
                        value={line.quantity}
                        onChange={(event) => updateLine(key, {
                          quantity: Math.min(stock, Math.max(minimum, Number(event.target.value) || minimum))
                        })}
                        className="h-10 w-20 border-x border-slate-300 bg-transparent text-center font-mono text-sm font-bold outline-none dark:border-slate-700"
                      />
                      <button
                        type="button"
                        aria-label={`Increase ${product.name} quantity`}
                        className="grid h-10 w-10 place-items-center transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 dark:hover:bg-slate-900"
                        onClick={() => updateLine(key, { quantity: Math.min(stock, line.quantity + 1) })}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${product.name}`}
                      className="grid h-11 w-11 place-items-center border border-slate-300 text-slate-500 transition-colors hover:border-red-500 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 dark:border-slate-700"
                      onClick={() => setBasket((current) => current.filter((item) => lineKey(item.productId, item.variantId) !== key))}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {basketTotal > 0 ? (
            <p className="mt-4 text-right text-sm text-slate-500">
              Catalog estimate <strong className="ml-2 text-lg text-slate-950 dark:text-white">{money(basketTotal)}</strong>
            </p>
          ) : null}
        </div>

        <div className="border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Contact details</p>
          <h2 className="mt-2 text-2xl font-black">Request trade pricing</h2>
          <div className="mt-5 grid gap-4">
            <label className="text-sm font-semibold">Company / customer name<input name="customerName" required className="premium-field mt-1 min-h-11 w-full px-3" /></label>
            <label className="text-sm font-semibold">Phone<input name="phone" required minLength={8} className="premium-field mt-1 min-h-11 w-full px-3" /></label>
            <label className="text-sm font-semibold">Email<input name="email" type="email" className="premium-field mt-1 min-h-11 w-full px-3" /></label>
            <label className="text-sm font-semibold">Delivery city<input name="city" required className="premium-field mt-1 min-h-11 w-full px-3" /></label>
            <label className="text-sm font-semibold">Project details / deadline<textarea name="description" maxLength={2000} className="premium-field mt-1 min-h-28 w-full p-3" /></label>
          </div>
          <Button className="mt-5 w-full" variant="accent" disabled={loading || !basket.length}>
            {loading ? "Submitting..." : `Submit ${basket.length || ""} product quotation`}
          </Button>
          <p className="mt-3 text-xs leading-5 text-slate-500">Final price, stock allocation, delivery and validity are confirmed by our wholesale team.</p>
        </div>
      </section>

      {feedback ? (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={`flex items-start gap-2 border p-4 text-sm font-semibold ${
            feedback.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
          {feedback.message}
        </div>
      ) : null}
    </form>
  );
}
