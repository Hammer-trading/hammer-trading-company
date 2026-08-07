import { AdminShell } from "@/components/admin-shell";
import { AdminDashboardView } from "@/components/admin-dashboard-view";
import { getAdminDashboardData, getDateRange, getEmptyAdminDashboardData } from "@/lib/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ filter?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const range = getDateRange(params.filter, params.from, params.to);
  let content;
  try {
    const data = await getAdminDashboardData(range);
    content = <AdminDashboardView data={data} filter={range.key} from={range.from.toISOString().slice(0, 10)} to={range.to.toISOString().slice(0, 10)} />;
  } catch {
    const data = getEmptyAdminDashboardData();
    content = (
      <AdminDashboardView
        data={data}
        filter={range.key}
        from={range.from.toISOString().slice(0, 10)}
        to={range.to.toISOString().slice(0, 10)}
        notice={{
          title: "Database connection pending",
          message: "After PostgreSQL is connected, the dashboard will automatically show real sales, orders, stock, customers, and reports."
        }}
      />
    );
  }

  return (
    <AdminShell>
      {content}
    </AdminShell>
  );
}
