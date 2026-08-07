import { NextResponse } from "next/server";
import { Permission } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deliveryRuleSchema } from "@/lib/validation";

export async function GET() {
  const admin = await requirePermission(Permission.DELIVERY_READ);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rules = await prisma.deliveryRule.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const admin = await requirePermission(Permission.DELIVERY_WRITE);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = deliveryRuleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid delivery rule", details: parsed.error.flatten() }, { status: 400 });
  const rule = await prisma.deliveryRule.create({ data: parsed.data });
  await prisma.activityLog.create({ data: { actorId: admin.id, action: "DELIVERY_RULE_CREATED", metadata: { ruleId: rule.id } } });
  return NextResponse.json(rule);
}
