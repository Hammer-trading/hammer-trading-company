import { redirect } from "next/navigation";
import { WishlistGrid } from "@/components/wishlist-grid";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStorefrontProducts, toProductCardSummary } from "@/lib/storefront-products";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") redirect("/login?next=/wishlist");

  const saved = await prisma.wishlistItem.findMany({
    where: { userId: session.id },
    select: { productId: true },
    orderBy: { createdAt: "desc" }
  });
  const order = new Map(saved.map((item, index) => [item.productId, index]));
  const savedIds = new Set(saved.map((item) => item.productId));
  const products = (await getStorefrontProducts())
    .filter((product) => savedIds.has(product.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map(toProductCardSummary);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-red-600">Customer collection</p>
      <h1 className="mt-2 text-4xl font-black">Wishlist</h1>
      <p className="mt-3 text-slate-600 dark:text-slate-300">Products saved to your private customer account.</p>
      <WishlistGrid products={products} />
    </main>
  );
}
