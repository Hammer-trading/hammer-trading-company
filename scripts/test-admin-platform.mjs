import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  redirect: "manual",
  headers: { "content-type": "application/json", origin: baseUrl },
  body: JSON.stringify({ email, password, adminOnly: true })
});
assert.equal(login.status, 200, `Admin login failed with status ${login.status}`);
const setCookie = login.headers.get("set-cookie");
assert(setCookie, "Admin login did not return a session cookie");
const cookie = setCookie.slice(0, setCookie.indexOf(";"));

const routes = [
  "/api/admin/database-health",
  "/api/admin/products?pageSize=10",
  "/api/admin/platform/services",
  "/api/admin/platform/packages",
  "/api/admin/platform/projects",
  "/api/admin/integrations/status",
  "/api/admin/finance?filter=30d&pageSize=10"
];

const results = {};
let firstProductSlug = "";
for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`, { headers: { cookie }, signal: AbortSignal.timeout(30_000) });
  const payload = await response.json().catch(() => null);
  assert.equal(response.status, 200, `${route} returned ${response.status}: ${payload?.error || "unknown error"}`);
  results[route] = Array.isArray(payload?.items) ? payload.items.length : payload?.total ?? payload?.ok ?? "ready";
  if (route.startsWith("/api/admin/products")) firstProductSlug = payload?.items?.[0]?.slug || "";
}

assert(firstProductSlug, "The live catalog did not return a product slug");
const productPage = await fetch(`${baseUrl}/products/${encodeURIComponent(firstProductSlug)}`, {
  signal: AbortSignal.timeout(30_000)
});
assert.equal(productPage.status, 200, `Live product detail returned ${productPage.status}`);
results["/products/[live-slug]"] = productPage.status;

const financePage = await fetch(`${baseUrl}/admin/finance?filter=30d`, {
  headers: { cookie },
  signal: AbortSignal.timeout(30_000)
});
const financeHtml = await financePage.text();
assert.equal(financePage.status, 200, `Finance page returned ${financePage.status}`);
assert(financeHtml.includes("Financial control center"), "Finance page did not render its control center");
results["/admin/finance"] = financePage.status;

const financeExport = await fetch(`${baseUrl}/api/admin/finance/export?filter=30d`, {
  headers: { cookie },
  signal: AbortSignal.timeout(30_000)
});
assert.equal(financeExport.status, 200, `Finance export returned ${financeExport.status}`);
assert(financeExport.headers.get("content-type")?.includes("text/csv"), "Finance export was not CSV");
results["/api/admin/finance/export"] = financeExport.status;

await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { cookie, origin: baseUrl }
});

console.log("ADMIN_PLATFORM_TEST_PASSED", results);
