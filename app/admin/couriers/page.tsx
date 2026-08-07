import { AdminShell } from "@/components/admin-shell";
import { AdminCourierRiderManager } from "@/components/admin-courier-rider-manager";

export const dynamic = "force-dynamic";

export default function AdminCouriersPage() {
  return (
    <AdminShell>
      <AdminCourierRiderManager type="couriers" />
    </AdminShell>
  );
}
