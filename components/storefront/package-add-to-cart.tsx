"use client";

import { useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";

type PackageLine = { productId: string; variantId?: string | null; quantity: number };

export function PackageAddToCart({ packageId, packageName, lines, disabled = false }: { packageId: string; packageName: string; lines: PackageLine[]; disabled?: boolean }) {
  const cart = useCart();
  const router = useRouter();
  const [added, setAdded] = useState(false);

  function addPackage() {
    for (const line of lines) cart.add(line.productId, line.quantity, line.variantId, packageId, packageName);
    setAdded(true);
    window.setTimeout(() => router.push("/cart"), 450);
  }

  return <Button variant="accent" className="w-full" disabled={disabled || !lines.length} onClick={addPackage}>{added ? <Check size={18}/> : <ShoppingCart size={18}/>} {disabled ? "Package unavailable" : added ? "Added to cart" : "Add entire package"}</Button>;
}

