import { NextResponse } from "next/server";
import { getStorefrontCategories, getStorefrontProducts } from "@/lib/storefront-products";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const limit = Math.min(12, Math.max(4, Number(url.searchParams.get("limit") || 8)));
  const [products, categories] = await Promise.all([getStorefrontProducts(), getStorefrontCategories()]);

  const productMatches = products
    .filter((product) => {
      if (!q) return product.isBestSeller || product.isFeatured || product.stock <= 10;
      const haystack = [product.name, product.sku, product.brand, product.category, product.shortDescription].join(" ").toLowerCase();
      return haystack.includes(q);
    })
    .sort((a, b) => Number(Boolean(b.isBestSeller || b.isFeatured)) - Number(Boolean(a.isBestSeller || a.isFeatured)) || b.stock - a.stock)
    .slice(0, limit)
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      stock: product.stock,
      image: product.image,
      rating: product.rating,
      isBestSeller: product.isBestSeller,
      isFeatured: product.isFeatured
    }));

  const categoryMatches = categories
    .filter((category) => !q || category.toLowerCase().includes(q))
    .slice(0, 6)
    .map((category) => ({
      name: category,
      href: `/products?category=${encodeURIComponent(category)}`
    }));

  return NextResponse.json({
    q,
    products: productMatches,
    categories: categoryMatches,
    actions: [
      { label: "Track an order", href: "/track", hint: "Order status and timeline" },
      { label: "Wholesale quote", href: "/wholesale", hint: "Bulk pricing request" },
      { label: "Checkout", href: "/checkout", hint: "Complete your cart" }
    ]
  }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
  });
}
