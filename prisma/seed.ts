import crypto from "crypto";
import { OrderStatus, PaymentMethod, Permission, PrismaClient, QuoteStatus, Role, StockMovementType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function pastDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function timelineFor(status: OrderStatus) {
  const flow: OrderStatus[] = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "PACKED",
    "READY_FOR_DISPATCH",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "DELIVERED"
  ];
  if (["CANCELLED", "RETURNED", "REFUNDED", "DELIVERY_FAILED", "DISPUTED"].includes(status)) {
    return ["PENDING", "CONFIRMED", status] as OrderStatus[];
  }
  const index = flow.indexOf(status);
  return flow.slice(0, Math.max(index + 1, 1));
}

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "hammertrading2018@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const existingPrimary = await prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN }, orderBy: { createdAt: "asc" } });
  const emailOwner = await prisma.user.findUnique({ where: { email: adminEmail } });
  const admin = existingPrimary && (!emailOwner || emailOwner.id === existingPrimary.id)
    ? await prisma.user.update({
        where: { id: existingPrimary.id },
        data: { name: "Hammer Admin", email: adminEmail, role: Role.SUPER_ADMIN, isActive: true }
      })
    : await prisma.user.upsert({
        where: { email: adminEmail },
        update: { name: "Hammer Admin", role: Role.SUPER_ADMIN, isActive: true },
        create: {
          name: "Hammer Admin",
          email: adminEmail,
          phone: "03000000000",
          passwordHash,
          role: Role.SUPER_ADMIN,
          permissions: { create: Object.values(Permission).map((permission) => ({ permission })) }
        }
      });

  for (const permission of Object.values(Permission)) {
    await prisma.staffPermission.upsert({
      where: { userId_permission: { userId: admin.id, permission } },
      update: {},
      create: { userId: admin.id, permission }
    });
  }

  const staffSeeds = [
    { name: "Order Manager", email: "orders@hammer.local", role: Role.ORDER_MANAGER, phone: "03000000011" },
    { name: "Inventory Manager", email: "inventory@hammer.local", role: Role.INVENTORY_MANAGER, phone: "03000000012" },
    { name: "Delivery Staff", email: "delivery@hammer.local", role: Role.DELIVERY_STAFF, phone: "03000000013" },
    { name: "Support Staff", email: "support.staff@hammer.local", role: Role.SUPPORT_STAFF, phone: "03000000014" }
  ];

  const staff = [];
  for (const item of staffSeeds) {
    staff.push(
      await prisma.user.upsert({
        where: { email: item.email },
        update: { name: item.name, role: item.role, phone: item.phone, isActive: true, passwordHash },
        create: { ...item, passwordHash, isActive: true }
      })
    );
  }

  const categorySeeds = [
    "Power Tools",
    "Hand Tools",
    "Safety Gear",
    "Electrical",
    "Fasteners",
    "Plumbing",
    "Paint & Supplies"
  ];

  const categoryRecords = [];
  for (const [index, name] of categorySeeds.entries()) {
    categoryRecords.push(
      await prisma.category.upsert({
        where: { slug: slugify(name) },
        update: {
          name,
          description: `${name} for workshops, homes, and contractors.`,
          sortOrder: index,
          isActive: true
        },
        create: {
          name,
          slug: slugify(name),
          description: `${name} for workshops, homes, and contractors.`,
          image: "/brand/htc-logo.png",
          banner: "/brand/htc-logo.png",
          seoTitle: `${name} Pakistan`,
          seoDescription: `Buy ${name.toLowerCase()} from Hammer Trading Company.`,
          sortOrder: index
        }
      })
    );
  }

  const brandRecords = [];
  for (const name of ["Bosch", "Stanley", "DeWalt", "Ingco", "Total", "Makita"]) {
    brandRecords.push(
      await prisma.brand.upsert({
        where: { slug: slugify(name) },
        update: { name, description: `${name} hardware products.`, isActive: true },
        create: {
          name,
          slug: slugify(name),
          logo: "/brand/htc-logo.png",
          description: `${name} hardware products.`,
          seoTitle: `${name} tools Pakistan`,
          seoDescription: `Shop ${name} tools and hardware at Hammer Trading Company.`
        }
      })
    );
  }

  const productSeeds = [
    {
      name: "Bosch Impact Drill 650W",
      slug: "bosch-impact-drill-650w",
      sku: "HTC-DRL-650",
      category: "Power Tools",
      brand: "Bosch",
      price: 18500,
      compareAtPrice: 20500,
      costPrice: 15000,
      stock: 18,
      weightKg: 2.4,
      featured: true,
      bestSeller: true
    },
    {
      name: "Stanley Claw Hammer 16oz",
      slug: "stanley-claw-hammer-16oz",
      sku: "HTC-HMR-16",
      category: "Hand Tools",
      brand: "Stanley",
      price: 2850,
      compareAtPrice: 3400,
      costPrice: 2100,
      stock: 55,
      weightKg: 0.8,
      featured: true,
      bestSeller: true
    },
    {
      name: "DeWalt Angle Grinder 900W",
      slug: "dewalt-angle-grinder-900w",
      sku: "HTC-GRD-900",
      category: "Power Tools",
      brand: "DeWalt",
      price: 22500,
      compareAtPrice: 24900,
      costPrice: 19000,
      stock: 9,
      weightKg: 3.2,
      featured: true,
      bestSeller: true,
      heavy: true
    },
    {
      name: "Ingco Safety Helmet",
      slug: "ingco-safety-helmet",
      sku: "HTC-SFY-HLM",
      category: "Safety Gear",
      brand: "Ingco",
      price: 1450,
      compareAtPrice: 1800,
      costPrice: 950,
      stock: 75,
      weightKg: 0.5,
      featured: false
    },
    {
      name: "Total Screwdriver Set 12pcs",
      slug: "total-screwdriver-set-12pcs",
      sku: "HTC-SCR-012",
      category: "Hand Tools",
      brand: "Total",
      price: 3250,
      compareAtPrice: 3900,
      costPrice: 2400,
      stock: 6,
      weightKg: 1.1,
      featured: true
    },
    {
      name: "Makita Circular Saw 1400W",
      slug: "makita-circular-saw-1400w",
      sku: "HTC-SAW-1400",
      category: "Power Tools",
      brand: "Makita",
      price: 38500,
      compareAtPrice: 42000,
      costPrice: 33000,
      stock: 3,
      weightKg: 5.8,
      featured: true,
      heavy: true,
      bulky: true
    }
  ];

  const products = [];
  for (const item of productSeeds) {
    const category = categoryRecords.find((row) => row.name === item.category) || categoryRecords[0];
    const brand = brandRecords.find((row) => row.name === item.brand) || brandRecords[0];
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        sku: item.sku,
        description: `${item.name} with trusted build quality, warranty-ready purchase record, and nationwide delivery support.`,
        shortDescription: "Reliable hardware for professional and home use.",
        categoryId: category.id,
        brandId: brand.id,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        costPrice: item.costPrice,
        dealerPrice: Math.round(item.price * 0.9),
        wholesalePrice: Math.round(item.price * 0.84),
        minWholesaleQuantity: 5,
        stock: item.stock,
        lowStockThreshold: 5,
        weightKg: item.weightKg,
        isFeatured: item.featured,
        isBestSeller: Boolean(item.bestSeller),
        isNewArrival: item.featured,
        isHeavyItem: Boolean(item.heavy),
        isBulky: Boolean(item.bulky),
        isActive: true
      },
      create: {
        id: `seed-${item.slug}`,
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        description: `${item.name} with trusted build quality, warranty-ready purchase record, and nationwide delivery support.`,
        shortDescription: "Reliable hardware for professional and home use.",
        categoryId: category.id,
        brandId: brand.id,
        price: item.price,
        compareAtPrice: item.compareAtPrice,
        costPrice: item.costPrice,
        dealerPrice: Math.round(item.price * 0.9),
        wholesalePrice: Math.round(item.price * 0.84),
        minWholesaleQuantity: 5,
        stock: item.stock,
        lowStockThreshold: 5,
        weightKg: item.weightKg,
        isFeatured: item.featured,
        isBestSeller: Boolean(item.bestSeller),
        isNewArrival: item.featured,
        isHeavyItem: Boolean(item.heavy),
        isBulky: Boolean(item.bulky),
        warranty: "Supplier warranty applies.",
        returnPolicy: "Return accepted for unopened or defective products according to store policy.",
        tags: [category.slug, brand.slug]
      }
    });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.createMany({
      data: [
        {
          productId: product.id,
          url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80",
          alt: item.name,
          isMain: true,
          sortOrder: 0
        },
        {
          productId: product.id,
          url: "/brand/htc-logo.png",
          alt: `${item.name} Hammer Trading Company`,
          isMain: false,
          sortOrder: 1
        }
      ]
    });

    await prisma.productSpecification.deleteMany({ where: { productId: product.id } });
    await prisma.productSpecification.createMany({
      data: [
        { productId: product.id, name: "Warranty", value: "Official supplier warranty" },
        { productId: product.id, name: "Delivery", value: "Pakistan-wide delivery" },
        { productId: product.id, name: "SKU", value: item.sku }
      ]
    });

    await prisma.inventory.upsert({
      where: { productId: product.id },
      update: { currentStock: item.stock, minStockLevel: 5 },
      create: { productId: product.id, currentStock: item.stock, minStockLevel: 5 }
    });
    products.push(product);
  }

  const customerPasswordHash = await bcrypt.hash("Customer123!", 12);
  const customerSeeds = [
    { name: "Ali Khan", email: "ali.customer@hammer.local", phone: "03011111111", city: "Lahore", area: "DHA" },
    { name: "Sara Ahmed", email: "sara.customer@hammer.local", phone: "03022222222", city: "Karachi", area: "Gulshan" },
    { name: "Usman Builders", email: "usman.builders@hammer.local", phone: "03033333333", city: "Islamabad", area: "G-11" }
  ];

  const customers = [];
  for (const item of customerSeeds) {
    const customer = await prisma.user.upsert({
      where: { email: item.email },
      update: { name: item.name, phone: item.phone, role: Role.CUSTOMER, isActive: true },
      create: {
        name: item.name,
        email: item.email,
        phone: item.phone,
        passwordHash: customerPasswordHash,
        role: Role.CUSTOMER
      }
    });
    await prisma.address.deleteMany({ where: { userId: customer.id, label: "Seed Address" } });
    await prisma.address.create({
      data: {
        userId: customer.id,
        label: "Seed Address",
        fullName: item.name,
        phone: item.phone,
        province: item.city === "Lahore" ? "Punjab" : item.city === "Karachi" ? "Sindh" : "ICT",
        city: item.city,
        area: item.area,
        addressLine: `House 12, ${item.area}`,
        nearestLandmark: "Main market",
        isDefault: true
      }
    });
    customers.push(customer);
  }

  const deliveryUser = staff.find((user) => user.role === Role.DELIVERY_STAFF) || staff[0];
  await prisma.rider.upsert({
    where: { userId: deliveryUser.id },
    update: { name: "HTC Local Rider", phone: "03000000999", city: "Lahore", vehicle: "Bike", isActive: true },
    create: { userId: deliveryUser.id, name: "HTC Local Rider", phone: "03000000999", city: "Lahore", vehicle: "Bike" }
  });

  const deliveryRules = [
    { id: "default-pakistan-delivery", name: "Default Pakistan Delivery", city: null, area: null, baseCharge: 250, standardCharge: 250, freeDeliveryThreshold: 25000, estimatedDaysMin: 2, estimatedDaysMax: 5 },
    { id: "lahore-standard-delivery", name: "Lahore Standard Delivery", city: "Lahore", area: null, baseCharge: 180, standardCharge: 180, freeDeliveryThreshold: 15000, estimatedDaysMin: 1, estimatedDaysMax: 2 },
    { id: "karachi-heavy-delivery", name: "Karachi Heavy Item Delivery", city: "Karachi", area: null, baseCharge: 350, standardCharge: 350, freeDeliveryThreshold: 30000, estimatedDaysMin: 3, estimatedDaysMax: 5 }
  ];

  for (const rule of deliveryRules) {
    await prisma.deliveryRule.upsert({
      where: { id: rule.id },
      update: {
        name: rule.name,
        city: rule.city,
        area: rule.area,
        baseCharge: rule.baseCharge,
        standardCharge: rule.standardCharge,
        heavyItemCharge: 450,
        bulkyItemCharge: 650,
        sameDayCharge: 300,
        freeDeliveryThreshold: rule.freeDeliveryThreshold,
        estimatedDaysMin: rule.estimatedDaysMin,
        estimatedDaysMax: rule.estimatedDaysMax,
        isActive: true
      },
      create: {
        ...rule,
        heavyItemCharge: 450,
        bulkyItemCharge: 650,
        sameDayCharge: 300
      }
    });
  }

  const couriers = [];
  for (const provider of ["Leopards", "TCS", "PostEx", "Trax", "BlueEX", "Local Riders"]) {
    couriers.push(
      await prisma.courier.upsert({
        where: { slug: slugify(provider) },
        update: {
          name: provider,
          provider: provider.toUpperCase().replaceAll(" ", "_"),
          isActive: true
        },
        create: {
          name: provider,
          slug: slugify(provider),
          provider: provider.toUpperCase().replaceAll(" ", "_"),
          phone: "021-0000000",
          website: "https://example.com",
          isActive: true
        }
      })
    );
  }

  const orderSeeds = [
    { orderNumber: "HTC-1001", invoiceNumber: "HTC-INV-1001", customer: customers[0], status: "DELIVERED" as OrderStatus, city: "Lahore", area: "DHA", daysAgo: 1, delivery: 180, discount: 500, items: [{ product: products[0], quantity: 1 }, { product: products[1], quantity: 2 }] },
    { orderNumber: "HTC-1002", invoiceNumber: "HTC-INV-1002", customer: customers[1], status: "OUT_FOR_DELIVERY" as OrderStatus, city: "Karachi", area: "Gulshan", daysAgo: 3, delivery: 350, discount: 0, items: [{ product: products[2], quantity: 1 }] },
    { orderNumber: "HTC-1003", invoiceNumber: "HTC-INV-1003", customer: customers[2], status: "CONFIRMED" as OrderStatus, city: "Islamabad", area: "G-11", daysAgo: 8, delivery: 250, discount: 1000, items: [{ product: products[5], quantity: 1 }, { product: products[4], quantity: 3 }] },
    { orderNumber: "HTC-1004", invoiceNumber: "HTC-INV-1004", customer: customers[0], status: "PACKED" as OrderStatus, city: "Lahore", area: "Model Town", daysAgo: 15, delivery: 180, discount: 0, items: [{ product: products[3], quantity: 4 }, { product: products[4], quantity: 1 }] },
    { orderNumber: "HTC-1005", invoiceNumber: "HTC-INV-1005", customer: customers[1], status: "CANCELLED" as OrderStatus, city: "Karachi", area: "Saddar", daysAgo: 22, delivery: 350, discount: 0, items: [{ product: products[0], quantity: 1 }] }
  ];

  await prisma.activityLog.deleteMany({ where: { action: { startsWith: "SEED_" } } });
  await prisma.inventoryLog.deleteMany({ where: { reason: { startsWith: "Seed" } } });
  await prisma.review.deleteMany({ where: { title: { startsWith: "Seed" } } });

  for (const seed of orderSeeds) {
    const subtotal = seed.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const costTotal = seed.items.reduce((sum, item) => sum + Number(item.product.costPrice) * item.quantity, 0);
    const total = subtotal + seed.delivery - seed.discount;
    const qrToken = `seed-${seed.orderNumber}-delivery-token`;
    const createdAt = pastDays(seed.daysAgo);

    const order = await prisma.order.upsert({
      where: { orderNumber: seed.orderNumber },
      update: {
        status: seed.status,
        subtotal,
        discountTotal: seed.discount,
        deliveryCharge: seed.delivery,
        total,
        profitMargin: total - costTotal,
        courierId: couriers[0]?.id,
        courierName: couriers[0]?.name,
        assignedRiderId: deliveryUser.id,
        trackingNumber: `TRK-${seed.orderNumber}`,
        courierBookingId: `BK-${seed.orderNumber}`,
        codAmount: total,
        deliveredAt: seed.status === "DELIVERED" ? addDays(-1) : null,
        qrTokenHash: hashToken(qrToken),
        qrExpiresAt: addDays(30)
      },
      create: {
        orderNumber: seed.orderNumber,
        invoiceNumber: seed.invoiceNumber,
        userId: seed.customer.id,
        customerName: seed.customer.name,
        customerEmail: seed.customer.email,
        customerPhone: seed.customer.phone || "03000000000",
        province: seed.city === "Karachi" ? "Sindh" : seed.city === "Lahore" ? "Punjab" : "ICT",
        city: seed.city,
        area: seed.area,
        addressLine: `House 12, ${seed.area}`,
        nearestLandmark: "Main market",
        subtotal,
        discountTotal: seed.discount,
        manualDiscount: 0,
        deliveryCharge: seed.delivery,
        codAmount: total,
        total,
        profitMargin: total - costTotal,
        status: seed.status,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: seed.status === "DELIVERED" ? "PAID" : "PENDING",
        couponCode: seed.discount ? "HAMMER500" : null,
        estimatedDeliveryAt: addDays(3),
        deliveredAt: seed.status === "DELIVERED" ? addDays(-1) : null,
        assignedRiderId: deliveryUser.id,
        courierId: couriers[0]?.id,
        courierName: couriers[0]?.name,
        trackingNumber: `TRK-${seed.orderNumber}`,
        courierBookingId: `BK-${seed.orderNumber}`,
        otpHash: await bcrypt.hash("123456", 10),
        qrTokenHash: hashToken(qrToken),
        qrExpiresAt: addDays(30),
        createdAt,
        items: {
          create: seed.items.map((item) => ({
            productId: item.product.id,
            name: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            price: Number(item.product.price),
            costPrice: Number(item.product.costPrice),
            total: Number(item.product.price) * item.quantity
          }))
        },
        timeline: {
          create: timelineFor(seed.status).map((status, index) => ({
            status,
            note: `Seed timeline: ${status.replaceAll("_", " ").toLowerCase()}`,
            actorId: admin.id,
            createdAt: pastDays(Math.max(seed.daysAgo - index, 0))
          }))
        },
        qrcodes: {
          create: {
            type: "DELIVERY_CONFIRMATION",
            tokenHash: hashToken(qrToken),
            url: `${process.env.APP_URL || "http://localhost:3000"}/confirm-delivery?token=${qrToken}`,
            expiresAt: addDays(30)
          }
        }
      }
    });

    for (const item of seed.items) {
      await prisma.inventoryLog.create({
        data: {
          productId: item.product.id,
          type: StockMovementType.ORDER_REDUCTION,
          quantity: item.quantity,
          previousStock: item.product.stock + item.quantity,
          newStock: item.product.stock,
          reason: `Seed order reduction ${seed.orderNumber}`,
          actorId: admin.id,
          orderId: order.id
        }
      });
    }

    await prisma.activityLog.create({
      data: {
        actorId: admin.id,
        orderId: order.id,
        action: `SEED_ORDER_${seed.status}`,
        entity: "Order",
        entityId: order.id,
        newValue: { orderNumber: seed.orderNumber, status: seed.status, total },
        ipAddress: "127.0.0.1"
      }
    });
  }

  const deliveredOrder = await prisma.order.findUnique({ where: { orderNumber: "HTC-1001" } });
  if (deliveredOrder) {
    await prisma.review.create({
      data: {
        productId: products[0].id,
        userId: customers[0].id,
        orderId: deliveredOrder.id,
        rating: 5,
        title: "Seed review - verified purchase",
        comment: "Excellent drill and fast delivery from Hammer Trading Company.",
        isApproved: true,
        isVerifiedPurchase: true,
        reply: "Thank you for shopping with Hammer Trading Company."
      }
    });
  }

  await prisma.supportTicket.deleteMany({ where: { title: { startsWith: "Seed" } } });
  await prisma.supportTicket.create({
    data: {
      userId: customers[1].id,
      orderId: deliveredOrder?.id,
      type: "DELIVERY_DISPUTE",
      status: "OPEN",
      title: "Seed support ticket - delivery follow-up",
      description: "Customer requested a delivery timing update.",
      internalNotes: "Demo support ticket for admin dashboard."
    }
  });

  await prisma.quoteRequest.deleteMany({ where: { customerPhone: "03044444444" } });
  await prisma.quoteRequest.create({
    data: {
      productId: products[0].id,
      productName: products[0].name,
      quantity: 20,
      customerName: "Seed Contractor Quote",
      customerPhone: "03044444444",
      customerEmail: "quote@hammer.local",
      city: "Lahore",
      note: "Please share contractor bulk pricing and expected delivery date.",
      status: QuoteStatus.PENDING
    }
  });

  await prisma.coupon.upsert({
    where: { code: "HAMMER500" },
    update: { amountOff: 500, minOrderAmount: 5000, usageLimit: 500, usedCount: 1, isActive: true },
    create: {
      code: "HAMMER500",
      description: "Rs. 500 off first order",
      amountOff: 500,
      minOrderAmount: 5000,
      usageLimit: 500,
      usedCount: 1,
      maxDiscount: 500,
      isActive: true
    }
  });

  await prisma.banner.upsert({
    where: { id: "seed-hero-banner" },
    update: { title: "Hammer Trading Company", isActive: true, sortOrder: 1 },
    create: {
      id: "seed-hero-banner",
      title: "Hammer Trading Company",
      subtitle: "Professional hardware, tools, and delivery support across Pakistan.",
      image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1600&q=80",
      mobileImage: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
      type: "HERO",
      href: "/products",
      sortOrder: 1
    }
  });

  await prisma.adminNotification.deleteMany({ where: { href: { in: ["/admin/orders", "/admin/inventory", "/admin/support"] } } });
  await prisma.adminNotification.createMany({
    data: [
      { title: "New seeded order", message: "HTC-1003 is confirmed and ready for processing.", href: "/admin/orders" },
      { title: "Low stock alert", message: "Makita Circular Saw stock is below threshold.", href: "/admin/inventory" },
      { title: "Support ticket open", message: "Customer requested delivery follow-up.", href: "/admin/support" }
    ]
  });

  const settings = {
    allow_negative_stock: "false",
    company_name: "Hammer Trading Company",
    logo: "/brand/htc-logo.png",
    favicon: "/brand/htc-logo.png",
    currency: "PKR",
    invoice_prefix: "HTC-INV",
    order_prefix: "HTC",
    low_stock_threshold: "5",
    free_delivery_amount: "25000",
    default_delivery_charges: "250",
    phone: "03000000000",
    whatsapp_number: process.env.WHATSAPP_SUPPORT_NUMBER || "923001234567",
    email: "support@hammer.local",
    address: "Lahore, Pakistan",
    return_policy: "Returns are reviewed by support before approval.",
    privacy_policy: "Customer data is used only for order processing and support.",
    terms_conditions: "Orders are subject to stock availability and delivery confirmation.",
    bank_transfer_details: process.env.BANK_TRANSFER_INSTRUCTIONS || "Configure bank transfer details in admin settings.",
    payment_methods: "COD,BANK_TRANSFER,EASYPAISA,JAZZCASH"
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  }

  console.log("Seed complete: admin, staff, customers, products, inventory, orders, delivery, quotes, reviews, support, settings.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
