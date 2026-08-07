import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const retiredToken = "photo-1609205807107-e8ec2120f9de";
const fallbackImage = "/brand/workshop-hero.webp";
const sql = neon(process.env.DATABASE_URL);

const categoryImages = await sql`
  update "Category"
  set "image" = ${fallbackImage}, "updatedAt" = now()
  where "image" like ${`%${retiredToken}%`}
  returning "id"
`;
const categoryBanners = await sql`
  update "Category"
  set "banner" = ${fallbackImage}, "updatedAt" = now()
  where "banner" like ${`%${retiredToken}%`}
  returning "id"
`;
const productImages = await sql`
  update "ProductImage"
  set "url" = ${fallbackImage}
  where "url" like ${`%${retiredToken}%`}
  returning "id"
`;
const variantImages = await sql`
  update "ProductVariant"
  set "imageUrl" = ${fallbackImage}, "updatedAt" = now()
  where "imageUrl" like ${`%${retiredToken}%`}
  returning "id"
`;
const productPosters = await sql`
  update "Product"
  set "modelPosterUrl" = ${fallbackImage}, "updatedAt" = now()
  where "modelPosterUrl" like ${`%${retiredToken}%`}
  returning "id"
`;

console.log(JSON.stringify({
  categoryImages: categoryImages.length,
  categoryBanners: categoryBanners.length,
  productImages: productImages.length,
  variantImages: variantImages.length,
  productPosters: productPosters.length
}));
