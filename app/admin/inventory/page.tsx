import { AdminShell } from "@/components/admin-shell";
import { AdminInventoryManager } from "@/components/admin-inventory-manager";

export const dynamic = "force-dynamic";

export default function AdminInventoryPage() {
  return (
    <AdminShell>
      <AdminInventoryManager />
    </AdminShell>
  );
}
