"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { X, ShoppingCart, Plus, Minus, Trash2, PackageCheck } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { Button, LinkButton } from "@/components/ui/button";
import { money } from "@/lib/utils";

type CartDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const cart = useCart();
  const reduceMotion = useReducedMotion();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, reduceMotion ? 0 : 200);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[100]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button className="absolute inset-0 bg-slate-950/45" onClick={handleClose} aria-label="Close cart" />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            className="absolute right-0 top-0 h-dvh w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-950"
            initial={reduceMotion ? false : { x: "100%" }}
            animate={{ x: isClosing ? "100%" : 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-black uppercase">Your Cart</h2>
              <button type="button" autoFocus onClick={handleClose} className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-800 transition-colors hover:bg-slate-200 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600/30 dark:bg-slate-800 dark:text-white" aria-label="Close cart">
                <X size={19} />
              </button>
            </div>

            {cart.enriched.length === 0 ? (
              <div className="premium-card mt-6 rounded-2xl p-8 text-center">
                <PackageCheck className="mx-auto text-red-700" size={36} />
                <h3 className="mt-3 text-xl font-black">Your cart is empty</h3>
                <p className="mt-2 text-slate-600">Add products to your cart and they will appear here.</p>
                <LinkButton href="/products" className="mt-4" variant="accent" onClick={handleClose}>Continue shopping</LinkButton>
              </div>
            ) : (
              <>
                <div className="premium-card mt-6 divide-y divide-slate-200 overflow-hidden rounded-2xl">
                  {cart.enriched.map((line) => (
                    <motion.div key={`${line.productId}-${line.variant.id}-${line.packageId || "single"}`} layout className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto]">
                      <Link href={`/products/${line.product.slug}`} onClick={handleClose} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        <Image src={line.variant.imageUrl || line.product.image} alt={line.product.name} fill className="object-cover" sizes="64px" unoptimized={(line.variant.imageUrl || line.product.image).startsWith("data:")} />
                      </Link>
                      <div className="min-w-0">
                        <Link href={`/products/${line.product.slug}`} onClick={handleClose} className="line-clamp-2 text-sm font-bold hover:text-red-700">{line.product.name}</Link>
                        {line.variant.options && Object.keys(line.variant.options).length > 0 ? (
                          <p className="mt-1 text-xs text-slate-500">{Object.entries(line.variant.options).map(([k, v]) => `${k}: ${v}`).join(" / ")}</p>
                        ) : null}
                        <p className="mt-1 text-xs font-semibold text-slate-700">{money(line.variant.price)} each</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center rounded-md border border-slate-300">
                          <button className="grid size-7 place-items-center" onClick={() => cart.update(line.productId, line.quantity - 1, line.variantId, line.packageId)} aria-label="Decrease quantity">
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{line.quantity}</span>
                          <button className="grid size-7 place-items-center" onClick={() => cart.update(line.productId, line.quantity + 1, line.variantId, line.packageId)} aria-label="Increase quantity">
                            <Plus size={14} />
                          </button>
                        </div>
                        <button className="grid size-7 place-items-center rounded-md text-red-600 hover:bg-red-50" onClick={() => cart.remove(line.productId, line.variantId, line.packageId)} aria-label="Remove item">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="showroom-panel mt-6 p-5">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <strong>{money(cart.subtotal)}</strong>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Delivery calculated at checkout</p>
                  <LinkButton href="/checkout" className="mt-4 w-full" onClick={handleClose}>Checkout</LinkButton>
                  <Link href="/cart" onClick={handleClose} className="mt-2 block text-center text-xs font-bold text-slate-600 hover:text-red-700">View full cart</Link>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
