import type { CatalogProduct, CatalogProductVariant } from "@/lib/catalog";

type CatalogSnapshot = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  compareAtPrice: number;
  stock: number;
  rating: number;
  image: string;
  weightKg: number;
  isHeavyItem: boolean;
  hasSizeVariants?: boolean;
};

// Last-resort read-only snapshot of the live catalog. Database results always take priority.
const liveCatalogSnapshot: CatalogSnapshot[] = [
  {
    id: "seed-dewalt-angle-grinder-900w",
    name: "DeWalt Angle Grinder 900W",
    slug: "dewalt-angle-grinder-900w",
    sku: "HTC-GRD-900-5-INCH-BLACK",
    category: "Power Tools",
    brand: "DeWalt",
    price: 22500,
    compareAtPrice: 24900,
    stock: 14,
    rating: 0,
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
    weightKg: 3.2,
    isHeavyItem: true,
    hasSizeVariants: true
  },
  {
    id: "seed-makita-circular-saw-1400w",
    name: "Makita Circular Saw 1400W",
    slug: "makita-circular-saw-1400w",
    sku: "HTC-SAW-1400-5-INCH-BLACK",
    category: "Power Tools",
    brand: "Makita",
    price: 38500,
    compareAtPrice: 42000,
    stock: 14,
    rating: 0,
    image: "/brand/htc-logo.png",
    weightKg: 5.8,
    isHeavyItem: true,
    hasSizeVariants: true
  },
  {
    id: "seed-stanley-claw-hammer-16oz",
    name: "Stanley Claw Hammer 16oz",
    slug: "stanley-claw-hammer-16oz",
    sku: "HTC-HMR-16-5-INCH-BLACK",
    category: "Hand Tools",
    brand: "Stanley",
    price: 2850,
    compareAtPrice: 3400,
    stock: 14,
    rating: 0,
    image: "/brand/htc-logo.png",
    weightKg: 0.8,
    isHeavyItem: false,
    hasSizeVariants: true
  },
  {
    id: "seed-total-screwdriver-set-12pcs",
    name: "Total Screwdriver Set 12pcs",
    slug: "total-screwdriver-set-12pcs",
    sku: "HTC-SCR-012-5-INCH-BLACK",
    category: "Hand Tools",
    brand: "Total",
    price: 3250,
    compareAtPrice: 3900,
    stock: 14,
    rating: 0,
    image: "/brand/htc-logo.png",
    weightKg: 1.1,
    isHeavyItem: false,
    hasSizeVariants: true
  },
  {
    id: "cmrj5apxj0026lp4nj6wrg6kq",
    name: "Ingco Cut Resistant Gloves",
    slug: "ingco-cut-resistant-gloves",
    sku: "HTC-SFY-GLV",
    category: "Safety Gear",
    brand: "Ingco",
    price: 1250,
    compareAtPrice: 1550,
    stock: 60,
    rating: 0,
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=84",
    weightKg: 0.2,
    isHeavyItem: false
  },
  {
    id: "cmrj5at4o002glp4nw8wz3z0q",
    name: "Schneider 20A Double Pole Breaker",
    slug: "schneider-20a-double-pole-breaker",
    sku: "HTC-ELC-MCB20",
    category: "Electrical",
    brand: "Schneider",
    price: 3200,
    compareAtPrice: 3650,
    stock: 34,
    rating: 0,
    image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=84",
    weightKg: 0.25,
    isHeavyItem: false
  },
  {
    id: "cmrj5ayh60030lp4n8kdi4bll",
    name: "Fischer Wall Plug Set 100pcs",
    slug: "fischer-wall-plug-set-100pcs",
    sku: "HTC-FST-WP100",
    category: "Fasteners",
    brand: "Fischer",
    price: 2150,
    compareAtPrice: 2500,
    stock: 42,
    rating: 0,
    image: "/brand/workshop-hero.webp",
    weightKg: 0.7,
    isHeavyItem: false
  },
  {
    id: "cmrj5b3i1003klp4n484459lp",
    name: "Grohe Angle Valve 1/2 Inch",
    slug: "grohe-angle-valve-half-inch",
    sku: "HTC-PLB-AV12",
    category: "Plumbing",
    brand: "Grohe",
    price: 4250,
    compareAtPrice: 4800,
    stock: 26,
    rating: 0,
    image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&q=84",
    weightKg: 0.4,
    isHeavyItem: false
  },
  {
    id: "seed-bosch-impact-drill-650w",
    name: "Bosch Impact Drill 650W",
    slug: "bosch-impact-drill-650w",
    sku: "HTC-DRL-650-5-INCH-BLACK",
    category: "Power Tools",
    brand: "Bosch",
    price: 18500,
    compareAtPrice: 20500,
    stock: 14,
    rating: 5,
    image: "/brand/htc-logo.png",
    weightKg: 2.4,
    isHeavyItem: false,
    hasSizeVariants: true
  },
  {
    id: "cmrj5b8j90044lp4ntg2xw7fs",
    name: "Berger Interior Emulsion 4L",
    slug: "berger-interior-emulsion-4l",
    sku: "HTC-PNT-EM4",
    category: "Paint & Supplies",
    brand: "Berger",
    price: 5850,
    compareAtPrice: 6400,
    stock: 17,
    rating: 0,
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=84",
    weightKg: 5,
    isHeavyItem: true
  }
];

function snapshotVariants(product: CatalogSnapshot): CatalogProductVariant[] {
  if (!product.hasSizeVariants) {
    return [{
      id: `${product.id}:standard`,
      title: "Standard",
      sku: product.sku,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      stock: product.stock,
      imageUrl: product.image,
      options: {},
      isDefault: true,
      isActive: true
    }];
  }

  const rootSku = product.sku.replace(/-5-INCH-BLACK$/, "");
  return [
    { suffix: "5-INCH-BLACK", title: "5 inch Black", size: "5 inch", color: "Black", priceOffset: 0, stock: 3 },
    { suffix: "5-INCH-WHITE", title: "5 inch White", size: "5 inch", color: "White", priceOffset: 50, stock: 3 },
    { suffix: "6-INCH-BLACK", title: "6 inch Black", size: "6 inch", color: "Black", priceOffset: 150, stock: 4 },
    { suffix: "6-INCH-WHITE", title: "6 inch White", size: "6 inch", color: "White", priceOffset: 200, stock: 4 }
  ].map((variant, index) => ({
    id: `${product.id}:${variant.suffix.toLowerCase()}`,
    title: variant.title,
    sku: `${rootSku}-${variant.suffix}`,
    price: product.price + variant.priceOffset,
    compareAtPrice: product.compareAtPrice + variant.priceOffset,
    stock: variant.stock,
    imageUrl: product.image,
    options: { Size: variant.size, Color: variant.color },
    isDefault: index === 0,
    isActive: true
  }));
}

export const storefrontFallbackProducts: CatalogProduct[] = liveCatalogSnapshot.map((product) => ({
  id: product.id,
  name: product.name,
  slug: product.slug,
  sku: product.sku,
  category: product.category,
  brand: product.brand,
  price: product.price,
  compareAtPrice: product.compareAtPrice,
  stock: product.stock,
  rating: product.rating,
  reviewCount: product.rating > 0 ? 1 : 0,
  lowStockThreshold: 5,
  image: product.image,
  images: [{ url: product.image, alt: product.name, isMain: true, sortOrder: 0 }],
  shortDescription: "Trade-ready hardware with clear stock, warranty, and delivery support.",
  seoTitle: product.name,
  seoDescription: "Trade-ready hardware with clear stock, warranty, and delivery support.",
  specs: [
    { name: "Brand", value: product.brand },
    { name: "Category", value: product.category },
    { name: "SKU", value: product.sku }
  ],
  isBestSeller: true,
  isFeatured: true,
  weightKg: product.weightKg,
  isHeavyItem: product.isHeavyItem,
  variants: snapshotVariants(product)
}));
