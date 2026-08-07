import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!rateLimit(`barcode:${getClientIp(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Too many barcode requests" }, { status: 429 });
  }
  const url = new URL(request.url);
  const data = url.searchParams.get("data") || "";
  if (!data || data.length > 2048) {
    return NextResponse.json({ error: "Invalid barcode data" }, { status: 400 });
  }

  const image = await QRCode.toBuffer(data, {
    type: "png",
    margin: 1,
    width: 280,
    color: { dark: "#111827", light: "#ffffff" }
  });

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store"
    }
  });
}
