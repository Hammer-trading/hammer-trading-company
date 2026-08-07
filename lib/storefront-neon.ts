import { neon } from "@neondatabase/serverless";

export type NeonStorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  shortDescription: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  price: string | number;
  compareAtPrice: string | number | null;
  stock: number;
  lowStockThreshold: number;
  weightKg: string | number;
  isHeavyItem: boolean;
  isBestSeller: boolean;
  isFeatured: boolean;
  modelUrl: string | null;
  modelPosterUrl: string | null;
  wholesalePrice: string | number | null;
  minWholesaleQuantity: number;
  brand: { name: string } | null;
  category: { name: string } | null;
  images: Array<{ id: string; url: string; alt: string | null; isMain: boolean; sortOrder: number }>;
  specs: Array<{ name: string; value: string }>;
  reviews: Array<{ rating: number }>;
  variants: Array<{
    id: string;
    title: string;
    sku: string;
    barcode: string | null;
    price: string | number;
    compareAtPrice: string | number | null;
    stock: number;
    imageUrl: string | null;
    modelUrl: string | null;
    options: unknown;
    isDefault: boolean;
    isActive: boolean;
    wholesalePrice: string | number | null;
    minWholesaleQuantity: number;
  }>;
};

export type NeonStorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  banner: string | null;
  sortOrder: number;
};

export type NeonHeroBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  mobileImage: string | null;
  href: string | null;
  sortOrder: number;
};

let sqlClient: ReturnType<typeof neon> | null | undefined;

function getSqlClient() {
  if (sqlClient !== undefined) return sqlClient;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    sqlClient = null;
    return sqlClient;
  }

  try {
    const host = new URL(databaseUrl.replace(/^postgres(ql)?:/, "https:")).hostname;
    sqlClient = host.endsWith("neon.tech") ? neon(databaseUrl) : null;
  } catch {
    sqlClient = null;
  }
  return sqlClient;
}

async function queryRows<T>(query: string, params: unknown[] = [], timeoutMs = 10_000): Promise<T[] | null> {
  const sql = getSqlClient();
  if (!sql) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      sql.query(query, params) as unknown as Promise<T[]>,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Neon storefront query timed out")), timeoutMs);
      })
    ]);
  } catch (error) {
    console.error("Neon storefront query failed", error instanceof Error ? error.message : error);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type ProductBase = Omit<NeonStorefrontProduct, "brand" | "category" | "images" | "specs" | "reviews" | "variants"> & {
  brandName: string;
  categoryName: string;
};

type ImageRow = NeonStorefrontProduct["images"][number] & { productId: string };
type SpecRow = NeonStorefrontProduct["specs"][number] & { productId: string };
type ReviewRow = NeonStorefrontProduct["reviews"][number] & { productId: string };
type VariantRow = NeonStorefrontProduct["variants"][number] & { productId: string };

let pendingProducts: Promise<NeonStorefrontProduct[] | null> | null = null;

async function fetchNeonStorefrontProducts() {
  const sql = getSqlClient();
  if (!sql) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const results = await Promise.race([
      sql.transaction((tx) => [
        tx.query(`
      select
        p.id, p.name, p.slug, p.sku, p.description,
        p."shortDescription", p."seoTitle", p."seoDescription",
        p.price::text as price, p."compareAtPrice"::text as "compareAtPrice",
        p.stock, p."lowStockThreshold", p."weightKg"::text as "weightKg",
        p."isHeavyItem", p."isBestSeller", p."isFeatured",
        p."modelUrl", p."modelPosterUrl",
        p."wholesalePrice"::text as "wholesalePrice", p."minWholesaleQuantity",
        b.name as "brandName", c.name as "categoryName"
      from "Product" p
      join "Brand" b on b.id = p."brandId"
      join "Category" c on c.id = p."categoryId"
      where p."isActive" = true
      order by p."isFeatured" desc, p."createdAt" desc
        `),
        tx.query(`
      select
        i."productId", i.id,
        case when i.url like 'data:%' then '/api/product-images/' || i.id else i.url end as url,
        i.alt, i."isMain", i."sortOrder"
      from "ProductImage" i
      join "Product" p on p.id = i."productId"
      where p."isActive" = true
      order by i."isMain" desc, i."sortOrder" asc
        `),
        tx.query(`
      select s."productId", s.name, s.value
      from "ProductSpec" s
      join "Product" p on p.id = s."productId"
      where p."isActive" = true
      order by s.name asc
        `),
        tx.query(`
      select r."productId", r.rating
      from "Review" r
      join "Product" p on p.id = r."productId"
      where p."isActive" = true and r."isApproved" = true
        `),
        tx.query(`
      select
        v."productId", v.id, v.title, v.sku, v.barcode,
        v.price::text as price, v."compareAtPrice"::text as "compareAtPrice",
        v.stock,
        case when v."imageUrl" like 'data:%' then null else v."imageUrl" end as "imageUrl",
        v."modelUrl", v.options, v."isDefault", v."isActive",
        v."wholesalePrice"::text as "wholesalePrice", v."minWholesaleQuantity"
      from "ProductVariant" v
      join "Product" p on p.id = v."productId"
      where p."isActive" = true
      order by v."isDefault" desc, v."createdAt" asc
        `)
      ], { readOnly: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Neon catalog transaction timed out")), 15_000);
      })
    ]);
    const [baseRows, imageRows, specRows, reviewRows, variantRows] = results as unknown as [ProductBase[], ImageRow[], SpecRow[], ReviewRow[], VariantRow[]];

    const products = new Map<string, NeonStorefrontProduct>();
    for (const row of baseRows) {
      const { brandName, categoryName, ...product } = row;
      products.set(row.id, {
        ...product,
        brand: { name: brandName },
        category: { name: categoryName },
        images: [],
        specs: [],
        reviews: [],
        variants: []
      });
    }

    for (const { productId, ...image } of imageRows) products.get(productId)?.images.push(image);
    for (const { productId, ...spec } of specRows) products.get(productId)?.specs.push(spec);
    for (const { productId, ...review } of reviewRows) products.get(productId)?.reviews.push(review);
    for (const { productId, ...variant } of variantRows) products.get(productId)?.variants.push(variant);
    return Array.from(products.values());
  } catch (error) {
    console.error("Neon catalog transaction failed", error instanceof Error ? error.message : error);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function loadNeonStorefrontProducts() {
  if (!pendingProducts) {
    const request = fetchNeonStorefrontProducts();
    pendingProducts = request;
    void request.finally(() => {
      if (pendingProducts === request) pendingProducts = null;
    });
  }
  return pendingProducts;
}

export async function loadNeonStorefrontProduct(slug: string) {
  const products = await loadNeonStorefrontProducts();
  return products ? products.filter((product) => product.slug === slug) : null;
}

export function loadNeonStorefrontCategories() {
  return queryRows<NeonStorefrontCategory>(`
    select id, name, slug, description, image, banner, "sortOrder"
    from "Category"
    where "isActive" = true
    order by "sortOrder" asc, name asc
  `);
}

export async function loadNeonStorefrontBrands() {
  const rows = await queryRows<{ name: string }>(`
    select name
    from "Brand"
    where "isActive" = true
    order by name asc
  `);
  return rows?.map((row) => row.name) ?? null;
}

export async function loadNeonProductImage(id: string) {
  const rows = await queryRows<{ url: string; isActive: boolean }>(`
    select i.url, p."isActive"
    from "ProductImage" i
    join "Product" p on p.id = i."productId"
    where i.id = $1
    limit 1
  `, [id], 30_000);
  return rows?.[0] ?? null;
}

export function loadNeonHeroBanners() {
  return queryRows<NeonHeroBanner>(`
    select
      id, title, subtitle,
      case
        when image like 'data:%' then '/api/banner-images/' || id || '?kind=desktop&v=' || abs(hashtext(image))::text
        else image
      end as image,
      case
        when "mobileImage" like 'data:%' then '/api/banner-images/' || id || '?kind=mobile&v=' || abs(hashtext("mobileImage"))::text
        else "mobileImage"
      end as "mobileImage",
      href, "sortOrder"
    from "Banner"
    where "isActive" = true
      and type = 'HERO'
      and "startsAt" <= now()
      and ("endsAt" is null or "endsAt" > now())
    order by "sortOrder" asc, "startsAt" desc
    limit 15
  `);
}

export async function loadNeonBannerImage(id: string) {
  const rows = await queryRows<{ image: string; mobileImage: string | null }>(`
    select image, "mobileImage"
    from "Banner"
    where id = $1
    limit 1
  `, [id], 30_000);
  return rows?.[0] ?? null;
}
