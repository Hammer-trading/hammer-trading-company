import { Permission } from "@prisma/client";
import { requirePermission } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const admin = await requirePermission(Permission.PRODUCTS_READ);
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const csv = toCsv([{
    sku: "HTC-SAMPLE-001",
    barcode: "1234567890",
    title: "Sample Hammer",
    slug: "sample-hammer",
    brand: "Stanley",
    category: "Hand Tools",
    subcategory: "",
    purchase_price: "1000",
    selling_price: "1500",
    discount_price: "1400",
    dealer_price: "1300",
    wholesale_price: "1200",
    min_wholesale_qty: "10",
    stock: "25",
    minimum_stock: "5",
    weight_kg: "0.8",
    dimensions: "30x10x4 cm",
    warranty: "Supplier warranty",
    return_policy: "7 days for defective item",
    description: "Sample product description",
    specifications: "Material:Steel|Handle:Fiberglass",
    tags: "hammer|hand-tool",
    seo_title: "Sample Hammer",
    seo_description: "Buy sample hammer",
    featured: "false",
    best_seller: "false",
    new_arrival: "true",
    heavy_or_bulky: "false",
    active: "true",
    image_urls: "https://example.com/image.jpg"
  }]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=hammer-product-template.csv"
    }
  });
}
