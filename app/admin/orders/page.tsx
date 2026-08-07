import { AdminShell } from "@/components/admin-shell";
import { AdminOrderManager } from "@/components/admin-order-manager";

export const dynamic = "force-dynamic";

export default function AdminOrdersPage() {
  return (
    <AdminShell>
      <AdminOrderManager />
    </AdminShell>
  );
}
