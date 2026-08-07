import { AdminShell } from "@/components/admin-shell";
import { AdminEmptyState, AdminResourcePage } from "@/components/admin-resource-page";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminActivityLogsPage() {
  let logs: Array<{ id: string; action: string; entity: string | null; entityId: string | null; ipAddress: string | null; createdAt: Date; actor: { name: string } | null }> = [];
  try {
    logs = await prisma.activityLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  } catch {}
  return (
    <AdminShell>
      <AdminResourcePage title="Activity Logs" description="Audit trail for admin actions, delivery confirmation, staff changes, and order events." stats={[{ label: "Recent logs", value: logs.length }]}>
        {logs.length ? <div className="grid gap-3">{logs.map((item) => <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><strong>{item.action.replaceAll("_", " ")}</strong><p className="text-sm text-slate-500">{item.actor?.name || "System"} - {item.entity || "System"} {item.entityId || ""} - {item.ipAddress || "no-ip"} - {item.createdAt.toLocaleString()}</p></div>)}</div> : <AdminEmptyState title="No activity logs" body="Admin actions and automation events will be written here." />}</AdminResourcePage>
    </AdminShell>
  );
}
