import { PrismaClient } from "@prisma/client";
import { slugify } from "../lib/utils";

const prisma = new PrismaClient();

const categorySeeds = [
  { name: "Power Tools", image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=84" },
  { name: "Hand Tools", image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1200&q=84" },
  { name: "Safety Gear", image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=84" },
  { name: "Electrical", image: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1200&q=84" },
  { name: "Fasteners", image: "/brand/workshop-hero.webp" },
  { name: "Plumbing", image: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=1200&q=84" },
  { name: "Paint & Supplies", image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=1200&q=84" }
] as const;

const productSeeds = [
  { name: "Bosch Impact Drill 650W", slug: "bosch-impact-drill-650w", sku: "HTC-DRL-650", category: "Power Tools", brand: "Bosch", price: 18500, compareAtPrice: 20500, costPrice: 15000, stock: 18, weightKg: 2.4, featured: true },
  { name: "DeWalt Angle Grinder 900W", slug: "dewalt-angle-grinder-900w", sku: "HTC-GRD-900", category: "Power Tools", brand: "DeWalt", price: 22500, compareAtPrice: 24900, costPrice: 19000, stock: 9, weightKg: 3.2, featured: true },
  { name: "Makita Circular Saw 1400W", slug: "makita-circular-saw-1400w", sku: "HTC-SAW-1400", category: "Power Tools", brand: "Makita", price: 38500, compareAtPrice: 42000, costPrice: 33000, stock: 7, weightKg: 5.8, featured: true },
  { name: "Stanley Claw Hammer 16oz", slug: "stanley-claw-hammer-16oz", sku: "HTC-HMR-16", category: "Hand Tools", brand: "Stanley", price: 2850, compareAtPrice: 3400, costPrice: 2100, stock: 55, weightKg: 0.8, featured: true },
  { name: "Total Screwdriver Set 12pcs", slug: "total-screwdriver-set-12pcs", sku: "HTC-SCR-012", category: "Hand Tools", brand: "Total", price: 3250, compareAtPrice: 3900, costPrice: 2400, stock: 24, weightKg: 1.1, featured: false },
  { name: "Ingco Safety Helmet", slug: "ingco-safety-helmet", sku: "HTC-SFY-HLM", category: "Safety Gear", brand: "Ingco", price: 1450, compareAtPrice: 1800, costPrice: 950, stock: 75, weightKg: 0.5, featured: false },
  { name: "Ingco Cut Resistant Gloves", slug: "ingco-cut-resistant-gloves", sku: "HTC-SFY-GLV", category: "Safety Gear", brand: "Ingco", price: 1250, compareAtPrice: 1550, costPrice: 820, stock: 60, weightKg: 0.2, featured: true },
  { name: "Schneider 20A Double Pole Breaker", slug: "schneider-20a-double-pole-breaker", sku: "HTC-ELC-MCB20", category: "Electrical", brand: "Schneider", price: 3200, compareAtPrice: 3650, costPrice: 2450, stock: 34, weightKg: 0.25, featured: true },
  { name: "Total Digital Multimeter", slug: "total-digital-multimeter", sku: "HTC-ELC-DMM", category: "Electrical", brand: "Total", price: 4750, compareAtPrice: 5300, costPrice: 3600, stock: 21, weightKg: 0.45, featured: false },
  { name: "Fischer Wall Plug Set 100pcs", slug: "fischer-wall-plug-set-100pcs", sku: "HTC-FST-WP100", category: "Fasteners", brand: "Fischer", price: 2150, compareAtPrice: 2500, costPrice: 1500, stock: 42, weightKg: 0.7, featured: true },
  { name: "Stanley Wood Screw Assortment 200pcs", slug: "stanley-wood-screw-assortment-200pcs", sku: "HTC-FST-WS200", category: "Fasteners", brand: "Stanley", price: 2950, compareAtPrice: 3400, costPrice: 2150, stock: 30, weightKg: 1.2, featured: false },
  { name: "Grohe Angle Valve 1/2 Inch", slug: "grohe-angle-valve-half-inch", sku: "HTC-PLB-AV12", category: "Plumbing", brand: "Grohe", price: 4250, compareAtPrice: 4800, costPrice: 3300, stock: 26, weightKg: 0.4, featured: true },
  { name: "Total Pipe Wrench 14 Inch", slug: "total-pipe-wrench-14-inch", sku: "HTC-PLB-PW14", category: "Plumbing", brand: "Total", price: 3850, compareAtPrice: 4400, costPrice: 2850, stock: 19, weightKg: 1.35, featured: false },
  { name: "Berger Interior Emulsion 4L", slug: "berger-interior-emulsion-4l", sku: "HTC-PNT-EM4", category: "Paint & Supplies", brand: "Berger", price: 5850, compareAtPrice: 6400, costPrice: 4650, stock: 17, weightKg: 5.0, featured: true },
  { name: "Stanley Paint Roller Kit", slug: "stanley-paint-roller-kit", sku: "HTC-PNT-RLK", category: "Paint & Supplies", brand: "Stanley", price: 2350, compareAtPrice: 2800, costPrice: 1650, stock: 38, weightKg: 0.8, featured: false }
] as const;

async function main() {
  const categories = new Map<string, { id: string; image: string }>();
  for (const [index, seed] of categorySeeds.entries()) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(seed.name) },
      update: { name: seed.name, description: `${seed.name} selected for trade, workshop, and home projects.`, image: seed.image, banner: seed.image, sortOrder: index, isActive: true },
      create: { name: seed.name, slug: slugify(seed.name), description: `${seed.name} selected for trade, workshop, and home projects.`, image: seed.image, banner: seed.image, sortOrder: index, isActive: true }
    });
    categories.set(seed.name, { id: category.id, image: seed.image });
  }

  const brandNames = Array.from(new Set(productSeeds.map((product) => product.brand)));
  const brands = new Map<string, string>();
  for (const name of brandNames) {
    const brand = await prisma.brand.upsert({
      where: { slug: slugify(name) },
      update: { name, isActive: true },
      create: { name, slug: slugify(name), description: `${name} tools and hardware.`, isActive: true }
    });
    brands.set(name, brand.id);
  }

  let created = 0;
  for (const seed of productSeeds) {
    const category = categories.get(seed.category);
    const brandId = brands.get(seed.brand);
    if (!category || !brandId) continue;

    const existing = await prisma.product.findUnique({ where: { slug: seed.slug }, select: { id: true } });
    const product = await prisma.product.upsert({
      where: { slug: seed.slug },
      update: { name: seed.name, categoryId: category.id, brandId, isActive: true },
      create: {
        name: seed.name,
        slug: seed.slug,
        sku: seed.sku,
        description: `${seed.name} selected for reliable professional and home use, backed by Hammer Trading Company order support.`,
        shortDescription: "Trade-ready hardware with clear stock, warranty, and delivery support.",
        categoryId: category.id,
        brandId,
        price: seed.price,
        compareAtPrice: seed.compareAtPrice,
        costPrice: seed.costPrice,
        dealerPrice: Math.round(seed.price * 0.9),
        wholesalePrice: Math.round(seed.price * 0.84),
        minWholesaleQuantity: 5,
        stock: seed.stock,
        lowStockThreshold: 5,
        weightKg: seed.weightKg,
        isFeatured: seed.featured,
        isBestSeller: seed.featured,
        isNewArrival: true,
        isHeavyItem: seed.weightKg >= 3,
        isBulky: seed.weightKg >= 5,
        isActive: true,
        warranty: "Supplier warranty applies.",
        returnPolicy: "Returns are accepted according to the store return policy.",
        tags: [slugify(seed.category), slugify(seed.brand)],
        images: { create: [{ url: category.image, alt: seed.name, isMain: true, sortOrder: 0 }] },
        specs: { create: [{ name: "Brand", value: seed.brand }, { name: "Category", value: seed.category }, { name: "SKU", value: seed.sku }] },
        variants: { create: [{ title: "Standard", sku: seed.sku, price: seed.price, compareAtPrice: seed.compareAtPrice, costPrice: seed.costPrice, stock: seed.stock, lowStockThreshold: 5, imageUrl: category.image, options: {}, isDefault: true, isActive: true }] },
        inventory: { create: { currentStock: seed.stock, minStockLevel: 5 } }
      }
    });

    if (!existing) created += 1;
    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: { productId: product.id, currentStock: seed.stock, minStockLevel: 5 }
    });
  }

  console.log(`Catalog ready: ${productSeeds.length} products across ${categorySeeds.length} categories (${created} newly created).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
