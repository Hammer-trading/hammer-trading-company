import { Permission } from "@prisma/client";
import { AdminFinanceDashboardLazy } from "@/components/admin-finance-dashboard-lazy";
import { AdminShell } from "@/components/admin-shell";
import {
  getAdminFinanceData,
  getEmptyAdminFinanceData,
  parseFinanceFilters,
  type FinanceFilterInput
} from "@/lib/admin-finance";

export const dynamic = "force-dynamic";

export default async function AdminFinancePage({
  searchParams
}: {
  searchParams: Promise<FinanceFilterInput>;
}) {
  const filters = parseFinanceFilters(await searchParams);
  let content;

  try {
    content = <AdminFinanceDashboardLazy data={await getAdminFinanceData(filters)} />;
  } catch (error) {
    console.error("Admin finance page load failed", error);
    content = (
      <AdminFinanceDashboardLazy
        data={getEmptyAdminFinanceData(filters)}
        notice={{
          title: "Finance data is temporarily unavailable",
          message: "The database could not be reached. No financial records were changed; retry after the connection is restored."
        }}
      />
    );
  }

  return (
    <AdminShell requiredPermission={Permission.REPORTS_READ}>
      {content}
    </AdminShell>
  );
}
