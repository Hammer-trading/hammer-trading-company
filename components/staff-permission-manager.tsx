"use client";

import type { Permission, Role } from "@prisma/client";
import { FormEvent, useState } from "react";
import { Plus, Power, Save, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { allPermissions, roleLabel } from "@/lib/permissions";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  permissions: Permission[];
};

const roles: Role[] = ["SUPER_ADMIN", "ADMIN", "ORDER_MANAGER", "INVENTORY_MANAGER", "DELIVERY_STAFF", "SUPPORT_STAFF"];
const permissions = allPermissions;

export function StaffPermissionManager({ users }: { users: StaffUser[] }) {
  const [rows, setRows] = useState(users);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  async function save(user: StaffUser) {
    if (!window.confirm(`Save role and permissions for ${user.name}?`)) return;
    const response = await fetch("/api/admin/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, role: user.role, isActive: user.isActive, permissions: user.permissions })
    });
    const result = await response.json();
    setMessage(response.ok ? `Saved permissions for ${user.name}.` : result.error || "Unable to save staff permissions.");
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setCreating(true);
    const response = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const result = await response.json().catch(() => ({}));
    setCreating(false);
    if (!response.ok) return setMessage(result.error || "Unable to create staff account.");
    setRows((current) => [{ ...result, permissions: [] }, ...current]);
    formElement.reset();
    setMessage(`Created ${result.name}.`);
  }

  async function deactivate(user: StaffUser) {
    if (!window.confirm(`Deactivate ${user.name}? Their login will stop immediately.`)) return;
    const response = await fetch(`/api/admin/staff?userId=${encodeURIComponent(user.id)}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || "Unable to deactivate staff account.");
    setRows((current) => current.map((row) => row.id === user.id ? { ...row, isActive: false } : row));
    setMessage(`Deactivated ${user.name}.`);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(event) => void create(event)} className="admin-surface grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-red-700">Primary Admin control</p><h2 className="mt-1 text-xl font-black">Create staff account</h2></div>
        <input name="name" required minLength={2} placeholder="Full name" className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        <input name="email" required type="email" placeholder="Email" className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        <input name="password" required type="password" minLength={8} placeholder="Temporary password" className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
        <select name="role" defaultValue="ADMIN" className="rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950">{roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}</select>
        <Button disabled={creating} variant="accent" className="gap-2"><Plus size={17} />{creating ? "Creating..." : "Create staff"}</Button>
      </form>
      {message ? <p className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white">{message}</p> : null}
      {!rows.length ? <div className="rounded-xl border border-dashed p-10 text-center text-slate-500"><UserCog className="mx-auto mb-3" />No staff accounts are available.</div> : null}
      {rows.map((user) => (
        <div key={user.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black">{user.name}</h3>
              <p className="text-sm text-slate-500">{user.email}</p>
              <p className={`mt-1 text-xs font-black uppercase ${user.isActive ? "text-emerald-600" : "text-red-600"}`}>{user.isActive ? "Active" : "Inactive"}</p>
            </div>
            <select
              value={user.role}
              onChange={(event) => setRows((current) => current.map((row) => row.id === user.id ? { ...row, role: event.target.value as Role } : row))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              {roles.map((role) => <option key={role} value={role}>{roleLabel(role)}</option>)}
            </select>
          </div>
          <label className="mt-4 flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold dark:border-slate-800"><input type="checkbox" checked={user.isActive} onChange={(event) => setRows((current) => current.map((row) => row.id === user.id ? { ...row, isActive: event.target.checked } : row))} /> Active account</label>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {permissions.map((permission) => (
              <label key={permission} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-xs font-semibold dark:border-slate-800">
                <input
                  type="checkbox"
                  checked={user.permissions.includes(permission)}
                  onChange={(event) => {
                    setRows((current) => current.map((row) => {
                      if (row.id !== user.id) return row;
                      const next = event.target.checked ? Array.from(new Set([...row.permissions, permission])) : row.permissions.filter((item) => item !== permission);
                      return { ...row, permissions: next };
                    }));
                  }}
                />
                {permission.replaceAll("_", " ")}
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2"><Button className="gap-2" variant="accent" onClick={() => save(user)}><Save size={17} /> Save role and permissions</Button><Button className="gap-2" variant="outline" onClick={() => void deactivate(user)}><Power size={17} /> Deactivate</Button></div>
        </div>
      ))}
    </div>
  );
}
