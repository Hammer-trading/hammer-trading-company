"use client";

import { KeyRound, Laptop, LogOut, MailCheck, RefreshCw, Save, ShieldCheck, UserRound } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type AccountSession = {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

type AdminAccount = {
  id: string;
  name: string;
  email: string;
  role: string;
  profileImage?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  sessions: AccountSession[];
};

function deviceLabel(userAgent?: string | null) {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const os = /Windows/.test(userAgent) ? "Windows" : /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Mac OS/.test(userAgent) ? "macOS" : "Device";
  return `${browser} on ${os}`;
}

export function AdminAccountManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [name, setName] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(() => searchParams.get("email") === "verified" ? "Admin email verified. Previous sessions were signed out." : "");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/account", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Account could not be loaded");
      setAccount(data.account);
      setName(data.account.name || "");
      setProfileImage(data.account.profileImage || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Account could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("profile"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, profileImage: profileImage || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Profile update failed");
      setAccount((current) => current ? { ...current, ...data.account } : current);
      setNotice("Admin profile updated.");
      router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Profile update failed"); }
    finally { setBusy(""); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("password"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/account/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword"), confirmPassword: form.get("confirmPassword") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Password change failed");
      event.currentTarget.reset();
      setNotice(data.message || "Password changed.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Password change failed"); }
    finally { setBusy(""); }
  }

  async function requestEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy("email"); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/account/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: form.get("currentPassword"), newEmail: form.get("newEmail") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Email change request failed");
      event.currentTarget.reset();
      setNotice(data.message || "Verification email sent.");
      if (data.verificationUrl) window.location.assign(data.verificationUrl);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Email change request failed"); }
    finally { setBusy(""); }
  }

  async function revokeSession(session: AccountSession) {
    if (!window.confirm(session.isCurrent ? "Sign out this current session?" : "Revoke this device session?")) return;
    setBusy(session.id); setError("");
    try {
      const response = await fetch(`/api/admin/account/sessions/${session.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Session could not be revoked");
      if (data.current) { router.push("/admin/login"); router.refresh(); return; }
      setNotice("Device session revoked.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Session could not be revoked"); }
    finally { setBusy(""); }
  }

  async function logoutAll() {
    if (!window.confirm("Sign out every admin device, including this one?")) return;
    setBusy("all-sessions"); setError("");
    try {
      const response = await fetch("/api/admin/account/sessions", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sessions could not be revoked");
      router.push("/admin/login"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Sessions could not be revoked"); setBusy(""); }
  }

  return (
    <div className="space-y-5">
      <header className="admin-page-hero p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="inline-flex items-center gap-2 text-xs font-black uppercase text-red-700"><ShieldCheck size={16} /> Account security</p><h1 className="mt-2 text-3xl font-black">Admin Account</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Manage the verified admin identity, password and signed-in devices. Passwords are never displayed or stored as plain text.</p></div>
          <Button type="button" variant="outline" onClick={() => void load()} disabled={loading} className="gap-2"><RefreshCw size={17} /> Refresh</Button>
        </div>
      </header>

      {notice ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/25 dark:text-emerald-100" role="status">{notice}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800 dark:border-red-900 dark:bg-red-950/25 dark:text-red-100" role="alert">{error}</div> : null}

      {loading || !account ? <div className="admin-surface h-64 animate-pulse rounded-lg" /> : (
        <div className="grid gap-5 xl:grid-cols-2">
          <form onSubmit={saveProfile} className="admin-surface rounded-lg p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-black"><UserRound size={19} /> Profile</h2>
            <div className="mt-4 grid gap-4">
              <label className="text-sm font-bold">Admin name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
              <label className="text-sm font-bold">Profile image URL<input value={profileImage} onChange={(event) => setProfileImage(event.target.value)} placeholder="https://..." className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
              <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900 sm:grid-cols-2"><span><strong className="block text-xs uppercase text-slate-500">Login email</strong>{account.email}</span><span><strong className="block text-xs uppercase text-slate-500">Role</strong>{account.role.replaceAll("_", " ")}</span></div>
              <Button type="submit" variant="accent" disabled={busy === "profile"} className="gap-2"><Save size={17} /> Save profile</Button>
            </div>
          </form>

          <form onSubmit={changePassword} className="admin-surface rounded-lg p-5">
            <h2 className="inline-flex items-center gap-2 text-lg font-black"><KeyRound size={19} /> Change password</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">Use 12+ characters with uppercase, lowercase, number and symbol. Previous devices will be signed out.</p>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-bold">Current password<input name="currentPassword" type="password" autoComplete="current-password" required className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
              <label className="text-sm font-bold">New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
              <label className="text-sm font-bold">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
              <Button type="submit" variant="accent" disabled={busy === "password"} className="gap-2"><KeyRound size={17} /> Update password</Button>
            </div>
          </form>

          {account.role === "SUPER_ADMIN" ? (
            <form onSubmit={requestEmailChange} className="admin-surface rounded-lg p-5">
              <h2 className="inline-flex items-center gap-2 text-lg font-black"><MailCheck size={19} /> Primary Admin email</h2>
              <p className="mt-2 text-xs leading-5 text-slate-500">Current login: <strong>{account.email}</strong>. A new address becomes active only after email verification.</p>
              <div className="mt-4 grid gap-3">
                <label className="text-sm font-bold">New email<input name="newEmail" type="email" autoComplete="email" required className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
                <label className="text-sm font-bold">Current password<input name="currentPassword" type="password" autoComplete="current-password" required className="premium-field mt-1 w-full rounded-lg px-3 py-2.5" /></label>
                <Button type="submit" variant="outline" disabled={busy === "email"} className="gap-2"><MailCheck size={17} /> Send verification</Button>
              </div>
            </form>
          ) : null}

          <section className="admin-surface rounded-lg p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="inline-flex items-center gap-2 text-lg font-black"><Laptop size={19} /> Active sessions</h2><p className="mt-1 text-xs text-slate-500">Last login: {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : "Not recorded"}</p></div><Button type="button" variant="outline" onClick={() => void logoutAll()} disabled={busy === "all-sessions"} className="gap-2 text-red-700"><LogOut size={16} /> Log out all</Button></div>
            <div className="mt-4 grid gap-2">
              {account.sessions.length ? account.sessions.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"><div className="min-w-0"><strong className="text-sm">{deviceLabel(session.userAgent)} {session.isCurrent ? <span className="ml-1 text-emerald-700">Current</span> : null}</strong><p className="mt-1 text-xs text-slate-500">{session.ipAddress || "IP unavailable"} · Active {new Date(session.lastSeenAt).toLocaleString()}</p></div><button type="button" onClick={() => void revokeSession(session)} disabled={busy === session.id} className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-red-300 hover:text-red-700 disabled:opacity-50 dark:border-slate-700" aria-label={`Revoke ${deviceLabel(session.userAgent)}`} title="Revoke session"><LogOut size={16} /></button></div>) : <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">No active sessions found.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

