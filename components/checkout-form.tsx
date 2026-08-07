"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { StatusPill } from "@/components/storefront/showroom-primitives";
import { CheckCircle2, Loader2, LockKeyhole, MapPin, Package, ShieldCheck, ShoppingBag, WalletCards } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

const provinces = ["Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Jammu & Kashmir"];

function optionText(options: Record<string, string>) {
  return Object.entries(options).map(([key, value]) => `${key}: ${value}`).join(" / ");
}

export function CheckoutForm() {
  const router = useRouter();
  const cart = useCart();
  const [city, setCity] = useState("Lahore");
  const [customerPhone, setCustomerPhone] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponResult, setCouponResult] = useState<{ code: string; discount: number; freeDelivery: boolean; description?: string | null } | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<{ charge: number; ruleName?: string; estimatedDaysMin?: number; estimatedDaysMax?: number } | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<Array<"COD" | "BANK_TRANSFER">>(["COD"]);
  const [bankInstructions, setBankInstructions] = useState("");

  const deliveryPayload = useMemo(() => ({
    city,
    subtotal: cart.subtotal,
    totalWeightKg: cart.enriched.reduce((sum, line) => sum + line.product.weightKg * line.quantity, 0),
    hasHeavyItem: cart.enriched.some((line) => line.product.isHeavyItem),
    hasBulkyItem: false,
    quantity: cart.enriched.reduce((sum, line) => sum + line.quantity, 0)
  }), [cart.enriched, cart.subtotal, city]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/platform/settings", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("settings unavailable")))
      .then((payload) => {
        const configured = String(payload.settings?.payment_methods || "COD")
          .split(",")
          .map((value) => value.trim().toUpperCase())
          .filter((value): value is "COD" | "BANK_TRANSFER" => value === "COD" || value === "BANK_TRANSFER");
        setPaymentMethods(configured.length ? configured : ["COD"]);
        setBankInstructions(String(payload.settings?.bank_transfer_details || ""));
      })
      .catch(() => setPaymentMethods(["COD"]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!cart.count) {
      setDelivery(null);
      return;
    }
    const controller = new AbortController();
    setDeliveryLoading(true);
    fetch("/api/delivery/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(deliveryPayload),
      signal: controller.signal
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("quote failed")))
      .then((quote) => setDelivery({ charge: Number(quote.charge || 0), ruleName: quote.ruleName, estimatedDaysMin: quote.estimatedDaysMin, estimatedDaysMax: quote.estimatedDaysMax }))
      .catch(() => setDelivery(null))
      .finally(() => setDeliveryLoading(false));
    return () => controller.abort();
  }, [cart.count, deliveryPayload]);

  const discount = couponResult?.discount || 0;
  const deliveryCharge = couponResult?.freeDelivery ? 0 : delivery?.charge ?? 0;
  const total = Math.max(0, cart.subtotal - discount + deliveryCharge);

  async function applyCoupon() {
    if (!coupon.trim() || !cart.lines.length || couponLoading) return;
    setCouponLoading(true);
    setCouponMessage("");
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon, customerPhone, items: cart.lines })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Coupon could not be validated.");
      setCouponResult({
        code: result.code,
        discount: Number(result.discount || 0),
        freeDelivery: Boolean(result.freeDelivery),
        description: result.description
      });
      setCouponMessage(result.description || "Coupon applied.");
    } catch (error) {
      setCouponResult(null);
      setCouponMessage(error instanceof Error ? error.message : "Coupon could not be validated.");
    } finally {
      setCouponLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setMessage("");
    const payload = {
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
      customerPhone: formData.get("customerPhone"),
      province: formData.get("province"),
      city,
      area: formData.get("area"),
      addressLine: formData.get("addressLine"),
      nearestLandmark: formData.get("nearestLandmark"),
      paymentMethod: formData.get("paymentMethod"),
      couponCode: coupon,
      items: cart.lines
    };
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({ error: "Checkout returned an invalid response." }));
      if (!response.ok || result.error) {
        setMessage(result.error || "Checkout failed. Please review your details.");
        return;
      }
      if (result.fallback && result.order) {
        localStorage.setItem(`hammer_order_${result.orderNumber}`, JSON.stringify(result.order));
      }
      cart.clear();
      router.replace(`/orders/${result.orderNumber}`);
    } catch {
      setMessage("Checkout request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto grid max-w-[90rem] gap-6 px-4 pb-24 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-10 lg:pb-10">
      <section className="showroom-panel overflow-hidden p-0">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-red-950 p-5 text-white">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white/80"><ShieldCheck size={14} /> Secure Pakistan checkout</p>
          <h1 className="mt-4 font-display text-5xl font-black uppercase leading-[.85]">Checkout</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">Secure payment options, verified delivery pricing, and QR + OTP delivery confirmation.</p>
        </div>
        <div className="p-5">
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Details", Icon: MapPin },
            { label: "Delivery", Icon: Package },
            { label: "Payment", Icon: WalletCards }
          ].map(({ label, Icon }) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm font-bold"><Icon className="mb-2 text-red-700" size={18} />{label}</div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Full name<input name="customerName" required className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
          <label className="text-sm font-semibold">Phone<input name="customerPhone" required value={customerPhone} onChange={(event) => { setCustomerPhone(event.target.value); setCouponResult(null); }} className="premium-field mt-2 w-full rounded-lg px-3 py-2" placeholder="03XXXXXXXXX" /></label>
          <label className="text-sm font-semibold">Email<input name="customerEmail" type="email" className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
          <label className="text-sm font-semibold">Province<select name="province" required className="premium-field mt-2 w-full rounded-lg px-3 py-2">{provinces.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-sm font-semibold">City<input name="city" value={city} onChange={(event) => setCity(event.target.value)} required className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
          <label className="text-sm font-semibold">Area<input name="area" className="premium-field mt-2 w-full rounded-lg px-3 py-2" placeholder="DHA, Gulberg, Saddar..." /></label>
          <label className="text-sm font-semibold sm:col-span-2">Address<input name="addressLine" required className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Nearest landmark<input name="nearestLandmark" className="premium-field mt-2 w-full rounded-lg px-3 py-2" /></label>
        </div>
        <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 font-bold">Payment</legend>
          {paymentMethods.includes("COD") ? <label className="rounded-xl border border-slate-200 bg-white/75 p-3 shadow-sm transition hover:border-red-200"><input name="paymentMethod" value="COD" type="radio" defaultChecked /> Cash on delivery</label> : null}
          {paymentMethods.includes("BANK_TRANSFER") ? <label className="rounded-xl border border-slate-200 bg-white/75 p-3 shadow-sm transition hover:border-red-200"><input name="paymentMethod" value="BANK_TRANSFER" type="radio" defaultChecked={!paymentMethods.includes("COD")} /> Bank transfer</label> : null}
          {paymentMethods.includes("BANK_TRANSFER") && bankInstructions ? <p className="text-xs leading-5 text-slate-500 sm:col-span-2">{bankInstructions}</p> : null}
        </fieldset>
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><LockKeyhole size={17} /> Your details are used only for order processing and delivery support.</p>
        {message ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}
        </div>
      </section>
      <motion.aside layout className="showroom-panel h-fit p-5 lg:sticky lg:top-24">
        <div className="flex items-center justify-between"><h2 className="font-display text-3xl font-black uppercase">Totals</h2><StatusPill tone="brand">Step 3</StatusPill></div>
        <div className="mt-4 space-y-2 text-sm">
          {cart.enriched.length ? cart.enriched.map((line) => <div key={`${line.productId}-${line.variant.id}-${line.packageId || "single"}`} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-2"><span>{line.quantity} x {line.product.name}{optionText(line.variant.options) ? <small className="block text-slate-500">{optionText(line.variant.options)}</small> : null}{line.packageName ? <small className="block font-bold text-red-700">Package: {line.packageName}</small> : null}</span><strong>{money(line.variant.price * line.quantity)}</strong></div>) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
              <ShoppingBag className="mx-auto text-slate-500" size={24} />
              <p className="mt-2 text-sm font-semibold text-slate-700">Cart is empty.</p>
              <p className="mt-1 text-xs text-slate-500">Add a product to your cart before placing an order.</p>
              <Link href="/products" className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white">Shop products</Link>
            </div>
          )}
          <div className="pt-3">
            <label className="font-semibold" htmlFor="checkout-coupon">Coupon</label>
            <div className="mt-2 flex gap-2">
              <input
                id="checkout-coupon"
                value={coupon}
                onChange={(event) => {
                  setCoupon(event.target.value.toUpperCase());
                  setCouponResult(null);
                  setCouponMessage("");
                }}
                className="premium-field min-h-11 min-w-0 flex-1 rounded-lg px-3 py-2"
                placeholder="Enter coupon code"
              />
              <Button type="button" variant="outline" disabled={couponLoading || !coupon.trim() || !cart.count} onClick={() => void applyCoupon()}>
                {couponLoading ? "Checking..." : "Apply"}
              </Button>
            </div>
            {couponMessage ? <p className={`mt-2 text-xs font-semibold ${couponResult ? "text-emerald-700" : "text-red-700"}`}>{couponMessage}</p> : null}
          </div>
          <div className="flex justify-between pt-3"><span>Subtotal</span><strong>{money(cart.subtotal)}</strong></div>
          <div className="flex justify-between"><span>Discount</span><strong>-{money(discount)}</strong></div>
          <div className="flex justify-between"><span>Delivery</span><strong>{deliveryLoading ? "Calculating..." : money(deliveryCharge)}</strong></div>
          {delivery?.ruleName ? <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600"><CheckCircle2 className="mr-1 inline text-emerald-600" size={14} /> {delivery.ruleName} {delivery.estimatedDaysMax ? `- ${delivery.estimatedDaysMin || 0}-${delivery.estimatedDaysMax} days` : ""}</p> : null}
          <div className="flex justify-between border-t border-slate-200 pt-3 text-lg"><span>Total</span><strong>{money(total)}</strong></div>
        </div>
        <Button type="submit" className="mt-5 w-full" disabled={loading || cart.count === 0}>{loading ? <><Loader2 className="animate-spin" size={17} /> Placing order...</> : "Place order"}</Button>
      </motion.aside>
      {cart.count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-950/15 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-500">Total</p>
              <p className="text-lg font-black">{money(total)}</p>
            </div>
            <Button type="submit" disabled={loading || cart.count === 0} className="shrink-0">
              {loading ? "Placing..." : "Place order"}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
