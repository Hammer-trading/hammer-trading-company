"use client";

import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useWishlist } from "@/components/wishlist-provider";
import type { ProductCardSummary } from "@/lib/catalog";

export function WishlistGrid({ products }: { products: ProductCardSummary[] }) {
  const wishlist = useWishlist();
  const visible = wishlist.ready
    ? products.filter((product) => wishlist.productIds.has(product.id))
    : products;

  if (!visible.length) {
    return (
      <div className="mt-8 border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
        <Heart className="mx-auto text-slate-400" />
        <h2 className="mt-4 text-xl font-black">Your wishlist is empty</h2>
        <p className="mt-2 text-sm text-slate-500">Use the heart button on any product to save it here.</p>
      </div>
    );
  }
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {visible.map((product, index) => <ProductCard key={product.id} product={product} index={index} desktopColumns={4} />)}
    </div>
  );
}
