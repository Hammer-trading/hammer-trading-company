import { Permission } from "@prisma/client";
import { AdminShell } from "@/components/admin-shell";
import { AdminThemeDesigner } from "@/components/admin-theme-designer";

export const dynamic = "force-dynamic";

export default function AdminStoreDesignPage() {
  return <AdminShell requiredPermission={Permission.SETTINGS_MANAGE}><AdminThemeDesigner /></AdminShell>;
}
