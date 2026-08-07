import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

loadEnv(path.join(process.cwd(), ".env.production.local"));
loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const { PrismaClient, Role } = await import("@prisma/client");
const prisma = new PrismaClient();
const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const password = `HTC-Action-${suffix}!7`;
const passwordHash = await bcrypt.hash(password, 10);
const users = [];
const cookies = [];
const registeredCookies = [];
const useApiRegistration = baseUrl.startsWith("https://") && process.env.TEST_USE_DIRECT_DB !== "1";

async function request(url, options = {}) {
  return fetch(`${baseUrl}${url}`, {
    ...options,
    headers: { origin: baseUrl, ...(options.headers || {}) }
  });
}

async function login(email) {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.equal(response.status, 200, `Login failed for ${email}: ${response.status}`);
  const setCookie = response.headers.get("set-cookie");
  assert(setCookie, "Login did not return a cookie");
  const cookie = setCookie.slice(0, setCookie.indexOf(";"));
  cookies.push(cookie);
  return cookie;
}

async function register(label) {
  const email = `htc-action-${label}-${suffix}@example.test`;
  const response = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: `HTC Message Action ${label.toUpperCase()}`,
      email,
      password,
      confirmPassword: password
    })
  });
  const data = await response.json();
  assert.equal(response.status, 201, data.error || `Registration failed for ${email}`);
  const setCookie = response.headers.get("set-cookie");
  assert(setCookie, "Registration did not return a cookie");
  return {
    user: data.user,
    cookie: setCookie.slice(0, setCookie.indexOf(";"))
  };
}

async function send(cookie, messageText, replyToId) {
  const response = await request("/api/account/messages", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ clientMessageId: crypto.randomUUID(), messageText, ...(replyToId ? { replyToId } : {}) })
  });
  const data = await response.json();
  assert.equal(response.status, 201, data.error || "Message send failed");
  return data.conversation;
}

async function action(cookie, messageId, body) {
  const response = await request(`/api/account/messages/${messageId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body)
  });
  return { response, data: await response.json() };
}

try {
  for (const label of ["a", "b"]) {
    if (useApiRegistration) {
      const registered = await register(label);
      users.push(registered.user);
      registeredCookies.push(registered.cookie);
    } else {
      const user = await prisma.user.create({
        data: {
          name: `HTC Message Action ${label.toUpperCase()}`,
          email: `htc-action-${label}-${suffix}@example.test`,
          passwordHash,
          role: Role.CUSTOMER,
          isActive: true
        }
      });
      users.push(user);
    }
  }

  const cookieA = registeredCookies[0] || await login(users[0].email);
  const cookieB = registeredCookies[1] || await login(users[1].email);
  let conversationA = await send(cookieA, "Original action message");
  const original = conversationA.messages.at(-1);
  assert(original, "Original message missing");

  conversationA = await send(cookieA, "Reply action message", original.id);
  const reply = conversationA.messages.at(-1);
  assert.equal(reply.replyToId, original.id, "Reply target was not stored");
  assert.equal(reply.replyTo?.messageText, "Original action message", "Reply preview was not returned");

  const crossUser = await action(cookieB, original.id, { action: "pin", isPinned: true });
  assert.equal(crossUser.response.status, 404, "Cross-customer message action was not blocked");

  const edited = await action(cookieA, original.id, { action: "edit", messageText: "Edited action message" });
  assert.equal(edited.response.status, 200, edited.data.error || "Edit failed");
  assert.equal(edited.data.conversation.messages.find((message) => message.id === original.id)?.messageText, "Edited action message");
  assert(edited.data.conversation.messages.find((message) => message.id === original.id)?.editedAt, "editedAt was not stored");

  const pinned = await action(cookieA, reply.id, { action: "pin", isPinned: true });
  assert.equal(pinned.response.status, 200, pinned.data.error || "Pin failed");
  assert.equal(pinned.data.conversation.messages.find((message) => message.id === reply.id)?.isPinned, true);

  const deleted = await action(cookieA, original.id, { action: "delete" });
  assert.equal(deleted.response.status, 200, deleted.data.error || "Delete failed");
  const deletedMessage = deleted.data.conversation.messages.find((message) => message.id === original.id);
  assert(deletedMessage?.deletedAt, "deletedAt was not stored");
  assert.equal(deletedMessage?.messageText, "", "Deleted message content was not cleared");

  console.log("CHAT_MESSAGE_ACTIONS_TEST_PASSED");
} finally {
  if (users.length) {
    await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } }).catch(() => undefined);
  }
  await prisma.$disconnect();
}
