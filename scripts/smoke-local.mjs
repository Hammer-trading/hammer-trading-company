const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";
const publicRoutes = [
  "/", "/products", "/categories", "/brands",
  "/services", "/packages", "/projects", "/gallery", "/contact", "/home-service",
  "/cart", "/checkout", "/track", "/shipping", "/wholesale", "/login", "/admin/login"
];
const protectedRoutes = ["/admin", "/admin/messages", "/admin/account", "/admin/finance", "/account/messages", "/returns"];
const protectedApis = ["/api/admin/messages", "/api/admin/account", "/api/admin/finance", "/api/account/messages"];
const failures = [];

async function request(path, options = {}) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual", signal: AbortSignal.timeout(30_000), ...options });
  return { response, elapsed: Date.now() - started };
}

for (const path of publicRoutes) {
  try {
    const { response, elapsed } = await request(path);
    const ok = response.status === 200;
    console.log(`${ok ? "PASS" : "FAIL"} ${response.status} ${elapsed}ms ${path}`);
    if (!ok) failures.push(`${path} returned ${response.status}`);
  } catch (error) {
    failures.push(`${path} failed: ${error.message}`);
    console.log(`FAIL ERR ${path}`);
  }
}

try {
  const productsHtml = await fetch(`${baseUrl}/products`, { signal: AbortSignal.timeout(30_000) }).then((response) => response.text());
  const productPath = productsHtml.match(/href=["'](\/products\/[^"'?#]+)["']/)?.[1];
  if (productPath) {
    const { response, elapsed } = await request(productPath);
    const ok = response.status === 200;
    console.log(`${ok ? "PASS" : "FAIL"} ${response.status} ${elapsed}ms ${productPath}`);
    if (!ok) failures.push(`${productPath} returned ${response.status}`);
  } else {
    console.log("SKIP product detail (catalog unavailable in this test environment)");
  }
} catch (error) {
  failures.push(`Product detail discovery failed: ${error.message}`);
}

for (const path of protectedRoutes) {
  const { response, elapsed } = await request(path);
  const location = response.headers.get("location") || "";
  const ok = [302, 303, 307, 308].includes(response.status) && location.includes("login");
  console.log(`${ok ? "PASS" : "FAIL"} ${response.status} ${elapsed}ms ${path} -> ${location}`);
  if (!ok) failures.push(`${path} did not redirect a logged-out visitor to login`);
}

for (const path of protectedApis) {
  const { response, elapsed } = await request(path);
  const ok = response.status === 401;
  console.log(`${ok ? "PASS" : "FAIL"} ${response.status} ${elapsed}ms ${path}`);
  if (!ok) failures.push(`${path} returned ${response.status} instead of 401`);
}

const home = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(30_000) }).then((response) => response.text());
const publicAdminLeak = /href=["'][^"']*\/admin|Admin login|Admin panel/i.test(home);
console.log(`${publicAdminLeak ? "FAIL" : "PASS"} logged-out navbar hides admin access`);
if (publicAdminLeak) failures.push("Logged-out homepage contains an admin access link");

const settingsResult = await request("/api/platform/settings");
const settings = await settingsResult.response.json();
const settingsText = JSON.stringify(settings).toLowerCase();
const secretLeak = ["database_url", "jwt_secret", "smtp_password", "admin_password"].some((key) => settingsText.includes(key));
console.log(`${!secretLeak && settingsResult.response.status === 200 ? "PASS" : "FAIL"} public settings expose safe keys only`);
if (secretLeak || settingsResult.response.status !== 200) failures.push("Public settings endpoint failed the secret-key check");

if (failures.length) {
  console.error(`\nSMOKE_FAILED=${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nSMOKE_PASSED");
