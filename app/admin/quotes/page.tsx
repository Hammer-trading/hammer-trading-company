import { AdminShell } from "@/components/admin-shell";
import { AdminResourcePage } from "@/components/admin-resource-page";
import { AdminQuoteManager } from "@/components/admin-quote-manager";

export const dynamic = "force-dynamic";

export default function AdminQuotesPage() {
  return (
    <AdminShell>
      <AdminResourcePage title="Quote requests" description="Review bulk quote requests, reply to customers, approve/reject quotes, and convert approved quotes into COD orders.">
        <AdminQuoteManager />
      </AdminResourcePage>
    </AdminShell>
  );
}
