import { Permission } from "@prisma/client";
import { AdminShell } from "@/components/admin-shell";
import { AdminStore3DManager } from "@/components/admin-store-3d-manager";

export const dynamic = "force-dynamic";

export default function AdminStoreDesignPage() {
  return <AdminShell requiredPermission={Permission.SETTINGS_MANAGE}><AdminStore3DManager /></AdminShell>;
}
