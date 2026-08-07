import { unstable_cache } from "next/cache";
import { tryDatabaseRead } from "@/lib/db-fallback";
import { prisma } from "@/lib/prisma";

const loadPublishedServices = unstable_cache(async (featured: boolean, homepage: boolean, take: number) => {
  return (await tryDatabaseRead(() => prisma.homeService.findMany({
    where: {
      status: "PUBLISHED",
      isActive: true,
      ...(featured ? { isFeatured: true } : {}),
      ...(homepage ? { showOnHomepage: true } : {})
    },
    include: { category: true, products: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } } }, orderBy: { sortOrder: "asc" } }, _count: { select: { bookings: true, projects: true } } },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: take || undefined
  }), 6_000)) || [];
}, ["published-services-v2"], { revalidate: 300, tags: ["platform-content"] });

export async function getPublishedServices(options?: { featured?: boolean; homepage?: boolean; take?: number }) {
  return loadPublishedServices(Boolean(options?.featured), Boolean(options?.homepage), Number(options?.take || 0));
}

const loadPublishedService = unstable_cache(async (slug: string) => tryDatabaseRead(() => prisma.homeService.findFirst({
    where: { slug, status: "PUBLISHED", isActive: true },
    include: {
      category: true,
      products: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" } }, variants: { where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] } } } }, orderBy: { sortOrder: "asc" } },
      packages: { where: { status: "PUBLISHED", isActive: true }, include: { items: { include: { product: true, variant: true } } }, orderBy: { sortOrder: "asc" } },
      projects: { where: { status: "PUBLISHED" }, include: { media: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } }
    }
  }), 6_000), ["published-service-v2"], { revalidate: 300, tags: ["platform-content"] });

export async function getPublishedService(slug: string) {
  return loadPublishedService(slug);
}

const loadPublishedPackages = unstable_cache(async (featured: boolean, homepage: boolean, take: number) => {
  return (await tryDatabaseRead(() => prisma.productPackage.findMany({
    where: {
      status: "PUBLISHED",
      isActive: true,
      ...(featured ? { isFeatured: true } : {}),
      ...(homepage ? { showOnHomepage: true } : {})
    },
    include: { category: true, installationService: { select: { id: true, name: true, slug: true } }, items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } }, variant: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: take || undefined
  }), 6_000)) || [];
}, ["published-packages-v2"], { revalidate: 300, tags: ["platform-content"] });

export async function getPublishedPackages(options?: { featured?: boolean; homepage?: boolean; take?: number }) {
  return loadPublishedPackages(Boolean(options?.featured), Boolean(options?.homepage), Number(options?.take || 0));
}

const loadPublishedPackage = unstable_cache(async (slug: string) => tryDatabaseRead(() => prisma.productPackage.findFirst({
    where: { slug, status: "PUBLISHED", isActive: true },
    include: { category: true, installationService: true, items: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" } }, variants: { where: { isActive: true } } } }, variant: true }, orderBy: { sortOrder: "asc" } } }
  }), 6_000), ["published-package-v2"], { revalidate: 300, tags: ["platform-content"] });

export async function getPublishedPackage(slug: string) {
  return loadPublishedPackage(slug);
}

const loadPublishedProjects = unstable_cache(async (featured: boolean, homepage: boolean, take: number) => {
  return (await tryDatabaseRead(() => prisma.project.findMany({
    where: {
      status: "PUBLISHED",
      ...(featured ? { isFeatured: true } : {}),
      ...(homepage ? { showOnHomepage: true } : {})
    },
    include: { category: true, service: { select: { id: true, name: true, slug: true } }, updates: { where: { isPublic: true }, orderBy: [{ occurredAt: "desc" }, { sortOrder: "asc" }] }, media: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" } }, products: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } }, variant: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    take: take || undefined
  }), 6_000)) || [];
}, ["published-projects-v2"], { revalidate: 300, tags: ["platform-content"] });

export async function getPublishedProjects(options?: { featured?: boolean; homepage?: boolean; take?: number }) {
  return loadPublishedProjects(Boolean(options?.featured), Boolean(options?.homepage), Number(options?.take || 0));
}

const loadPublishedProject = unstable_cache(async (slug: string) => tryDatabaseRead(() => prisma.project.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { category: true, service: true, updates: { where: { isPublic: true }, orderBy: [{ occurredAt: "desc" }, { sortOrder: "asc" }] }, media: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" } }, products: { include: { product: { include: { images: { orderBy: { sortOrder: "asc" } }, variants: { where: { isActive: true } } } }, variant: true }, orderBy: { sortOrder: "asc" } } }
  }), 6_000), ["published-project-v2"], { revalidate: 300, tags: ["platform-content"] });

export async function getPublishedProject(slug: string) {
  return loadPublishedProject(slug);
}

const loadPublishedAboutPage = unstable_cache(async () => tryDatabaseRead(() => prisma.aboutPage.findFirst({
  where: { slug: "about", status: "PUBLISHED" },
  orderBy: { updatedAt: "desc" }
}), 6_000), ["published-about-v1"], { revalidate: 300, tags: ["platform-content"] });

export async function getPublishedAboutPage() {
  return loadPublishedAboutPage();
}

export const getPublicNavigation = unstable_cache(async () => {
  return (await tryDatabaseRead(() => prisma.navigationItem.findMany({
    where: { isActive: true, parentId: null },
    include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } },
    orderBy: [{ location: "asc" }, { sortOrder: "asc" }]
  }), 5_000)) || [];
}, ["public-navigation-v2"], { revalidate: 300, tags: ["platform-content"] });

export const getHomepageSections = unstable_cache(async () => {
  return (await tryDatabaseRead(() => prisma.homepageSection.findMany({ where: { status: "PUBLISHED" }, orderBy: { sortOrder: "asc" } }), 5_000)) || [];
}, ["homepage-sections-v2"], { revalidate: 300, tags: ["platform-content"] });

export function packageAvailableStock(packageItem: { quantity: number; product: { stock: number }; variant?: { stock: number } | null }[]) {
  if (!packageItem.length) return 0;
  return Math.max(0, Math.min(...packageItem.map((item) => Math.floor(Number(item.variant?.stock ?? item.product.stock) / item.quantity))));
}
