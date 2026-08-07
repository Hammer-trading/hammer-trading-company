import { NextResponse } from "next/server";
import { getHomepageSections, getPublicNavigation, getPublishedAboutPage, getPublishedPackages, getPublishedProjects, getPublishedServices } from "@/lib/platform-content";
import { getStorefrontCategories } from "@/lib/storefront-products";

type Context = { params: Promise<{ resource: string }> };

function publicJson(body: unknown) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" }
  });
}

export async function GET(request: Request, context: Context) {
  const { resource } = await context.params;
  const search = new URL(request.url).searchParams;
  const options = {
    featured: search.get("featured") === "true",
    homepage: search.get("homepage") === "true",
    take: Math.min(60, Math.max(1, Number(search.get("take") || 30)))
  };
  if (resource === "services") return publicJson({ items: await getPublishedServices(options) });
  if (resource === "packages") return publicJson({ items: await getPublishedPackages(options) });
  if (resource === "projects") return publicJson({ items: await getPublishedProjects(options) });
  if (resource === "about") return publicJson({ item: await getPublishedAboutPage() });
  if (resource === "categories") {
    const categories = await getStorefrontCategories();
    const uniqueCategories = Array.from(
      new Map(
        categories
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => [name.toLocaleLowerCase("en"), name])
      ).values()
    );
    return publicJson({
      items: uniqueCategories.map((name) => ({
        name,
        href: `/products?category=${encodeURIComponent(name)}`
      }))
    });
  }
  if (resource === "navigation") return publicJson({ items: await getPublicNavigation() });
  if (resource === "sections") return publicJson({ items: await getHomepageSections() });
  return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
}
