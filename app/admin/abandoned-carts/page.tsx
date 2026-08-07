import { AdminShell } from "@/components/admin-shell";
import { AdminResourcePage } from "@/components/admin-resource-page";
import { AdminAbandonedCartManager } from "@/components/admin-abandoned-cart-manager";

export const dynamic = "force-dynamic";

export default function AdminAbandonedCartsPage() {
  return (
    <AdminShell>
      <AdminResourcePage title="Abandoned carts" description="View abandoned carts, send recovery templates, and mark carts recovered or closed.">
        <AdminAbandonedCartManager />
      </AdminResourcePage>
    </AdminShell>
  );
}
