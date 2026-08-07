import { NextResponse } from "next/server";
import { getRoomPackages } from "@/lib/room-services";

export async function GET() {
  return NextResponse.json(await getRoomPackages(), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" }
  });
}
