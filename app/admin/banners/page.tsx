import { AdminShell } from "@/components/admin-shell";
import { HeroBannerManager } from "@/components/admin/hero-banner-manager";

export const dynamic = "force-dynamic";

export default function AdminBannersPage() {
  return <AdminShell><HeroBannerManager /></AdminShell>;
}
