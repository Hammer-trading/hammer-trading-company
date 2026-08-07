"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { fetchWithTimeout, notifyAuthChanged, waitForSession } from "@/lib/client-auth";

export function AdminLoginForm({ devFallbackEnabled = false }: { devFallbackEnabled?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next")?.startsWith("/admin") ? params.get("next")! : "/admin";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithTimeout("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password"), adminOnly: true })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Admin login failed");
        return;
      }
      const session = await waitForSession((value) => Boolean(value?.isAdmin));
      if (!session) {
        setError("Sign-in completed, but the admin session could not be confirmed. Please try again.");
        return;
      }
      notifyAuthChanged();
      router.replace(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof DOMException && caught.name === "AbortError" ? "Admin sign-in timed out. Please try again." : "Admin login is temporarily unavailable");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <section className="premium-card overflow-hidden rounded-2xl p-0">
        <div className="luminous-dark p-6 text-white">
          <div className="relative mb-5 h-20 w-full">
            <Image src="/brand/htc-logo.png" alt="Hammer Trading Company" fill className="object-contain object-left drop-shadow-[0_10px_18px_rgba(0,0,0,.35)]" sizes="360px" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/70">Restricted administration</p>
          <h1 className="mt-2 text-3xl font-black">Admin login</h1>
          <p className="mt-2 text-sm leading-6 text-slate-200">Customer accounts cannot access this secure area.</p>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-4 p-6">
          <label className="block text-sm font-bold">Admin email<input name="email" type="email" autoComplete="username" required className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>
          <label className="block text-sm font-bold">Password<input name="password" type="password" autoComplete="current-password" required className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>
          {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
          <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-black text-white transition hover:bg-red-800 disabled:opacity-60">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />} Sign in securely
          </button>
          <Link href="/forgot-password" className="flex items-center justify-center gap-2 text-sm font-bold text-slate-600 hover:text-red-700"><LockKeyhole size={16} /> Forgot password</Link>
          {devFallbackEnabled ? <a href={`/api/auth/dev-admin?next=${encodeURIComponent(next)}`} className="block text-center text-xs font-bold text-amber-700">Development quick access</a> : null}
        </form>
      </section>
    </div>
  );
}
