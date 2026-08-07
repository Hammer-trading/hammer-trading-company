"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, PackageCheck, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import { motion } from "motion/react";
import { ProductMeta, StatusPill } from "@/components/storefront/showroom-primitives";
import { useCart } from "@/components/cart-provider";
import { Button, LinkButton } from "@/components/ui/button";
import { money } from "@/lib/utils";

function optionText(options: Record<string, string>) {
  return Object.entries(options).map(([key, value]) => `${key}: ${value}`).join(" / ");
}

export function CartPage() {
  const cart = useCart();
  return (
    <div className="store-cart-layout mx-auto grid max-w-[90rem] gap-6 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-10 lg:pb-10">
      <section>
        <div className="showroom-utility-panel luminous-dark p-6 text-white shadow-xl shadow-[#0b3038]/15">
          <p className="showroom-eyebrow text-red-300">Order workspace / {cart.count} items</p>
          <h1 className="mt-3 font-display text-5xl font-black uppercase leading-[.85]">Review your tools</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">Variant selections, quantities, and product totals stay separate for clean order processing.</p>
        </div>
        {cart.enriched.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="premium-card mt-6 rounded-2xl p-8 text-center">
            <PackageCheck className="mx-auto text-red-700" size={36} />
            <h2 className="mt-3 text-xl font-black">Your cart is empty</h2>
            <p className="mt-2 text-slate-600">Add products, choose variants, and come back here to checkout.</p>
            <LinkButton href="/products" className="mt-4" variant="accent">Continue shopping</LinkButton>
          </motion.div>
        ) : (
          <div className="premium-card mt-6 divide-y divide-slate-200 overflow-hidden rounded-2xl">
            {cart.enriched.map((line) => (
              <motion.div key={`${line.productId}-${line.variant.id}-${line.packageId || "single"}`} layout className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <div className="flex min-w-0 gap-4">
                  <Link href={`/products/${line.product.slug}`} className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                    <Image src={line.variant.imageUrl || line.product.image} alt={line.product.name} fill className="object-cover" sizes="80px" unoptimized={(line.variant.imageUrl || line.product.image).startsWith("data:")} />
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/products/${line.product.slug}`} className="line-clamp-2 font-bold hover:text-safety">{line.product.name}</Link>
                    <div className="mt-1"><ProductMeta brand={line.product.brand} category={optionText(line.variant.options) || undefined} sku={line.variant.sku} /></div>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{money(line.variant.price)} each</p>
                    {optionText(line.variant.options) ? <p className="mt-1 text-xs font-semibold text-slate-600">{optionText(line.variant.options)}</p> : null}
                    {line.packageName ? <p className="mt-1 text-xs font-bold text-red-700">Package: {line.packageName}</p> : null}
                  </div>
                </div>
                <div className="flex w-fit items-center rounded-md border border-slate-300">
                  <button className="grid size-10 place-items-center" onClick={() => cart.update(line.productId, line.quantity - 1, line.variantId, line.packageId)} aria-label="Decrease quantity"><Minus size={16} /></button>
                  <span className="w-10 text-center font-bold">{line.quantity}</span>
                  <button className="grid size-10 place-items-center" onClick={() => cart.update(line.productId, line.quantity + 1, line.variantId, line.packageId)} aria-label="Increase quantity"><Plus size={16} /></button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <strong>{money(line.variant.price * line.quantity)}</strong>
                  <button className="grid size-10 place-items-center rounded-md text-red-600 hover:bg-red-50" onClick={() => cart.remove(line.productId, line.variantId, line.packageId)} aria-label="Remove item"><Trash2 size={18} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
      <aside className="showroom-panel h-fit p-5 lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-3"><h2 className="font-display text-3xl font-black uppercase">Order summary</h2><StatusPill tone="brand">Secure</StatusPill></div>
        <div className="mt-4 flex justify-between text-sm"><span>Subtotal</span><strong>{money(cart.subtotal)}</strong></div>
        <div className="mt-2 flex justify-between text-sm"><span>Delivery</span><span>Calculated at checkout</span></div>
        <div className="mt-4 grid gap-2 text-sm">
          <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800"><ShieldCheck size={17} /> Secure checkout flow</p>
          <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 font-semibold text-slate-700"><Truck size={17} /> Delivery quote on next step</p>
        </div>
        {cart.count > 0
          ? <LinkButton href="/checkout" className="mt-5 w-full">Checkout</LinkButton>
          : <Button className="mt-5 w-full" disabled>Checkout</Button>}
      </aside>
      {cart.count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-950/15 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-500">{cart.count} item{cart.count === 1 ? "" : "s"}</p>
              <p className="text-lg font-black">{money(cart.subtotal)}</p>
            </div>
            <LinkButton href="/checkout" className="shrink-0">Checkout</LinkButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
