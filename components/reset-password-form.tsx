"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") || "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: form.get("password"), confirmPassword: form.get("confirmPassword") })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error || "Unable to reset password");
        return;
      }
      setComplete(true);
    } catch {
      setError("Password reset is temporarily unavailable");
    } finally {
      setLoading(false);
    }
  }

  if (complete) return <div className="mx-auto max-w-md px-4 py-14"><section className="premium-card rounded-2xl p-7 text-center"><KeyRound className="mx-auto text-emerald-600" size={32} /><h1 className="mt-4 text-3xl font-black">Password updated</h1><p className="mt-3 text-sm text-slate-600">Your new password is ready. Sign in again to continue.</p><a href="/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-red-700 px-5 text-sm font-black text-white">Sign in</a></section></div>;

  return <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-md px-4 py-14"><section className="premium-card rounded-2xl p-7"><h1 className="text-3xl font-black">Set a new password</h1><p className="mt-2 text-sm text-slate-600">Use at least eight characters with uppercase, lowercase, and a number.</p>{!token ? <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">This reset link is incomplete.</p> : <><label className="mt-5 block text-sm font-bold">New password<input name="password" type="password" autoComplete="new-password" minLength={8} required className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label><label className="mt-4 block text-sm font-bold">Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>{error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}<button disabled={loading} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-black text-white disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />} Update password</button></>}</section></form>;
}
