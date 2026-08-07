import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getFallbackOrder, updateFallbackOrder } from "@/lib/fallback-orders";
import { prisma } from "@/lib/prisma";
import { hashToken, verifyToken } from "@/lib/qr";
import { otpSchema } from "@/lib/validation";
import { isTerminalBlockedForQr } from "@/lib/order-automation";
import { getClientIp, rateLimit, sameOrigin } from "@/lib/security";

type DeliveryToken = {
  orderNumber: string;
  type: string;
};

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    if (!rateLimit(`delivery-confirm:${getClientIp(request)}`, 8, 15 * 60_000)) {
      return NextResponse.json({ error: "Too many confirmation attempts. Please wait and try again." }, { status: 429 });
    }
    const parsed = otpSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid confirmation details" }, { status: 400 });
    const fallbackToken = parsed.data.token.startsWith("fallback-") ? parsed.data.token.replace(/^fallback-/, "") : "";
    let tokenPayload: DeliveryToken;
    if (fallbackToken) {
      tokenPayload = { orderNumber: decodeURIComponent(fallbackToken), type: "DELIVERY_CONFIRMATION" };
    } else {
      tokenPayload = await verifyToken<DeliveryToken>(parsed.data.token);
    }
    if (tokenPayload.type !== "DELIVERY_CONFIRMATION") return NextResponse.json({ error: "Invalid QR token" }, { status: 400 });

    let order;
    try {
      order = await prisma.order.findUnique({
        where: { orderNumber: tokenPayload.orderNumber },
        include: { assignedRider: { select: { name: true } } }
      });
    } catch {
      order = null;
    }
    if (!order && fallbackToken) {
      const fallbackOrder = await getFallbackOrder(tokenPayload.orderNumber);
      if (!fallbackOrder) return NextResponse.json({ error: "Order confirmation is unavailable" }, { status: 404 });
      if (fallbackOrder.status === "DELIVERED" || fallbackOrder.deliveredAt) return NextResponse.json({ error: "Order already confirmed" }, { status: 409 });
      if (["CANCELLED", "RETURNED", "REFUNDED", "DELIVERY_FAILED", "DISPUTED"].includes(fallbackOrder.status)) {
        return NextResponse.json({ error: "This order cannot be confirmed because it is not deliverable" }, { status: 409 });
      }
      const qr = fallbackOrder.qrcodes.find((item) => item.url.includes(parsed.data.token));
      if (qr?.usedAt) return NextResponse.json({ error: "Order already confirmed" }, { status: 409 });
      if (qr?.expiresAt && new Date(qr.expiresAt) < new Date()) return NextResponse.json({ error: "QR token expired" }, { status: 410 });
      if (!fallbackOrder.deliveryOtp || String(parsed.data.otp) !== String(fallbackOrder.deliveryOtp)) {
        return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
      }
      const now = new Date().toISOString();
      await updateFallbackOrder(tokenPayload.orderNumber, {
        status: "DELIVERED",
        deliveredAt: now,
        confirmationMethod: "QR_OTP",
        confirmationGps: parsed.data.gps,
        confirmationPhotoUrl: parsed.data.photoUrl || null,
        deliveryDisputeStatus: parsed.data.issue ? "ISSUE_REPORTED" : null,
        qrcodes: fallbackOrder.qrcodes.map((item) => item.id === qr?.id ? { ...item, usedAt: now } : item),
        timeline: [
          ...fallbackOrder.timeline,
          {
            id: `${fallbackOrder.orderNumber}-delivered-${Date.now()}`,
            status: "DELIVERED",
            note: parsed.data.issue ? `Delivered with issue report: ${parsed.data.issue}` : "Customer confirmed receipt using QR + OTP.",
            createdAt: now
          }
        ]
      });
      return NextResponse.json({ orderNumber: fallbackOrder.orderNumber, status: "DELIVERED", source: "fallback" });
    }

    if (!order || !order.otpHash || !order.qrTokenHash) return NextResponse.json({ error: "Order confirmation is unavailable" }, { status: 404 });
    if (order.status === "DELIVERED" || order.deliveredAt) return NextResponse.json({ error: "Order already confirmed" }, { status: 409 });
    if (isTerminalBlockedForQr(order.status)) return NextResponse.json({ error: "This order cannot be confirmed because it is not deliverable" }, { status: 409 });
    if (order.qrExpiresAt && order.qrExpiresAt < new Date()) return NextResponse.json({ error: "QR token expired" }, { status: 410 });
    if (order.qrTokenHash !== hashToken(parsed.data.token)) return NextResponse.json({ error: "QR token mismatch" }, { status: 400 });

    const validOtp = await bcrypt.compare(parsed.data.otp, order.otpHash);
    if (!validOtp) return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "DELIVERED",
        paymentStatus: order.paymentMethod === "COD" ? "PAID" : order.paymentStatus,
        deliveredAt: new Date(),
        confirmationMethod: "QR_OTP",
        confirmationGps: parsed.data.gps,
        confirmationPhotoUrl: parsed.data.photoUrl || null,
        confirmationRiderName: order.assignedRider?.name || null,
        confirmationCourierName: order.courierName,
        deliveryDisputeStatus: parsed.data.issue ? "ISSUE_REPORTED" : null,
        qrcodes: {
          updateMany: {
            where: { type: "DELIVERY_CONFIRMATION", usedAt: null },
            data: { usedAt: new Date() }
          }
        },
        timeline: {
          create: {
            status: "DELIVERED",
            note: parsed.data.issue ? `Delivered with issue report: ${parsed.data.issue}` : "Customer confirmed receipt using QR + OTP."
          }
        },
        activityLogs: {
          create: {
            action: "DELIVERY_CONFIRMED_QR_OTP",
            metadata: { rating: parsed.data.rating, review: parsed.data.review, issue: parsed.data.issue }
          }
        }
      }
    });

    return NextResponse.json({ orderNumber: updated.orderNumber, status: updated.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Delivery confirmation failed" }, { status: 400 });
  }
}
