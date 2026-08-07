import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { del } from "@vercel/blob";
import { put } from "@vercel/blob/client";

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

const { PrismaClient, Role } = await import("@prisma/client");
const prisma = new PrismaClient();
const baseUrl = (process.env.SMOKE_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const password = `HTC-Chat-${suffix}!9q`;
const customerIds = [];
const conversationIds = [];
const cookies = [];
const voiceBlobUrls = [];
let neonSql = null;

async function databaseTransport() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return "prisma";
  } catch {
    const { neon } = await import("@neondatabase/serverless");
    neonSql = neon(process.env.DATABASE_URL);
    await neonSql.query("SELECT 1", []);
    return "neon-http";
  }
}

async function staleCustomerIds(transport) {
  if (transport === "prisma") {
    const rows = await prisma.user.findMany({
      where: { email: { endsWith: "@example.test" }, name: { startsWith: "HTC Chat Test" } },
      select: { id: true }
    });
    return rows.map((row) => row.id);
  }
  const rows = await neonSql.query(
    `SELECT "id" FROM "User" WHERE "email" LIKE $1 AND "name" LIKE $2`,
    ["%@example.test", "HTC Chat Test%"]
  );
  return rows.map((row) => row.id);
}

async function createTestUser(transport, { id, name, email, passwordHash, role }) {
  if (transport === "prisma") {
    return prisma.user.create({
      data: { id, name, email, passwordHash, role, isActive: true }
    });
  }
  const rows = await neonSql.query(
    `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5::"Role", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING "id", "name", "email", "role"`,
    [id, name, email, passwordHash, role]
  );
  return rows[0];
}

async function cleanupTestData(transport, userIds, chatIds = []) {
  if (!userIds.length && !chatIds.length) return;
  if (transport === "prisma") {
    await prisma.activityLog.deleteMany({
      where: {
        OR: [
          ...(userIds.length ? [{ actorId: { in: userIds } }, { entityId: { in: userIds } }] : []),
          ...(chatIds.length ? [{ entityId: { in: chatIds } }] : [])
        ]
      }
    }).catch(() => undefined);
    if (userIds.length) {
      await prisma.chatConversation.deleteMany({ where: { customerId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    return;
  }

  await neonSql.query(
    `DELETE FROM "ActivityLog"
     WHERE "actorId" = ANY($1::text[])
        OR "entityId" = ANY($1::text[])
        OR "entityId" = ANY($2::text[])`,
    [userIds, chatIds]
  );
  if (userIds.length) {
    await neonSql.query(`DELETE FROM "ChatConversation" WHERE "customerId" = ANY($1::text[])`, [userIds]);
    await neonSql.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[])`, [userIds]);
  }
}

function cookieFrom(response) {
  const setCookie = response.headers.get("set-cookie");
  assert(setCookie, "Authentication response did not include a session cookie");
  return setCookie.slice(0, setCookie.indexOf(";"));
}

async function login(email, loginPassword, adminOnly) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password: loginPassword, adminOnly })
  });
  assert.equal(response.status, 200, `Login failed for ${adminOnly ? "admin" : "customer"}: ${response.status}`);
  const cookie = cookieFrom(response);
  cookies.push(cookie);
  return cookie;
}

async function jsonRequest(route, { cookie, method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    redirect: "manual",
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(body !== undefined ? { "content-type": "application/json", origin: baseUrl } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function logout(cookie) {
  await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { cookie, origin: baseUrl }
  }).catch(() => undefined);
}

async function uploadTestVoice(cookie) {
  const pathname = `htc/chat/voice/isolation-${Date.now()}-${crypto.randomUUID()}.webm`;
  const audioBody = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
  const tokenResponse = await fetch(`${baseUrl}/api/chat/media/upload`, {
    method: "POST",
    headers: { cookie, origin: baseUrl, "content-type": "application/json" },
    body: JSON.stringify({
      type: "blob.generate-client-token",
      payload: {
        pathname,
        multipart: false,
        clientPayload: JSON.stringify({
          name: "Voice isolation verification",
          mimeType: "audio/webm",
          sizeBytes: audioBody.length,
          durationSeconds: 2
        })
      }
    })
  });
  const tokenPayload = await tokenResponse.json().catch(() => null);
  assert.equal(tokenResponse.status, 200, `Customer voice upload token returned ${tokenResponse.status}`);
  assert(tokenPayload?.clientToken, "Customer voice upload token is missing");
  const uploaded = await put(pathname, audioBody, {
    access: "public",
    contentType: "audio/webm",
    token: tokenPayload.clientToken
  });
  voiceBlobUrls.push(uploaded.url);
  return uploaded.url;
}

const transport = await databaseTransport();

try {
  const staleIds = await staleCustomerIds(transport);
  if (staleIds.length) await cleanupTestData(transport, staleIds);
  const passwordHash = await bcrypt.hash(password, 12);
  const customers = await Promise.all([
    createTestUser(transport, {
      id: crypto.randomUUID(),
      name: "HTC Chat Test A",
      email: `chat-a-${suffix}@example.test`,
      passwordHash,
      role: Role.CUSTOMER
    }),
    createTestUser(transport, {
      id: crypto.randomUUID(),
      name: "HTC Chat Test B",
      email: `chat-b-${suffix}@example.test`,
      passwordHash,
      role: Role.CUSTOMER
    })
  ]);
  const testAdmin = await createTestUser(transport, {
    id: crypto.randomUUID(),
    name: "HTC Chat Test Admin",
    email: `chat-admin-${suffix}@example.test`,
    passwordHash,
    role: Role.SUPER_ADMIN
  });
  customerIds.push(...customers.map((customer) => customer.id), testAdmin.id);

  const [cookieA, cookieB, adminCookie] = await Promise.all([
    login(customers[0].email, password, false),
    login(customers[1].email, password, false),
    login(testAdmin.email, password, true)
  ]);

  const markerA = `Customer A isolation ${suffix}`;
  const markerB = `Customer B isolation ${suffix}`;
  const [sentA, sentB] = await Promise.all([
    jsonRequest("/api/account/messages", { cookie: cookieA, method: "POST", body: { messageText: markerA, clientMessageId: crypto.randomUUID() } }),
    jsonRequest("/api/account/messages", { cookie: cookieB, method: "POST", body: { messageText: markerB, clientMessageId: crypto.randomUUID() } })
  ]);
  assert.equal(sentA.response.status, 201, `Customer A send returned ${sentA.response.status}`);
  assert.equal(sentB.response.status, 201, `Customer B send returned ${sentB.response.status}`);

  const conversationA = sentA.payload.conversation;
  const conversationB = sentB.payload.conversation;
  conversationIds.push(conversationA.id, conversationB.id);
  assert.notEqual(conversationA.id, conversationB.id, "Customers shared the same conversation");
  assert.notEqual(sentA.payload.customerPublicId, sentB.payload.customerPublicId, "Customers shared the same public ID");
  assert.equal(conversationA.userId, customers[0].id, "Customer A conversation does not expose the authenticated user ID");
  assert.equal(conversationB.userId, customers[1].id, "Customer B conversation does not expose the authenticated user ID");

  const forbiddenCustomerRead = await jsonRequest(`/api/account/messages?conversationId=${conversationB.id}`, { cookie: cookieA });
  assert.equal(forbiddenCustomerRead.response.status, 403, "Customer A could open Customer B conversation ID");
  const forbiddenCustomerSend = await jsonRequest("/api/account/messages", { cookie: cookieA, method: "POST", body: { messageText: "Must be rejected", conversationId: conversationB.id, clientMessageId: crypto.randomUUID() } });
  assert.equal(forbiddenCustomerSend.response.status, 403, "Customer A could send into Customer B conversation ID");

  const voiceUrl = await uploadTestVoice(cookieA);
  const sentVoice = await jsonRequest("/api/account/messages", {
    cookie: cookieA,
    method: "POST",
    body: {
      conversationId: conversationA.id,
      clientMessageId: crypto.randomUUID(),
      messageText: "",
      messageType: "VOICE",
      attachmentUrl: voiceUrl,
      attachmentName: "Voice isolation verification",
      attachmentType: "audio/webm",
      voiceDuration: 2
    }
  });
  assert.equal(sentVoice.response.status, 201, `Customer voice message returned ${sentVoice.response.status}`);

  const duplicateMarker = `Idempotent customer message ${suffix}`;
  const duplicateId = crypto.randomUUID();
  const duplicateResults = await Promise.all([
    jsonRequest("/api/account/messages", { cookie: cookieA, method: "POST", body: { messageText: duplicateMarker, conversationId: conversationA.id, clientMessageId: duplicateId } }),
    jsonRequest("/api/account/messages", { cookie: cookieA, method: "POST", body: { messageText: duplicateMarker, conversationId: conversationA.id, clientMessageId: duplicateId } })
  ]);
  assert(duplicateResults.every((result) => result.response.status === 201), "Idempotent duplicate request did not return success");

  const adminList = await jsonRequest(`/api/admin/messages?q=${encodeURIComponent(suffix)}`, { cookie: adminCookie });
  assert.equal(adminList.response.status, 200, `Admin inbox returned ${adminList.response.status}`);
  const listedIds = new Set(adminList.payload.items.map((item) => item.id));
  assert(listedIds.has(conversationA.id) && listedIds.has(conversationB.id), "Admin inbox did not keep both chats separate");

  const detailA = await jsonRequest(`/api/admin/messages/${conversationA.id}`, { cookie: adminCookie });
  const detailB = await jsonRequest(`/api/admin/messages/${conversationB.id}`, { cookie: adminCookie });
  assert.equal(detailA.response.status, 200, "Admin could not open Customer A chat");
  assert.equal(detailB.response.status, 200, "Admin could not open Customer B chat");

  const replyA = `Admin reply only A ${suffix}`;
  const replyB = `Admin reply only B ${suffix}`;
  const adminReplyA = await jsonRequest(`/api/admin/messages/${conversationA.id}`, { cookie: adminCookie, method: "POST", body: { messageText: replyA } });
  const adminReplyB = await jsonRequest(`/api/admin/messages/${conversationB.id}`, { cookie: adminCookie, method: "POST", body: { messageText: replyB } });
  assert.equal(adminReplyA.response.status, 201, "Admin reply to Customer A failed");
  assert.equal(adminReplyB.response.status, 201, "Admin reply to Customer B failed");

  const inboxA = await jsonRequest("/api/account/messages", { cookie: cookieA });
  const inboxB = await jsonRequest("/api/account/messages", { cookie: cookieB });
  const textsA = inboxA.payload.conversation.messages.map((message) => message.messageText);
  const textsB = inboxB.payload.conversation.messages.map((message) => message.messageText);
  assert(textsA.includes(markerA) && textsA.includes(replyA), "Customer A chat did not persist its messages");
  assert(textsB.includes(markerB) && textsB.includes(replyB), "Customer B chat did not persist its messages");
  assert(!textsA.includes(markerB) && !textsA.includes(replyB), "Customer A could see Customer B messages");
  assert(!textsB.includes(markerA) && !textsB.includes(replyA), "Customer B could see Customer A messages");
  const persistedVoice = inboxA.payload.conversation.messages.find((message) => message.attachmentUrl === voiceUrl);
  assert(persistedVoice, "Customer A voice message did not persist");
  assert.equal(persistedVoice.messageType, "VOICE", "Voice message type was not preserved");
  assert.equal(persistedVoice.attachmentType, "audio/webm", "Voice message MIME type was not preserved");
  assert.equal(persistedVoice.voiceDuration, 2, "Voice message duration was not preserved");
  assert(!inboxB.payload.conversation.messages.some((message) => message.attachmentUrl === voiceUrl), "Customer B could see Customer A voice message");
  assert.equal(textsA.filter((text) => text === duplicateMarker).length, 1, "Duplicate send created multiple messages");
  assert(inboxA.payload.conversation.messages.every((message) => message.conversationId === conversationA.id), "Customer A response contains a foreign conversation message");
  assert(inboxB.payload.conversation.messages.every((message) => message.conversationId === conversationB.id), "Customer B response contains a foreign conversation message");
  assert(inboxA.payload.conversation.messages.every((message) => message.receiverId), "A persisted message is missing its receiver ID");
  assert.equal(inboxA.payload.conversation.customerUnreadCount, 0, "Customer A unread count did not clear after reading");
  assert.equal(inboxB.payload.conversation.customerUnreadCount, 0, "Customer B unread count did not clear after reading");

  const unauthorizedAdmin = await jsonRequest(`/api/admin/messages/${conversationB.id}`, { cookie: cookieA });
  assert.equal(unauthorizedAdmin.response.status, 401, "Customer could access another customer's admin chat route");

  const persistedA = await jsonRequest("/api/account/messages", { cookie: cookieA });
  assert(persistedA.payload.conversation.messages.some((message) => message.messageText === replyA), "Messages did not survive refresh");

  await logout(cookieA);
  const loggedOutInbox = await jsonRequest("/api/account/messages", { cookie: cookieA });
  assert.equal(loggedOutInbox.response.status, 401, "Logged-out customer could still access chat data");

  console.log("CHAT_ISOLATION_TEST_PASSED");
} finally {
  await Promise.all(cookies.map((cookie) => logout(cookie)));
  if (voiceBlobUrls.length && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(voiceBlobUrls, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
  }
  await cleanupTestData(transport, customerIds, conversationIds).catch(() => undefined);
  await prisma.$disconnect();
}
