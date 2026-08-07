"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, PackageCheck, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/utils";

type PackageOption = {
  id: string;
  name: string;
  sku: string;
  finalPrice: number;
  itemCount: number;
};

export function ServiceBookingForm({
  serviceId,
  serviceName,
  availableTimeSlots = [],
  packages = [],
  initialPackageId = ""
}: {
  serviceId: string;
  serviceName: string;
  availableTimeSlots?: string[];
  packages?: PackageOption[];
  initialPackageId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [packageId, setPackageId] = useState(packages.some((item) => item.id === initialPackageId) ? initialPackageId : "");
  const selectedPackage = packages.find((item) => item.id === packageId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/service-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          packageId: packageId || null,
          customerName: data.get("customerName"),
          phone: data.get("phone"),
          email: data.get("email"),
          address: data.get("address"),
          city: data.get("city"),
          area: data.get("area"),
          preferredDate: data.get("preferredDate") || null,
          preferredTime: data.get("preferredTime") || null,
          projectDetails: data.get("projectDetails"),
          customerNote: data.get("customerNote"),
          attachments: []
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Booking could not be saved");
      form.reset();
      setPackageId("");
      setResult({ ok: true, message: `Request ${payload.booking.requestNumber} received. Our team will contact you shortly.` });
    } catch (error) {
      setResult({ ok: false, message: error instanceof Error ? error.message : "Booking failed" });
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={(event) => void submit(event)} className="grid gap-4" aria-label={`Book ${serviceName}`}>
    <div className="grid gap-4 sm:grid-cols-2">
      {packages.length ? <label className="text-sm font-bold sm:col-span-2">Room package<select name="packageId" value={packageId} onChange={(event) => setPackageId(event.target.value)} className="store-input mt-1.5 w-full"><option value="">Custom service quotation</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.finalPrice)}</option>)}</select>{selectedPackage ? <span className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-800"><span className="inline-flex items-center gap-2"><PackageCheck size={15}/>{selectedPackage.name}</span><span>{selectedPackage.itemCount} products · {selectedPackage.sku}</span></span> : null}</label> : null}
      <label className="text-sm font-bold">Full name<input name="customerName" required minLength={2} className="store-input mt-1.5 w-full" /></label>
      <label className="text-sm font-bold">Phone<input name="phone" required minLength={7} className="store-input mt-1.5 w-full" /></label>
      <label className="text-sm font-bold">Email<input name="email" type="email" className="store-input mt-1.5 w-full" /></label>
      <label className="text-sm font-bold">City<input name="city" required className="store-input mt-1.5 w-full" /></label>
      <label className="text-sm font-bold sm:col-span-2">Full address<input name="address" required minLength={8} className="store-input mt-1.5 w-full" /></label>
      <label className="text-sm font-bold">Area<input name="area" className="store-input mt-1.5 w-full" /></label>
      <label className="text-sm font-bold">Preferred date<input name="preferredDate" type="date" min={new Date().toISOString().slice(0, 10)} className="store-input mt-1.5 w-full" /></label>
      <label className="text-sm font-bold">Preferred time<select name="preferredTime" className="store-input mt-1.5 w-full"><option value="">Any available time</option>{availableTimeSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
      <label className="text-sm font-bold sm:col-span-2">Project details<textarea name="projectDetails" rows={4} className="store-input mt-1.5 w-full resize-y py-3" placeholder="Room, fittings, measurements, site condition, or installation requirements" /></label>
      <label className="text-sm font-bold sm:col-span-2">Additional note<textarea name="customerNote" rows={3} className="store-input mt-1.5 w-full resize-y py-3" /></label>
    </div>
    {result ? <p role="status" className={`rounded-lg p-3 text-sm font-semibold ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{result.ok ? <CheckCircle2 size={17} className="mr-2 inline"/> : null}{result.message}</p> : null}
    <Button type="submit" variant="accent" disabled={loading} className="w-full sm:w-fit">{loading ? <Loader2 size={17} className="animate-spin"/> : <Send size={17}/>} {loading ? "Sending..." : "Submit service request"}</Button>
  </form>;
}
