"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

type Rule = {
  id: string;
  name: string;
  city?: string | null;
  area?: string | null;
  zone?: string | null;
  baseCharge: string;
  standardCharge: string;
  heavyItemCharge: string;
  bulkyItemCharge: string;
  sameDayCharge: string;
  freeDeliveryThreshold?: string | null;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
};

export function AdminDeliveryManager() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/delivery-rules")
      .then((response) => response.ok ? response.json() : [])
      .then(setRules)
      .catch(() => setRules([]));
  }, []);

  async function submit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch("/api/admin/delivery-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Unable to save delivery rule. Login as admin first.");
      return;
    }
    setRules((current) => [result, ...current]);
    setMessage("Delivery rule saved.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-3xl font-black">Delivery rules</h1>
        <p className="mt-2 text-slate-600">Admin-editable city, area, weight, heavy item, same-day, pickup, free threshold, and delivery estimates.</p>
        <div className="mt-6 grid gap-3">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <strong>{rule.name}</strong>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs">{rule.isActive ? "Active" : "Inactive"}</span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {rule.city || "All cities"} / {rule.area || "All areas"} / {rule.zone || "All zones"} - Standard {money(rule.standardCharge || rule.baseCharge)} - Heavy {money(rule.heavyItemCharge)} - Bulky {money(rule.bulkyItemCharge)} - Same-day {money(rule.sameDayCharge)}
              </p>
            </div>
          ))}
          {rules.length === 0 ? <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-600">No rules loaded yet. Seed the database or login as admin to create rules.</p> : null}
        </div>
      </section>
      <form action={submit} className="h-fit rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold">Add delivery rule</h2>
        <div className="mt-4 grid gap-3">
          <input name="name" required placeholder="Rule name" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="city" placeholder="City, optional" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="area" placeholder="Area, optional" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="zone" placeholder="Zone, optional" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="minWeightKg" type="number" min="0" placeholder="Min weight kg" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="maxWeightKg" type="number" min="0" placeholder="Max weight kg" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="minQuantity" type="number" min="0" placeholder="Min quantity" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="baseCharge" required type="number" min="0" placeholder="Base charge" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="standardCharge" type="number" min="0" defaultValue="0" placeholder="Standard delivery charge" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="heavyItemCharge" type="number" min="0" defaultValue="0" placeholder="Heavy item charge" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="bulkyItemCharge" type="number" min="0" defaultValue="0" placeholder="Bulky product charge" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="sameDayCharge" type="number" min="0" defaultValue="0" placeholder="Same-day charge" className="rounded-md border border-slate-300 px-3 py-2" />
          <input name="freeDeliveryThreshold" type="number" min="0" placeholder="Free delivery threshold" className="rounded-md border border-slate-300 px-3 py-2" />
          <div className="grid grid-cols-2 gap-3">
            <input name="estimatedDaysMin" type="number" min="3" defaultValue="3" className="rounded-md border border-slate-300 px-3 py-2" />
            <input name="estimatedDaysMax" type="number" min="0" defaultValue="5" className="rounded-md border border-slate-300 px-3 py-2" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input name="storePickupEnabled" type="checkbox" /> Store pickup enabled</label>
          <label className="flex items-center gap-2 text-sm"><input name="standardDeliveryEnabled" type="checkbox" defaultChecked /> Standard delivery enabled</label>
          <label className="flex items-center gap-2 text-sm"><input name="sameDayDeliveryEnabled" type="checkbox" /> Same-day enabled</label>
          <label className="flex items-center gap-2 text-sm"><input name="quotationRequiredForBulk" type="checkbox" /> Quotation required for bulk/heavy</label>
          <label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked /> Active</label>
          <Button variant="accent">Save rule</Button>
          {message ? <p className="rounded-md bg-slate-50 p-3 text-sm">{message}</p> : null}
        </div>
      </form>
    </div>
  );
}
