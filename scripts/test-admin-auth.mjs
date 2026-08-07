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

assert(email, "ADMIN_EMAIL is required");
assert(password, "ADMIN_PASSWORD is required");

const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  redirect: "manual",
  headers: {
    "content-type": "application/json",
    origin: baseUrl
  },
  body: JSON.stringify({ email, password, adminOnly: true })
});

assert.equal(loginResponse.status, 200, `Admin login failed with status ${loginResponse.status}`);
const setCookie = loginResponse.headers.get("set-cookie");
assert(setCookie, "Admin login did not return a session cookie");
const cookie = setCookie.slice(0, setCookie.indexOf(";"));

const authHeaders = { cookie };
const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, { headers: authHeaders });
const sessionPayload = await sessionResponse.json();
assert.equal(sessionPayload.user?.email?.toLowerCase(), email, "Session belongs to the wrong user");
assert.equal(sessionPayload.user?.isAdmin, true, "Authenticated user is not an admin");

const accountResponse = await fetch(`${baseUrl}/account`, { headers: authHeaders });
assert.equal(accountResponse.status, 200, `/account returned ${accountResponse.status}`);
const accountHtml = await accountResponse.text();
assert.match(accountHtml, /aria-label="Log out"/, "Signed-in account page does not render the logout control");

for (const route of ["/admin", "/admin/account", "/admin/messages"]) {
  const response = await fetch(`${baseUrl}${route}`, { headers: authHeaders, redirect: "manual" });
  assert.equal(response.status, 200, `${route} returned ${response.status}`);
}

const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { ...authHeaders, origin: baseUrl }
});
assert.equal(logoutResponse.status, 200, `Admin logout failed with status ${logoutResponse.status}`);
const clearCookie = logoutResponse.headers.get("set-cookie") || "";
assert.match(clearCookie, /hammer_session=;/, "Logout response did not clear the browser session cookie");

const browserSessionResponse = await fetch(`${baseUrl}/api/auth/session`);
const browserSessionPayload = await browserSessionResponse.json();
assert.equal(browserSessionPayload.user, null, "A browser without the cleared cookie remained signed in");

if (!String(sessionPayload.user?.id || "").startsWith("dev-")) {
  const revokedSessionResponse = await fetch(`${baseUrl}/api/auth/session`, { headers: authHeaders });
  const revokedSessionPayload = await revokedSessionResponse.json();
  assert.equal(revokedSessionPayload.user, null, "Logged-out database session remained active");
}

console.log("ADMIN_AUTH_TEST_PASSED");
