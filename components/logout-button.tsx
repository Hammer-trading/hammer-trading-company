"use client";

import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchWithTimeout, notifyAuthChanged, waitForSignedOut } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
  iconOnly?: boolean;
  label?: string;
  redirectTo?: string;
  onLoggedOut?: () => void;
  showError?: boolean;
};

export function LogoutButton({
  className,
  iconOnly = false,
  label = "Log out",
  redirectTo = "/",
  onLoggedOut,
  showError = false
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetchWithTimeout("/api/auth/logout", { method: "POST" }, 10_000);
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Logout failed");

      const sessionCleared = await waitForSignedOut(5_000);
      if (!sessionCleared) throw new Error("Your session could not be cleared. Please try again.");

      notifyAuthChanged();
      onLoggedOut?.();
      router.replace(redirectTo);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Logout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void logout()}
        disabled={loading}
        aria-label={loading ? "Signing out" : label}
        title={error || label}
        className={cn(className, "disabled:pointer-events-none disabled:opacity-60")}
      >
        {loading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <LogOut size={18} aria-hidden="true" />}
        {!iconOnly ? <span>{loading ? "Signing out..." : label}</span> : null}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{error}</span>
      {showError && error ? <p role="alert" className="mt-2 text-sm font-bold text-red-700">{error}</p> : null}
    </>
  );
}
