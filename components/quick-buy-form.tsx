"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, MapPin, PackageCheck, ShieldCheck } from "lucide-react";
import { type CatalogProduct } from "@/lib/catalog";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SavedAddress = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  province: string;
  city: string;
  area?: string | null;
  addressLine: string;
  nearestLandmark?: string | null;
};

const provinces = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Jammu & Kashmir"];

function optionText(options: Record<string, string>) {
  return Object.entries(options).map(([key, value]) => `${key}: ${value}`).join(" / ");
}

export function QuickBuyForm({
  product,
  savedAddresses,
  initialVariantId
}: {
  product: CatalogProduct;
  savedAddresses: SavedAddress[];
  initialVariantId?: string;
}) {
  const router = useRouter();
  const activeVariants = useMemo(() => product.variants.filter((variant) => variant.isActive), [product.variants]);
  const [selectedVariantId, setSelectedVariantId] = useState(() => {
    if (initialVariantId && activeVariants.some((variant) => variant.id === initialVariantId)) return initialVariantId;
    return activeVariants.find((variant) => variant.isDefault)?.id || activeVariants[0]?.id || "";
  });
  const [quantity, setQuantity] = useState(1);
  const [selectedAddressId, setSelectedAddressId] = useState(savedAddresses[0]?.id || "new");
  const [city, setCity] = useState(savedAddresses[0]?.city || "Lahore");
  const [coupon] = useState("");
  const [delivery, setDelivery] = useState<{ charge: number; ruleName?: string; estimatedDaysMin?: number; estimatedDaysMax?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId);
  const selectedVariant = activeVariants.find((variant) => variant.id === selectedVariantId) || activeVariants[0];
  const selectedPrice = selectedVariant?.price ?? product.price;
  const selectedStock = selectedVariant?.stock ?? product.stock;
  const subtotal = selectedPrice * quantity;

  const deliveryPayload = useMemo(() => ({
    city,
    subtotal,
    totalWeightKg: product.weightKg * quantity,
    hasHeavyItem: Boolean(product.isHeavyItem),
    hasBulkyItem: Boolean(product.isHeavyItem),
    quantity
  }), [city, product.isHeavyItem, product.weightKg, quantity, subtotal]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/delivery/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deliveryPayload),
      signal: controller.signal
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("quote failed")))
      .then((quote) => setDelivery({ charge: Number(quote.charge || 0), ruleName: quote.ruleName, estimatedDaysMin: quote.estimatedDaysMin, estimatedDaysMax: quote.estimatedDaysMax }))
      .catch(() => setDelivery(null));
    return () => controller.abort();
  }, [deliveryPayload]);

  useEffect(() => {
    if (!selectedAddress) return;
    setCity(selectedAddress.city);
  }, [selectedAddress]);

  useEffect(() => {
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(selectedStock, 1))));
  }, [selectedStock]);

  const deliveryCharge = delivery?.charge ?? 0;
  const total = subtotal + deliveryCharge;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setMessage("");
    const payload = {
      customerName: selectedAddress?.fullName || formData.get("customerName"),
      customerEmail: formData.get("customerEmail") || "",
      customerPhone: selectedAddress?.phone || formData.get("customerPhone"),
      province: selectedAddress?.province || formData.get("province"),
      city,
      area: selectedAddress?.area || formData.get("area") || "",
      addressLine: selectedAddress?.addressLine || formData.get("addressLine"),
      nearestLandmark: selectedAddress?.nearestLandmark || formData.get("nearestLandmark") || "",
      paymentMethod: "COD",
      couponCode: coupon,
      items: [{
        productId: product.id,
        variantId: selectedVariant && !selectedVariant.id.endsWith(":default") ? selectedVariant.id : null,
        quantity
      }]
    };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({ error: "Checkout returned an invalid response." }));
      if (!response.ok || result.error) {
        setMessage(result.error || "Buy Now order failed. Please check details.");
        return;
      }
      if (result.fallback && result.order) {
        localStorage.setItem(`hammer_order_${result.orderNumber}`, JSON.stringify(result.order));
      }
      router.replace(`/orders/${result.orderNumber}`);
    } catch {
      setMessage("Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_390px]">
      <section className="premium-card overflow-hidden rounded-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 p-5 text-white">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-white/80"><ShieldCheck size={14} /> One click COD checkout</p>
          <h1 className="mt-4 text-3xl font-black">Buy Now</h1>
          <p className="mt-2 text-sm leading-6 text-slate-200">Select or add an address, confirm COD, and the order will be saved directly to the admin panel.</p>
        </div>
        <div className="grid gap-5 p-5">
          {savedAddresses.length ? (
            <label className="text-sm font-semibold">
              Select saved address
              <select
                value={selectedAddressId}
                onChange={(event) => setSelectedAddressId(event.target.value)}
                className="premium-field mt-2 w-full rounded-lg px-3 py-2"
              >
                {savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.label} - {address.city}</option>)}
                <option value="new">Add new address for this order</option>
              </select>
            </label>
          ) : null}

          {selectedAddress ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-black"><MapPin size={17} /> {selectedAddress.label}</div>
              <p className="mt-2">{selectedAddress.fullName} - {selectedAddress.phone}</p>
              <p>{selectedAddress.addressLine}, {selectedAddress.area ? `${selectedAddress.area}, ` : ""}{selectedAddress.city}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">Full name<input name="customerName" required className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
              <label className="text-sm font-semibold">Phone<input name="customerPhone" required className="premium-field mt-2 w-full rounded-lg px-3 py-2" placeholder="03XXXXXXXXX" /></label>
              <label className="text-sm font-semibold">Email<input name="customerEmail" type="email" className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
              <label className="text-sm font-semibold">Province<select name="province" required className="premium-field mt-2 w-full rounded-lg px-3 py-2">{provinces.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm font-semibold">City<input name="city" value={city} onChange={(event) => setCity(event.target.value)} required className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
              <label className="text-sm font-semibold">Area<input name="area" className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
              <label className="text-sm font-semibold sm:col-span-2">Address<input name="addressLine" required className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
              <label className="text-sm font-semibold sm:col-span-2">Nearest landmark<input name="nearestLandmark" className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white/[0.78] p-4">
            <div className="flex items-center gap-2 font-black"><PackageCheck size={18} /> Cash on Delivery confirmation</div>
            <p className="mt-2 text-sm text-slate-600">Payment method fixed: COD. Admin will receive order notification after confirmation.</p>
          </div>
          {message ? <p className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
        </div>
      </section>
      <motion.aside layout className="premium-card h-fit rounded-2xl p-5 lg:sticky lg:top-24">
        <h2 className="text-xl font-black">Order summary</h2>
        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <strong>{product.name}</strong>
          <p className="mt-1 text-sm text-slate-500">{product.brand} / {product.category}</p>
          {selectedVariant && optionText(selectedVariant.options) ? <p className="mt-2 text-xs font-bold text-red-700">{optionText(selectedVariant.options)}</p> : null}
        </div>
        {activeVariants.length > 1 || (selectedVariant && Object.keys(selectedVariant.options).length > 0) ? (
          <label className="mt-4 block text-sm font-semibold">
            Product option
            <select value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)} className="premium-field mt-2 w-full rounded-lg px-3 py-2">
              {activeVariants.map((variant) => <option key={variant.id} value={variant.id} disabled={variant.stock <= 0}>{variant.title} - {money(variant.price)}{variant.stock <= 0 ? " (out of stock)" : ""}</option>)}
            </select>
          </label>
        ) : null}
        <label className="mt-4 block text-sm font-semibold">Quantity<input type="number" min={1} max={Math.max(selectedStock, 1)} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(Number(event.target.value || 1), Math.max(selectedStock, 1))))} className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
        <div className="mt-5 space-y-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div className="flex justify-between"><span>Delivery</span><strong>{money(deliveryCharge)}</strong></div>
          {delivery?.ruleName ? <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600"><CheckCircle2 className="mr-1 inline text-emerald-600" size={14} /> {delivery.ruleName} {delivery.estimatedDaysMax ? `- ${delivery.estimatedDaysMin || 0}-${delivery.estimatedDaysMax} days` : ""}</p> : null}
          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg"><span>Total COD</span><strong>{money(total)}</strong></div>
        </div>
        <Button type="submit" className="mt-5 w-full" disabled={loading || selectedStock <= 0}>{loading ? <><Loader2 className="animate-spin" size={17} /> Confirming...</> : "Confirm COD order"}</Button>
        {selectedStock <= 0 ? <p className="mt-3 text-sm font-semibold text-red-700">This product option is out of stock.</p> : null}
      </motion.aside>
    </form>
  );
}
