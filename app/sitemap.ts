import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";
import { getPublishedPackages, getPublishedProjects, getPublishedServices } from "@/lib/platform-content";
import { getStorefrontProducts } from "@/lib/storefront-products";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl();
  const [products, services, packages, projects] = await Promise.all([
    getStorefrontProducts(),
    getPublishedServices(),
    getPublishedPackages(),
    getPublishedProjects()
  ]);
  const staticRoutes = ["", "/about", "/products", "/categories", "/brands", "/home-service", "/services", "/packages", "/projects", "/cart", "/checkout", "/track", "/wholesale", "/shipping", "/returns"];

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1 : 0.7
    })),
    ...products.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8
    })),
    ...services.map((service) => ({ url: `${baseUrl}/services/${service.slug}`, lastModified: service.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...packages.map((bundle) => ({ url: `${baseUrl}/packages/${bundle.slug}`, lastModified: bundle.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...projects.map((project) => ({ url: `${baseUrl}/projects/${project.slug}`, lastModified: project.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 }))
  ];
}
