"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function TrackForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  return (
    <div className="mx-auto max-w-xl px-4 py-14">
      <h1 className="text-3xl font-black">Track order</h1>
      <p className="mt-2 text-slate-600">Enter your unique order ID to view timeline, courier, and delivery confirmation status.</p>
      <form
        className="mt-6 flex gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (value.trim()) router.push(`/orders/${encodeURIComponent(value.trim())}`);
        }}
      >
        <input value={value} onChange={(event) => setValue(event.target.value)} className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2" placeholder="HTC-20260616-ABC123" />
        <Button type="submit">Track</Button>
      </form>
    </div>
  );
}
