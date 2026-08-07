"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { Chrome, Loader2, UserPlus } from "lucide-react";
import { fetchWithTimeout, notifyAuthChanged, waitForSession } from "@/lib/client-auth";

export function RegisterForm({ googleLoginEnabled = true }: { googleLoginEnabled?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const requestedNext = params.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.startsWith("/admin") ? requestedNext : "/account";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const googleError = params.get("google");
  const googleMessage =
    googleError === "missing"
      ? "Google sign-up is not configured yet. Add the Google OAuth credentials to the environment."
      : googleError === "invalid"
        ? "The Google sign-up session expired. Please try again."
        : googleError === "inactive"
          ? "This customer account is inactive. Please contact support."
          : googleError === "registration-disabled"
            ? "New customer registration is currently disabled."
            : googleError === "failed"
              ? "Google sign-up could not be completed. Please try again."
              : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithTimeout("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form))
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Unable to create account");
        return;
      }
      const session = await waitForSession((value) => Boolean(value && !value.isAdmin));
      if (!session) {
        setError("Account created, but the session could not be confirmed. Please sign in.");
        return;
      }
      notifyAuthChanged();
      router.replace(next);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof DOMException && caught.name === "AbortError" ? "Registration timed out. Please try again." : "Registration is temporarily unavailable");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return <div className="mx-auto max-w-md px-4 py-14">
    <section className="premium-card overflow-hidden rounded-2xl p-0">
      <div className="luminous-dark p-6 text-white">
        <div className="relative mb-5 h-20"><Image src="/brand/htc-logo.png" alt="Hammer Trading Company" fill className="object-contain object-left" sizes="360px" /></div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/70">Private customer account</p>
        <h1 className="mt-2 text-3xl font-black">Create account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-200">Keep your support messages, orders, and saved shopping activity together.</p>
      </div>
      <form onSubmit={(event) => void submit(event)} className="space-y-4 p-6">
        {googleLoginEnabled ? <>
          <a href={`/api/auth/google?flow=register&next=${encodeURIComponent(next)}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">
            <Chrome className="mr-2" size={18} /> Sign up with Google
          </a>
          <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" /></div>
        </> : null}
        {googleMessage ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{googleMessage}</p> : null}
        <label className="block text-sm font-bold">Full name<input name="name" autoComplete="name" required minLength={2} className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>
        <label className="block text-sm font-bold">Email<input name="email" type="email" autoComplete="email" required className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>
        <label className="block text-sm font-bold">Phone <span className="font-normal text-slate-500">(optional)</span><input name="phone" type="tel" autoComplete="tel" className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>
        <label className="block text-sm font-bold">Password<input name="password" type="password" autoComplete="new-password" required minLength={8} className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /><span className="mt-1 block text-xs font-normal text-slate-500">Use uppercase, lowercase, and a number.</span></label>
        <label className="block text-sm font-bold">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>
        {error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <button type="submit" disabled={loading} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-black text-white transition hover:bg-red-800 disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />} Create account</button>
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="block text-center text-sm font-bold text-slate-600 hover:text-red-700">Already registered? Sign in</Link>
      </form>
    </section>
  </div>;
}
