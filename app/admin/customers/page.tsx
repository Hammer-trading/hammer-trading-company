import { AdminShell } from "@/components/admin-shell";
import { CustomerManager } from "@/components/admin-simple-managers";
export const dynamic = "force-dynamic";
export default function AdminCustomersPage(){return <AdminShell><CustomerManager /></AdminShell>;}
