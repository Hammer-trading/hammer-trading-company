import { getStorefrontCategories } from "@/lib/storefront-products";

export const revalidate = 120;
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await getStorefrontCategories();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Categories</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((category) => (
          <a key={category} href={`/products?category=${encodeURIComponent(category)}`} className="rounded-lg border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:shadow-glow">
            <h2 className="text-xl font-bold">{category}</h2>
            <p className="mt-2 text-sm text-slate-600">Filter tools, specs, combo offers, and discounts.</p>
          </a>
        ))}
      </div>
    </div>
  );
}
