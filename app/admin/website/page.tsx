import { AdminShell } from "@/components/admin-shell";
import { AdminPlatformManager, type AdminPlatformResource } from "@/components/admin-platform-manager";

export const dynamic = "force-dynamic";

const platformTabs = new Set<AdminPlatformResource>([
  "services",
  "service-categories",
  "bookings",
  "packages",
  "package-categories",
  "projects",
  "project-categories",
  "about",
  "media",
  "navigation",
  "sections"
]);

export default async function AdminWebsitePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const requestedTab = (await searchParams).tab as AdminPlatformResource | undefined;
  const initialResource = requestedTab && platformTabs.has(requestedTab) ? requestedTab : "services";
  return <AdminShell><AdminPlatformManager initialResource={initialResource} /></AdminShell>;
}
