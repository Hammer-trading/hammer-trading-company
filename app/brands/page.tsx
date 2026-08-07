import { getStorefrontBrands } from "@/lib/storefront-products";

export const revalidate = 120;
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await getStorefrontBrands();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Brands</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <a key={brand} href={`/products?brand=${encodeURIComponent(brand)}`} className="rounded-lg border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-glow">
            <h2 className="text-2xl font-black">{brand}</h2>
            <p className="mt-2 text-sm text-slate-600">Shop authorized products and warranty-ready invoices.</p>
          </a>
        ))}
      </div>
    </div>
  );
}
