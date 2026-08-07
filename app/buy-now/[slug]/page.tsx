import { notFound } from "next/navigation";
import { QuickBuyForm } from "@/components/quick-buy-form";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorefrontProduct } from "@/lib/storefront-products";

export const dynamic = "force-dynamic";

export default async function BuyNowPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variantId?: string }>;
}) {
  const { slug } = await params;
  const { variantId } = await searchParams;
  const product = await getStorefrontProduct(slug);
  if (!product) notFound();
  const session = await getSession();
  const savedAddresses = session?.role === "CUSTOMER"
    ? await prisma.address.findMany({
        where: { userId: session.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        take: 6
      }).then((rows) => rows.map((address) => ({
        id: address.id,
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        province: address.province,
        city: address.city,
        area: address.area,
        addressLine: address.addressLine,
        nearestLandmark: address.nearestLandmark
      }))).catch(() => [])
    : [];

  return <QuickBuyForm product={product} savedAddresses={savedAddresses} initialVariantId={variantId} />;
}
