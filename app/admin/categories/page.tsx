import { AdminShell } from "@/components/admin-shell";
import { AdminTaxonomyManager } from "@/components/admin-taxonomy-manager";

export const dynamic = "force-dynamic";

export default function AdminCategoriesPage() {
  return (
    <AdminShell>
      <AdminTaxonomyManager type="categories" />
    </AdminShell>
  );
}
