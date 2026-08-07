"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email") })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setError(result.error || "Unable to request a reset link");
      else setMessage(result.message || "If the account exists, reset instructions will be sent.");
    } catch {
      setError("Password reset is temporarily unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={submit} className="mx-auto max-w-md px-4 py-14">
      <div className="premium-card rounded-2xl p-6">
        <h1 className="text-3xl font-black">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-600">Enter your account email. A secure reset link will be sent if the account exists.</p>
        <label className="mt-5 block text-sm font-semibold">Email<input name="email" type="email" autoComplete="email" required className="premium-field mt-2 min-h-11 w-full rounded-lg px-3" /></label>
        <Button disabled={loading} className="mt-5 w-full gap-2" variant="accent">{loading ? <Loader2 className="animate-spin" size={17} /> : <Mail size={17} />} Send reset link</Button>
        {message ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{message}</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
        <a href="/login" className="mt-4 block text-center text-sm font-bold text-slate-600 hover:text-red-700">Back to customer login</a>
      </div>
    </form>
  );
}
