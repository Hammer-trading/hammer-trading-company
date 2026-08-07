import { NextResponse } from "next/server";
import { adminRoles } from "@/lib/permissions";
import { getSession } from "@/lib/auth";
import { ensureCustomerRecord } from "@/lib/customer-chat";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  const isAdmin = adminRoles.includes(session.role);
  const customer = isAdmin ? null : await ensureCustomerRecord(session).catch(() => null);
  return NextResponse.json({
    user: {
      id: session.id,
      customerPublicId: customer?.customerPublicId || null,
      name: session.name,
      email: session.email,
      role: session.role,
      isAdmin
    }
  });
}
