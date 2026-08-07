"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";

export function AddToCartButton({ productId, variantId, label = "Add to cart", disabled = false }: { productId: string; variantId?: string | null; label?: string; disabled?: boolean }) {
  const cart = useCart();
  return (
    <Button variant="accent" className="gap-2" onClick={() => cart.add(productId, 1, variantId)} disabled={disabled}>
      <ShoppingCart size={18} /> {label}
    </Button>
  );
}
