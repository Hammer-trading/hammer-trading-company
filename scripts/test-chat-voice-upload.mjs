import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { del } from "@vercel/blob";
import { getPayloadFromClientToken, put } from "@vercel/blob/client";

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

loadEnv(path.join(process.cwd(), ".env.production.local"));
loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
assert(email && password, "ADMIN_EMAIL and ADMIN_PASSWORD are required");
assert(blobToken, "BLOB_READ_WRITE_TOKEN is required");

let cookie = "";
let uploadedUrl = "";

function uploadEvent(pathname, clientPayload) {
  return {
    type: "blob.generate-client-token",
    payload: { pathname, clientPayload: JSON.stringify(clientPayload), multipart: false }
  };
}

async function requestUploadToken(body, authenticated = true) {
  return fetch(`${baseUrl}/api/chat/media/upload`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
      ...(authenticated && cookie ? { cookie } : {})
    },
    body: JSON.stringify(body)
  });
}

try {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password, adminOnly: true })
  });
  assert.equal(loginResponse.status, 200, `Admin login returned ${loginResponse.status}`);
  const setCookie = loginResponse.headers.get("set-cookie");
  assert(setCookie, "Admin login did not return a session cookie");
  cookie = setCookie.slice(0, setCookie.indexOf(";"));

  const pathname = `htc/chat/voice/verification-${Date.now()}.webm`;
  const body = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
  const event = uploadEvent(pathname, {
    name: "Voice upload verification",
    mimeType: "audio/webm",
    sizeBytes: body.length,
    durationSeconds: 1
  });

  const unauthorizedResponse = await requestUploadToken(event, false);
  assert.equal(unauthorizedResponse.status, 401, "Unauthenticated voice upload token was not rejected");

  const tokenResponse = await requestUploadToken(event);
  const tokenPayload = await tokenResponse.json().catch(() => null);
  assert.equal(tokenResponse.status, 200, `Voice upload token returned ${tokenResponse.status}: ${tokenPayload?.error || "unknown error"}`);
  assert(tokenPayload?.clientToken, "Voice upload route did not return a client token");

  const decoded = getPayloadFromClientToken(tokenPayload.clientToken);
  assert(decoded.allowedContentTypes?.includes("audio/webm"), "Voice token does not allow WebM audio");
  assert.equal(decoded.maximumSizeInBytes, 10_000_000, "Voice token has the wrong upload limit");

  const uploaded = await put(pathname, body, {
    access: "public",
    contentType: "audio/webm",
    token: tokenPayload.clientToken
  });
  uploadedUrl = uploaded.url;
  assert(uploaded.url.startsWith("https://"), "Voice blob did not return an HTTPS URL");
  assert.equal(uploaded.contentType, "audio/webm", "Voice blob content type was not preserved");

  await del(uploadedUrl, { token: blobToken });
  uploadedUrl = "";
  console.log("CHAT_VOICE_UPLOAD_TEST_PASSED");
} finally {
  if (uploadedUrl) await del(uploadedUrl, { token: blobToken }).catch(() => undefined);
  if (cookie) {
    await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { cookie, origin: baseUrl }
    }).catch(() => undefined);
  }
}
