export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  category: string;
  brand: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  rating: number;
  reviewCount?: number;
  lowStockThreshold?: number;
  image: string;
  images: { url: string; alt: string; isMain: boolean; sortOrder: number }[];
  shortDescription: string;
  seoTitle?: string;
  seoDescription?: string;
  specs: { name: string; value: string }[];
  isBestSeller?: boolean;
  isFeatured?: boolean;
  weightKg: number;
  isHeavyItem?: boolean;
  modelUrl?: string;
  modelPosterUrl?: string;
  variants: CatalogProductVariant[];
};

export type CatalogProductVariant = {
  id: string;
  title: string;
  sku: string;
  barcode?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  imageUrl?: string;
  modelUrl?: string;
  options: Record<string, string>;
  isDefault: boolean;
  isActive: boolean;
};

export type ProductCardSummary = Pick<
  CatalogProduct,
  "id" | "name" | "slug" | "sku" | "category" | "brand" | "price" | "compareAtPrice" | "stock" | "rating" | "reviewCount" | "lowStockThreshold" | "image" | "isBestSeller"
> & {
  variantCount: number;
  galleryImages: string[];
  variants: Array<Pick<CatalogProductVariant, "id" | "title" | "options" | "isActive">>;
};

export const categories = [
  "Power Tools",
  "Hand Tools",
  "Safety Gear",
  "Electrical",
  "Fasteners",
  "Plumbing",
  "Paint & Supplies"
];

export const brands = ["Bosch", "Stanley", "DeWalt", "Ingco", "Total", "Makita"];

export const catalogProducts: CatalogProduct[] = [
  {
    id: "p1",
    name: "Bosch Impact Drill 650W",
    slug: "bosch-impact-drill-650w",
    sku: "HTC-DRL-650",
    category: "Power Tools",
    brand: "Bosch",
    price: 18500,
    compareAtPrice: 20500,
    stock: 18,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
    images: [{ url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80", alt: "Bosch Impact Drill 650W", isMain: true, sortOrder: 0 }],
    shortDescription: "Reliable 650W drill for masonry, metal, and wood.",
    specs: [
      { name: "Power", value: "650W" },
      { name: "Chuck", value: "13mm keyed" },
      { name: "Warranty", value: "Official supplier warranty" }
    ],
    isBestSeller: true,
    isFeatured: true,
    weightKg: 2.4,
    variants: []
  },
  {
    id: "p2",
    name: "Stanley Claw Hammer 16oz",
    slug: "stanley-claw-hammer-16oz",
    sku: "HTC-HMR-16",
    category: "Hand Tools",
    brand: "Stanley",
    price: 2850,
    compareAtPrice: 3400,
    stock: 55,
    rating: 4.7,
    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=80",
    images: [{ url: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=80", alt: "Stanley Claw Hammer 16oz", isMain: true, sortOrder: 0 }],
    shortDescription: "Balanced hammer with anti-slip grip.",
    specs: [
      { name: "Head", value: "16oz forged steel" },
      { name: "Handle", value: "Fiberglass grip" },
      { name: "Use", value: "Nailing and demolition" }
    ],
    isFeatured: true,
    weightKg: 0.8,
    variants: []
  },
  {
    id: "p3",
    name: "DeWalt Angle Grinder 900W",
    slug: "dewalt-angle-grinder-900w",
    sku: "HTC-GRD-900",
    category: "Power Tools",
    brand: "DeWalt",
    price: 22500,
    compareAtPrice: 24900,
    stock: 9,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=1200&q=80",
    images: [{ url: "https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?auto=format&fit=crop&w=1200&q=80", alt: "DeWalt Angle Grinder 900W", isMain: true, sortOrder: 0 }],
    shortDescription: "Compact grinder for cutting, polishing, and fabrication.",
    specs: [
      { name: "Power", value: "900W" },
      { name: "Disc", value: "4 inch" },
      { name: "Switch", value: "Slide lock" }
    ],
    isBestSeller: true,
    weightKg: 3.2,
    isHeavyItem: true,
    variants: []
  },
  {
    id: "p4",
    name: "Ingco Safety Helmet",
    slug: "ingco-safety-helmet",
    sku: "HTC-SFY-HLM",
    category: "Safety Gear",
    brand: "Ingco",
    price: 1450,
    compareAtPrice: 1800,
    stock: 75,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
    images: [{ url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80", alt: "Ingco Safety Helmet", isMain: true, sortOrder: 0 }],
    shortDescription: "Lightweight protection for site work.",
    specs: [
      { name: "Material", value: "HDPE shell" },
      { name: "Fit", value: "Adjustable ratchet" },
      { name: "Standard", value: "Industrial safety" }
    ],
    weightKg: 0.5,
    variants: []
  }
];

export function getProduct(slug: string) {
  return catalogProducts.find((product) => product.slug === slug);
}

export function filterProducts(query?: string, category?: string, brand?: string, best?: string, discount?: string) {
  const term = query?.toLowerCase().trim();
  return catalogProducts.filter((product) => {
    const matchesQuery = !term || [product.name, product.sku, product.brand, product.category].join(" ").toLowerCase().includes(term);
    const matchesCategory = !category || category === "all" || product.category === category;
    const matchesBrand = !brand || brand === "all" || product.brand === brand;
    const matchesBest = best !== "true" || Boolean(product.isBestSeller);
    const matchesDiscount = discount !== "true" || Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
    return matchesQuery && matchesCategory && matchesBrand && matchesBest && matchesDiscount;
  });
}
