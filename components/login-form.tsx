"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { Chrome, Loader2, LogIn, UserPlus } from "lucide-react";
import { fetchWithTimeout, notifyAuthChanged, waitForSession } from "@/lib/client-auth";

export function LoginForm({ customerLoginEnabled = true, googleLoginEnabled = true, registrationEnabled = true }: { customerLoginEnabled?: boolean; googleLoginEnabled?: boolean; registrationEnabled?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const requestedNext = params.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.startsWith("/admin") ? requestedNext : "/account";
  const google = params.get("google");
  const disabled = params.get("disabled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const googleMessage =
    google === "missing"
      ? "Google auth credentials are missing. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the environment."
      : google === "invalid"
        ? "The Google login session expired. Please try again."
        : google === "inactive"
          ? "This customer account is inactive. Please contact support."
          : google === "registration-disabled"
            ? "No account exists for this Google email and new registration is currently disabled."
        : google === "failed"
              ? "Google login could not be completed. Check the credentials and callback URL."
              : "";
  const disabledMessage =
    disabled === "google"
      ? "Customer Google login is currently disabled by the administrator."
      : disabled === "registration"
        ? "New customer registration is currently disabled."
        : disabled
          ? "Customer login is currently unavailable."
          : "";

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
        body: JSON.stringify({ email: form.get("email"), password: form.get("password"), adminOnly: false })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Customer login failed");
        return;
      }
      const isAdmin = ["SUPER_ADMIN", "ADMIN", "ORDER_MANAGER", "INVENTORY_MANAGER", "DELIVERY_STAFF", "SUPPORT_STAFF"].includes(String(result.user?.role || ""));
      const session = await waitForSession((value) => Boolean(value && value.isAdmin === isAdmin));
      if (!session) {
        setError("Sign-in completed, but the session could not be confirmed. Please try again.");
        return;
      }
      notifyAuthChanged();
      router.replace(isAdmin ? "/admin" : next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof DOMException && caught.name === "AbortError" ? "Sign-in timed out. Please try again." : "Customer login is temporarily unavailable");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="premium-card overflow-hidden rounded-2xl p-0">
        <div className="luminous-dark p-6 text-white">
        <div className="relative mb-5 h-20 w-full">
          <Image src="/brand/htc-logo.png" alt="Hammer Trading Company" fill className="object-contain object-left" sizes="360px" />
        </div>
        <h1 className="text-3xl font-black">Customer login</h1>
        <p className="mt-2 text-sm text-slate-200">Sign in to access your private messages, account, and saved shopping activity.</p>
        </div>
        <div className="p-6">
        {googleMessage ? <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{googleMessage}</p> : null}
        {disabledMessage ? <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{disabledMessage}</p> : null}
        {customerLoginEnabled ? <>
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <label className="block text-sm font-bold">Email<input name="email" type="email" autoComplete="username" required className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>
            <label className="block text-sm font-bold">Password<input name="password" type="password" autoComplete="current-password" minLength={8} required className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>
            {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
            <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-black text-white transition hover:bg-red-800 disabled:opacity-60">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />} Sign in
            </button>
          </form>
          <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-slate-400"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
          {googleLoginEnabled ? <a href={`/api/auth/google?flow=login&next=${encodeURIComponent(next)}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200">
            <Chrome className="mr-2" size={17} /> Continue with Google
          </a> : null}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-bold">
            {registrationEnabled ? <Link href={`/register?next=${encodeURIComponent(next)}`} className="inline-flex items-center gap-2 text-red-700 hover:text-red-800"><UserPlus size={16} /> Create account</Link> : null}
            <Link href="/forgot-password" className="text-slate-600 hover:text-red-700">Forgot password?</Link>
          </div>
        </> : <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">Customer login is currently disabled. Guest shopping may still be available.</p>}
        </div>
      </div>
    </div>
  );
}
