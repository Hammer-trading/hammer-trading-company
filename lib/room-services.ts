import { unstable_cache } from "next/cache";
import { tryDatabaseRead } from "@/lib/db-fallback";
import { prisma } from "@/lib/prisma";

export type RoomPackageItem = {
  name: string;
  quantity: number;
  unit: string;
  note?: string | null;
};

export type PublicRoomPackage = {
  id: string;
  name: string;
  slug: string;
  roomType: string;
  description: string;
  image: string | null;
  items: RoomPackageItem[];
  price: number;
  compareAtPrice: number | null;
  durationDays: number;
  isFeatured: boolean;
  sortOrder: number;
};

function imageVersion(value: string) {
  const sample = `${value.length}:${value.slice(0, 64)}:${value.slice(-64)}`;
  let hash = 2166136261;
  for (let index = 0; index < sample.length; index += 1) {
    hash ^= sample.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function roomPackageImageUrl(id: string, value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("data:")) return value;
  return `/api/room-package-images/${id}?v=${imageVersion(value)}`;
}

export function isRoomPackageImageProxy(value: string | null | undefined, id: string) {
  return Boolean(value?.startsWith(`/api/room-package-images/${id}`));
}

export function serializeRoomPackage(row: {
  id: string;
  name: string;
  slug: string;
  roomType: string;
  description: string;
  image: string | null;
  items: unknown;
  price: unknown;
  compareAtPrice: unknown;
  durationDays: number;
  isFeatured: boolean;
  sortOrder: number;
}): PublicRoomPackage {
  const items = Array.isArray(row.items) ? row.items as RoomPackageItem[] : [];
  return {
    ...row,
    image: roomPackageImageUrl(row.id, row.image),
    items,
    price: Number(row.price),
    compareAtPrice: row.compareAtPrice == null ? null : Number(row.compareAtPrice)
  };
}

async function loadRoomPackages() {
  const canonical = await tryDatabaseRead(() => prisma.productPackage.findMany({
    where: { isActive: true, status: "PUBLISHED", installationServiceId: { not: null } },
    include: {
      category: true,
      installationService: true,
      items: { include: { product: true, variant: true }, orderBy: { sortOrder: "asc" } }
    },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }]
  }), 10_000);
  const canonicalRows = (canonical || []).map((bundle) => ({
      id: bundle.id,
      name: bundle.name,
      slug: bundle.slug,
      roomType: bundle.category?.name || bundle.installationService?.name || "Room",
      description: bundle.description,
      image: bundle.coverImage,
      items: bundle.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        unit: "pcs",
        note: item.variant?.title || null
      })),
      price: Number(bundle.finalPrice),
      compareAtPrice: Number(bundle.originalPrice) > Number(bundle.finalPrice) ? Number(bundle.originalPrice) : null,
      durationDays: Math.max(1, Number(bundle.installationService?.estimatedCompletionTime?.match(/\d+/)?.[0] || 1)),
      isFeatured: bundle.isFeatured,
      sortOrder: bundle.sortOrder
    }));
  const legacy = await tryDatabaseRead(() => prisma.roomPackage.findMany({
    where: { isActive: true },
    include: { canonicalPackage: { select: { status: true, isActive: true } } },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }]
  }), 10_000);
  const legacyRows = (legacy || [])
    .filter((row) => !row.canonicalPackage || row.canonicalPackage.status !== "PUBLISHED" || !row.canonicalPackage.isActive)
    .map(serializeRoomPackage);
  return [...canonicalRows, ...legacyRows];
}

export const getRoomPackages = unstable_cache(loadRoomPackages, ["room-packages-v2"], {
  revalidate: 300,
  tags: ["room-packages"]
});
