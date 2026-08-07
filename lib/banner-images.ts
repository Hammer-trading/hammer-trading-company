export type BannerImageKind = "desktop" | "mobile";

function imageVersion(value: string) {
  const sample = `${value.length}:${value.slice(0, 96)}:${value.slice(-96)}`;
  let hash = 2166136261;
  for (let index = 0; index < sample.length; index += 1) {
    hash ^= sample.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function bannerImageUrl(id: string, value: string | null | undefined, kind: BannerImageKind) {
  if (!value) return null;
  if (!value.startsWith("data:")) return value;
  return `/api/banner-images/${id}?kind=${kind}&v=${imageVersion(value)}`;
}

export function isBannerImageProxy(value: string | null | undefined, id: string, kind: BannerImageKind) {
  return Boolean(value?.startsWith(`/api/banner-images/${id}?kind=${kind}`));
}

export function publicBannerRecord<T extends { id: string; image: string; mobileImage: string | null }>(banner: T) {
  return {
    ...banner,
    image: bannerImageUrl(banner.id, banner.image, "desktop") || "/brand/workshop-hero.webp",
    mobileImage: bannerImageUrl(banner.id, banner.mobileImage, "mobile")
  };
}
