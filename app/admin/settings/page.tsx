import { AdminShell } from "@/components/admin-shell";
import { SettingsManager } from "@/components/admin-ops-managers";
export const dynamic = "force-dynamic";
export default function AdminSettingsPage(){return <AdminShell><SettingsManager /></AdminShell>;}
