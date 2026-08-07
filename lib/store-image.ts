export const STORE_IMAGE_FALLBACK = "/brand/workshop-hero.webp";

const retiredImageTokens = [
  "photo-1609205807107-e8ec2120f9de"
];

export function resolveStoreImage(source?: string | null) {
  const image = source?.trim();
  if (!image || retiredImageTokens.some((token) => image.includes(token))) {
    return STORE_IMAGE_FALLBACK;
  }
  return image;
}
