import { AdminShell } from "@/components/admin-shell";
import { AdminPlatformManager } from "@/components/admin-platform-manager";

export const dynamic = "force-dynamic";

export default function AdminAboutPage() {
  return <AdminShell><AdminPlatformManager initialResource="about"/></AdminShell>;
}
