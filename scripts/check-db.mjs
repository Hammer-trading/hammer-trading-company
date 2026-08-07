import { PrismaClient } from "@prisma/client";
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

console.log("DATABASE_URL:", process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Connecting to database...");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      }
    });
    console.log("Connection successful!");
    console.log("Users in database:");
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Database connection failed:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
