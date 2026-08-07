import { neon } from "@neondatabase/serverless";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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

loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const databaseUrl = process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
if (!databaseUrl || !adminEmail) throw new Error("DATABASE_URL and ADMIN_EMAIL are required");

const sql = neon(databaseUrl);
const [primary] = await sql`SELECT "id", "email" FROM "User" WHERE "role" = 'SUPER_ADMIN' ORDER BY "createdAt" ASC LIMIT 1`;
const [emailOwner] = await sql`SELECT "id", "role" FROM "User" WHERE lower("email") = ${adminEmail} LIMIT 1`;

if (primary) {
  if (emailOwner && emailOwner.id !== primary.id) throw new Error("ADMIN_EMAIL already belongs to another account; no changes were made");
  await sql`UPDATE "User" SET "email" = ${adminEmail}, "isActive" = true, "updatedAt" = NOW() WHERE "id" = ${primary.id}`;
  console.log(`PRIMARY_ADMIN_CONFIGURED=${adminEmail}`);
} else if (emailOwner) {
  await sql`UPDATE "User" SET "role" = 'SUPER_ADMIN', "isActive" = true, "updatedAt" = NOW() WHERE "id" = ${emailOwner.id}`;
  console.log(`PRIMARY_ADMIN_PROMOTED=${adminEmail}`);
} else {
  throw new Error("No existing Primary Admin account was found. Run the seed once to create the initial account.");
}

