"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

type WishlistContextValue = {
  productIds: Set<string>;
  ready: boolean;
  pendingIds: Set<string>;
  toggle: (productId: string) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [productIds, setProductIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setReady(true);
      return;
    }
    const controller = new AbortController();
    fetch("/api/wishlist", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setSignedIn(false);
          setProductIds(new Set());
          return;
        }
        if (!response.ok) throw new Error(payload.error || "Wishlist unavailable");
        setSignedIn(true);
        setProductIds(new Set(Array.isArray(payload.productIds) ? payload.productIds.map(String) : []));
      })
      .catch(() => {
        setSignedIn(false);
        setProductIds(new Set());
      })
      .finally(() => setReady(true));
    return () => controller.abort();
  }, [pathname]);

  const toggle = useCallback(async (productId: string) => {
    if (pendingIds.has(productId)) return;
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname || "/wishlist")}`);
      return;
    }
    const wasSaved = productIds.has(productId);
    setPendingIds((current) => new Set(current).add(productId));
    setProductIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(productId);
      else next.add(productId);
      return next;
    });
    try {
      const response = await fetch("/api/wishlist", {
        method: wasSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      if (!response.ok) throw new Error("Wishlist update failed");
    } catch {
      setProductIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(productId);
        else next.delete(productId);
        return next;
      });
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }
  }, [pathname, pendingIds, productIds, router, signedIn]);

  const value = useMemo(() => ({ productIds, ready, pendingIds, toggle }), [pendingIds, productIds, ready, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider");
  return context;
}
