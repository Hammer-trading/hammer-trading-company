import { AdminMessagesLazy } from "@/components/admin-messages-lazy";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default function AdminMessagesPage() {
  return (
    <AdminShell>
      <AdminMessagesLazy />
    </AdminShell>
  );
}
