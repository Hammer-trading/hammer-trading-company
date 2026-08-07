import { AdminShell } from "@/components/admin-shell";
import { AdminDeliveryManager } from "@/components/admin-delivery-manager";

export default function AdminDeliveryPage() {
  return (
    <AdminShell>
      <AdminDeliveryManager />
    </AdminShell>
  );
}
