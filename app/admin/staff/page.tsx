import { AdminShell } from "@/components/admin-shell";
import { AdminResourcePage } from "@/components/admin-resource-page";
import { StaffPermissionManager } from "@/components/staff-permission-manager";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Permission, Role } from "@prisma/client";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login?next=/admin/staff");
  if (admin.role !== "SUPER_ADMIN") redirect("/admin");
  let users: Array<{ id: string; name: string; email: string; role: Role; isActive: boolean; permissions: Array<{ permission: Permission }> }> = [];
  try {
    users = await prisma.user.findMany({ where: { role: { not: "CUSTOMER" } }, include: { permissions: true }, orderBy: { createdAt: "desc" } });
  } catch {}
  return (
    <AdminShell>
      <AdminResourcePage title="Staff" description="Manage staff roles, permissions, active status, and forgot-password-ready account structure." stats={[{ label: "Staff accounts", value: users.length }]}>
        <StaffPermissionManager users={users.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, permissions: user.permissions.map((item) => item.permission) }))} />
      </AdminResourcePage>
    </AdminShell>
  );
}
