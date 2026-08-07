import { AdminMessagesLazy } from "@/components/admin-messages-lazy";
import { AdminShell } from "@/components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminMessageDetailPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return (
    <AdminShell>
      <AdminMessagesLazy initialConversationId={conversationId} />
    </AdminShell>
  );
}
