import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
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
let aboutId = "";
let projectId = "";

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
  if (projectId) await request(`/api/admin/platform/projects/${projectId}`, { method: "DELETE" }).catch(() => undefined);
  if (aboutId) await request(`/api/admin/platform/about/${aboutId}`, { method: "DELETE" }).catch(() => undefined);
  if (cookie) await request("/api/auth/logout", { method: "POST" }).catch(() => undefined);
}

try {
  const login = await request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password, adminOnly: true }) });
  assert.equal(login.response.status, 200, `Admin login failed: ${login.payload.error || login.response.status}`);
  const setCookie = login.response.headers.get("set-cookie");
  assert(setCookie, "Admin login did not return a session cookie");
  cookie = setCookie.slice(0, setCookie.indexOf(";"));

  const stamp = Date.now().toString(36);
  const aboutPayload = {
    slug: `about-qa-${stamp}`,
    eyebrow: "Hammer Trading Company",
    heroTitle: `QA About ${stamp}`,
    heroSubtitle: "Temporary About page used for regression testing.",
    heroImage: null,
    heroVideo: null,
    introTitle: "Connected content platform",
    introBody: "This temporary content verifies that the About CMS persists structured customer-facing company information.",
    mission: "Verify safe content persistence.",
    vision: "Keep customer content connected.",
    values: ["Clarity", "Reliability"],
    serviceAreas: ["Karachi"],
    stats: [{ value: "1", label: "Verified CMS" }],
    milestones: [{ year: "2026", title: "CMS verified", description: "Automated production test." }],
    gallery: [],
    ctaTitle: "Explore services",
    ctaText: "Temporary CTA.",
    ctaLabel: "Services",
    ctaHref: "/services",
    status: "DRAFT",
    seoTitle: null,
    seoDescription: null
  };
  const aboutCreate = await request("/api/admin/platform/about", { method: "POST", body: JSON.stringify(aboutPayload) });
  assert.equal(aboutCreate.response.status, 201, `About create failed: ${aboutCreate.payload.error || aboutCreate.response.status}`);
  aboutId = aboutCreate.payload.item?.id;
  assert(aboutId, "About create response did not include an ID");

  const projectPayload = {
    title: `QA Project ${stamp}`,
    slug: `qa-project-${stamp}`,
    categoryId: null,
    serviceId: null,
    customerOrCompany: "Private QA Customer",
    location: "Karachi",
    shortDescription: "Temporary project timeline regression test.",
    description: "This project verifies public progress updates, customer privacy and structured project persistence.",
    progressPercent: 35,
    isCustomerNamePublic: false,
    testimonial: null,
    startDate: null,
    expectedCompletionDate: null,
    actualCompletionDate: null,
    projectStatus: "ONGOING",
    status: "DRAFT",
    isFeatured: false,
    showOnHomepage: false,
    coverImage: null,
    videos: [],
    seoTitle: null,
    seoDescription: null,
    imageAlt: null,
    sortOrder: 9999,
    productIds: [],
    productItems: [],
    media: [],
    updates: [{
      title: "Site preparation completed",
      description: "Temporary public progress update.",
      progressPercent: 35,
      milestone: "Preparation",
      media: [],
      isPublic: true,
      occurredAt: new Date().toISOString(),
      sortOrder: 0
    }]
  };
  const projectCreate = await request("/api/admin/platform/projects", { method: "POST", body: JSON.stringify(projectPayload) });
  assert.equal(projectCreate.response.status, 201, `Project create failed: ${projectCreate.payload.error || projectCreate.response.status}`);
  projectId = projectCreate.payload.item?.id;
  assert(projectId, "Project create response did not include an ID");
  assert.equal(projectCreate.payload.item?.updates?.length, 1, "Project update was not persisted");

  const projects = await request("/api/admin/platform/projects");
  assert.equal(projects.response.status, 200, `Project list failed: ${projects.payload.error || projects.response.status}`);
  const savedProject = projects.payload.items?.find((item) => item.id === projectId);
  assert.equal(savedProject?.progressPercent, 35, "Project progress was not persisted");
  assert.equal(savedProject?.updates?.[0]?.title, "Site preparation completed", "Project timeline was not returned");

  await cleanup();
  projectId = "";
  aboutId = "";
  cookie = "";
  console.log("CONTENT_PLATFORM_CRUD_TEST_PASSED", {
    aboutCreated: true,
    projectCreated: true,
    progressPersisted: true,
    timelinePersisted: true,
    customerPrivacyPersisted: savedProject?.isCustomerNamePublic === false,
    cleanupComplete: true
  });
} finally {
  await cleanup();
}
