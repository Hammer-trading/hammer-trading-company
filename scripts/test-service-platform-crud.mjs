import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
assert(email && password, "ADMIN_EMAIL and ADMIN_PASSWORD are required");

const origin = new URL(baseUrl).origin;
let cookie = "";
let serviceId = "";
let packageId = "";

async function request(route, init = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...(init.method && init.method !== "GET" ? { origin } : {}),
      ...init.headers
    },
    signal: AbortSignal.timeout(30_000)
  });
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}

async function cleanup() {
  if (packageId) await request(`/api/admin/platform/packages/${packageId}`, { method: "DELETE" }).catch(() => undefined);
  if (serviceId) await request(`/api/admin/platform/services/${serviceId}`, { method: "DELETE" }).catch(() => undefined);
  if (cookie) await request("/api/auth/logout", { method: "POST" }).catch(() => undefined);
}

try {
  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, adminOnly: true })
  });
  assert.equal(login.response.status, 200, `Admin login failed: ${login.payload.error || login.response.status}`);
  const setCookie = login.response.headers.get("set-cookie");
  assert(setCookie, "Admin login did not return a session cookie");
  cookie = setCookie.slice(0, setCookie.indexOf(";"));

  const catalog = await request("/api/admin/products?pageSize=100");
  assert.equal(catalog.response.status, 200, `Product catalog failed: ${catalog.payload.error || catalog.response.status}`);
  const product = catalog.payload.items?.[0];
  assert(product?.id, "At least one database product is required for package CRUD testing");

  const stamp = Date.now().toString(36);
  const servicePayload = {
    name: `QA Room Service ${stamp}`,
    slug: `qa-room-service-${stamp}`,
    categoryId: null,
    shortDescription: "Temporary service created by the platform CRUD regression test.",
    description: "Temporary service used to verify database-backed service creation, updates, package linking, and cleanup.",
    startingPrice: 1000,
    fixedPrice: null,
    requestQuoteEnabled: true,
    bookingEnabled: true,
    whatsappEnabled: false,
    coverImage: null,
    gallery: [],
    beforeAfter: [],
    videos: [],
    estimatedCompletionTime: "1 day",
    availableDays: ["Monday"],
    availableTimeSlots: ["10:00 AM"],
    cities: ["Karachi"],
    areas: [],
    warrantyInformation: null,
    includedWork: ["Test installation"],
    excludedWork: [],
    requiredMaterials: [],
    productIds: [product.id],
    isFeatured: false,
    showOnHomepage: false,
    isActive: false,
    status: "DRAFT",
    sortOrder: 9999,
    seoTitle: null,
    seoDescription: null,
    imageAlt: null
  };
  const serviceCreate = await request("/api/admin/platform/services", {
    method: "POST",
    body: JSON.stringify(servicePayload)
  });
  assert.equal(serviceCreate.response.status, 201, `Service create failed: ${serviceCreate.payload.error || serviceCreate.response.status}`);
  serviceId = serviceCreate.payload.item?.id;
  assert(serviceId, "Service create response did not include an ID");

  const packagePayload = {
    name: `QA Room Package ${stamp}`,
    slug: `qa-room-package-${stamp}`,
    sku: `QA-PKG-${stamp.toUpperCase()}`,
    categoryId: null,
    coverImage: null,
    gallery: [],
    shortDescription: "Temporary package created by the platform CRUD regression test.",
    description: "Temporary room package used to verify product linking, calculated pricing, persistence, and cleanup.",
    fixedDiscount: 0,
    percentageDiscount: 0,
    badge: "QA",
    installationServiceId: serviceId,
    isFeatured: false,
    showOnHomepage: false,
    isActive: false,
    status: "DRAFT",
    sortOrder: 9999,
    seoTitle: null,
    seoDescription: null,
    imageAlt: null,
    items: [{ productId: product.id, variantId: null, quantity: 1, sortOrder: 0 }]
  };
  const packageCreate = await request("/api/admin/platform/packages", {
    method: "POST",
    body: JSON.stringify(packagePayload)
  });
  assert.equal(packageCreate.response.status, 201, `Package create failed: ${packageCreate.payload.error || packageCreate.response.status}`);
  packageId = packageCreate.payload.item?.id;
  assert(packageId, "Package create response did not include an ID");

  const packageUpdate = await request(`/api/admin/platform/packages/${packageId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...packagePayload, name: `${packagePayload.name} Updated`, fixedDiscount: 5 })
  });
  assert.equal(packageUpdate.response.status, 200, `Package update failed: ${packageUpdate.payload.error || packageUpdate.response.status}`);
  assert.equal(packageUpdate.payload.item?.name, `${packagePayload.name} Updated`, "Updated package name was not persisted");

  const packages = await request("/api/admin/platform/packages");
  assert.equal(packages.response.status, 200, `Package list failed: ${packages.payload.error || packages.response.status}`);
  assert(packages.payload.items?.some((item) => item.id === packageId), "Created package was not returned by the package list");

  const packageDelete = await request(`/api/admin/platform/packages/${packageId}`, { method: "DELETE" });
  assert.equal(packageDelete.response.status, 200, `Package cleanup failed: ${packageDelete.payload.error || packageDelete.response.status}`);
  packageId = "";

  const serviceDelete = await request(`/api/admin/platform/services/${serviceId}`, { method: "DELETE" });
  assert.equal(serviceDelete.response.status, 200, `Service cleanup failed: ${serviceDelete.payload.error || serviceDelete.response.status}`);
  serviceId = "";

  console.log("SERVICE_PLATFORM_CRUD_TEST_PASSED", {
    productId: product.id,
    serviceCreated: true,
    packageCreated: true,
    packageUpdated: true,
    cleanupComplete: true
  });
} finally {
  await cleanup();
}
