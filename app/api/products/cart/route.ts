import { NextResponse } from "next/server";
import { getStorefrontProducts } from "@/lib/storefront-products";

export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean).slice(0, 100);
  if (!ids.length) return NextResponse.json([]);
  const requestedIds = new Set(ids);
  const products = await getStorefrontProducts();
  return NextResponse.json(products.filter((product) => requestedIds.has(product.id)), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
  });
}
