import { redirect } from "next/navigation";
import { CustomerMessagesClient } from "@/components/customer-messages-client";
import { getSession } from "@/lib/auth";
import { adminRoles } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function CustomerMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account/messages");
  if (adminRoles.includes(session.role)) redirect("/admin/messages");
  return <CustomerMessagesClient />;
}
