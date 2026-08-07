import { unstable_cache } from "next/cache";
import { bannerImageUrl } from "@/lib/banner-images";
import { tryDatabaseRead } from "@/lib/db-fallback";
import { prisma } from "@/lib/prisma";
import { loadNeonHeroBanners } from "@/lib/storefront-neon";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  mobileImage: string | null;
  href: string | null;
  sortOrder: number;
};

async function loadHeroSlides(): Promise<HeroSlide[]> {
  const neonSlides = await loadNeonHeroBanners();
  if (neonSlides) return neonSlides;

  const now = new Date();
  const rows = await tryDatabaseRead(() => prisma.banner.findMany({
    where: {
      type: "HERO",
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }]
    },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }],
    take: 15
  }), 10_000);

  return (rows || []).map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image: bannerImageUrl(row.id, row.image, "desktop") || "/brand/workshop-hero.webp",
    mobileImage: bannerImageUrl(row.id, row.mobileImage, "mobile"),
    href: row.href,
    sortOrder: row.sortOrder
  }));
}

export const getHeroSlides = unstable_cache(loadHeroSlides, ["hero-banners-v1"], {
  revalidate: 300,
  tags: ["hero-banners"]
});

const loadPageHeroSlides = unstable_cache(async (type: string): Promise<HeroSlide[]> => {
  const now = new Date();
  const rows = await tryDatabaseRead(() => prisma.banner.findMany({
    where: {
      type: type.toUpperCase(),
      isActive: true,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }]
    },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "desc" }],
    take: 15
  }), 8_000);
  return (rows || []).map((row) => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    image: bannerImageUrl(row.id, row.image, "desktop") || "/brand/workshop-hero.webp",
    mobileImage: bannerImageUrl(row.id, row.mobileImage, "mobile"),
    href: row.href,
    sortOrder: row.sortOrder
  }));
}, ["page-hero-banners-v1"], { revalidate: 300, tags: ["hero-banners"] });

export async function getPageHeroSlides(type: "PACKAGES_HERO" | "SERVICES_HERO" | "PROJECTS_HERO" | "ABOUT_HERO") {
  return loadPageHeroSlides(type);
}
