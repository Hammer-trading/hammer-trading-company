"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { type CatalogProduct, type CatalogProductVariant } from "@/lib/catalog";

type CartLine = {
  productId: string;
  variantId?: string | null;
  packageId?: string | null;
  packageName?: string | null;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  add: (productId: string, quantity?: number, variantId?: string | null, packageId?: string | null, packageName?: string | null) => void;
  update: (productId: string, quantity: number, variantId?: string | null, packageId?: string | null) => void;
  remove: (productId: string, variantId?: string | null, packageId?: string | null) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  enriched: Array<CartLine & { product: CatalogProduct; variant: CatalogProductVariant }>;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "hammer_cart";

function cleanLines(value: unknown): CartLine[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((line) => ({
      productId: typeof line?.productId === "string" ? line.productId : "",
      variantId: typeof line?.variantId === "string" ? line.variantId : null,
      packageId: typeof line?.packageId === "string" ? line.packageId : null,
      packageName: typeof line?.packageName === "string" ? line.packageName : null,
      quantity: Number.isFinite(Number(line?.quantity)) ? Math.min(Math.max(Number(line.quantity), 1), 99) : 1
    }))
    .filter((line) => line.productId);
}

function lineKey(line: Pick<CartLine, "productId" | "variantId" | "packageId">) {
  return `${line.productId}:${line.variantId || ""}:${line.packageId || ""}`;
}

function mergeHydratedLines(localLines: CartLine[], serverLines: CartLine[]) {
  const merged = new Map(localLines.map((line) => [lineKey(line), line]));
  const localProductVariants = new Set(localLines.map((line) => `${line.productId}:${line.variantId || ""}`));
  for (const line of serverLines) {
    if (!localProductVariants.has(`${line.productId}:${line.variantId || ""}`)) {
      merged.set(lineKey(line), line);
    }
  }
  return Array.from(merged.values());
}

function fallbackVariant(product: CatalogProduct): CatalogProductVariant {
  return {
    id: `${product.id}:default`,
    title: "Default",
    sku: product.sku,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    stock: product.stock,
    imageUrl: product.image,
    options: {},
    isDefault: true,
    isActive: true
  };
}

function resolveVariant(product: CatalogProduct, variantId?: string | null) {
  return product.variants.find((variant) => variant.id === variantId) || product.variants.find((variant) => variant.isDefault) || product.variants[0] || fallbackVariant(product);
}

function saveLines(lines: CartLine[]) {
  try {
    if (lines.length) localStorage.setItem(storageKey, JSON.stringify(lines));
    else localStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable in strict browser modes; the in-memory cart still works.
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [remoteProducts, setRemoteProducts] = useState<CatalogProduct[]>([]);
  const [serverHydrated, setServerHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setLines(cleanLines(JSON.parse(saved)));
    } catch {
      setLines([]);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/cart/track", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ lines?: CartLine[] }> : null)
      .then((result) => {
        const scopedLines = cleanLines(result?.lines || []);
        setLines((current) => {
          const hydrated = mergeHydratedLines(current, scopedLines);
          saveLines(hydrated);
          return hydrated;
        });
        setServerHydrated(true);
      })
      .catch(() => setServerHydrated(true));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const missing = lines.map((line) => line.productId).filter((id) => !remoteProducts.some((item) => item.id === id));
    if (!missing.length) return;
    const controller = new AbortController();
    fetch(`/api/products/cart?ids=${encodeURIComponent(missing.join(","))}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((products: CatalogProduct[]) => {
        if (Array.isArray(products) && products.length) {
          setRemoteProducts((current) => [...current.filter((item) => !products.some((next) => next.id === item.id)), ...products]);
        }
      })
      .catch(() => null);
    return () => controller.abort();
  }, [lines, remoteProducts]);

  useEffect(() => {
    if (!serverHydrated) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/cart/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines })
      })
        .then((response) => response.ok ? response.json() as Promise<{ lines?: CartLine[] }> : null)
        .then((result) => {
          if (!result?.lines) return;
          const accepted = cleanLines(result.lines);
          if (JSON.stringify(accepted) !== JSON.stringify(lines)) {
            setLines(accepted);
            saveLines(accepted);
          }
        })
        .catch(() => null);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [lines, serverHydrated]);

  const enriched = useMemo(
    () =>
      lines
        .map((line) => {
          const product = remoteProducts.find((item) => item.id === line.productId);
          return product ? { ...line, product, variant: resolveVariant(product, line.variantId) } : null;
        })
        .filter(Boolean) as Array<CartLine & { product: CatalogProduct; variant: CatalogProductVariant }>,
    [lines, remoteProducts]
  );

  const value = useMemo<CartContextValue>(() => {
    const subtotal = enriched.reduce((sum, line) => sum + line.variant.price * line.quantity, 0);
    const commit = (updater: (current: CartLine[]) => CartLine[]) => {
      setLines((current) => {
        const next = updater(current);
        saveLines(next);
        return next;
      });
    };
    return {
      lines,
      enriched,
      subtotal,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      add(productId, quantity = 1, variantId = null, packageId = null, packageName = null) {
        commit((current) => {
          const key = lineKey({ productId, variantId, packageId });
          const existing = current.find((line) => lineKey(line) === key);
          if (existing) {
            return current.map((line) =>
              lineKey(line) === key ? { ...line, quantity: Math.min(line.quantity + quantity, 99) } : line
            );
          }
          return [...current, { productId, variantId, packageId, packageName, quantity }];
        });
      },
      update(productId, quantity, variantId = null, packageId = null) {
        commit((current) =>
          quantity <= 0
            ? current.filter((line) => lineKey(line) !== lineKey({ productId, variantId, packageId }))
            : current.map((line) => (lineKey(line) === lineKey({ productId, variantId, packageId }) ? { ...line, quantity } : line))
        );
      },
      remove(productId, variantId = null, packageId = null) {
        commit((current) => current.filter((line) => lineKey(line) !== lineKey({ productId, variantId, packageId })));
      },
      clear() {
        saveLines([]);
        setLines([]);
      }
    };
  }, [enriched, lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
