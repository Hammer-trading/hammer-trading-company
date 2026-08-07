import { NextResponse } from "next/server";
import { calculateDelivery } from "@/lib/delivery";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (!rateLimit(`delivery-quote:${getClientIp(request)}`, 40, 60_000)) return NextResponse.json({ error: "Too many quote requests" }, { status: 429 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid delivery request" }, { status: 400 });
  try {
    const rules = await prisma.deliveryRule.findMany();
    return NextResponse.json(calculateDelivery(body, rules));
  } catch {
    return NextResponse.json({ error: "Delivery service is unavailable" }, { status: 503 });
  }
}
