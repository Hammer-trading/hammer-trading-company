import type { ReactNode } from "react";
import type { Permission } from "@prisma/client";
import { redirect } from "next/navigation";
import { AdminShellClient } from "@/components/admin-shell-client";
import { requireAdmin, requirePermission } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { normalizeAdminUiLayout, normalizeAdminUiTheme } from "@/lib/theme-config";

export async function AdminShell({
  children,
  requiredPermission
}: {
  children: ReactNode;
  requiredPermission?: Permission;
}) {
  const user = requiredPermission
    ? await requirePermission(requiredPermission)
    : await requireAdmin();
  if (!user) redirect("/admin/login?next=/admin");
  const settings = await getSettings(["admin_ui_theme", "admin_ui_layout"]);
  return <AdminShellClient user={user} initialDesign={normalizeAdminUiTheme(settings.admin_ui_theme)} initialLayout={normalizeAdminUiLayout(settings.admin_ui_layout)}>{children}</AdminShellClient>;
}
