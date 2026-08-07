import bcrypt from "bcryptjs";
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
const newPassword = process.env.NEW_ADMIN_PASSWORD;

if (!databaseUrl || !adminEmail || !newPassword) {
  throw new Error("DATABASE_URL, ADMIN_EMAIL and NEW_ADMIN_PASSWORD are required");
}
if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
  throw new Error("The new password must contain at least 8 characters, uppercase, lowercase and a number");
}

const sql = neon(databaseUrl);
const [admin] = await sql`
  SELECT "id"
  FROM "User"
  WHERE lower("email") = ${adminEmail}
    AND "role" IN ('SUPER_ADMIN', 'ADMIN')
  LIMIT 1
`;

if (!admin) throw new Error("Configured admin account was not found");

const passwordHash = await bcrypt.hash(newPassword, 12);
await sql.transaction([
  sql`UPDATE "User"
      SET "passwordHash" = ${passwordHash},
          "sessionVersion" = "sessionVersion" + 1,
          "isActive" = true,
          "updatedAt" = NOW()
      WHERE "id" = ${admin.id}`,
  sql`UPDATE "UserSession"
      SET "revokedAt" = NOW()
      WHERE "userId" = ${admin.id}
        AND "revokedAt" IS NULL`
]);

console.log("ADMIN_PASSWORD_RESET=1");
console.log("PREVIOUS_ADMIN_SESSIONS_REVOKED=1");
