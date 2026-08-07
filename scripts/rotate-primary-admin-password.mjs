import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

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

if (!process.argv.includes("--confirm")) {
  throw new Error("Pass --confirm to rotate the primary admin password and revoke existing sessions.");
}

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
if (password === "ChangeMe123!" || password.length < 16) {
  throw new Error("ADMIN_PASSWORD must be a non-template password with at least 16 characters.");
}

const { PrismaClient, Role } = await import("@prisma/client");
const prisma = new PrismaClient();

try {
  const admin = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!admin || admin.role !== Role.SUPER_ADMIN) {
    throw new Error("The configured ADMIN_EMAIL is not the primary admin account.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash, sessionVersion: { increment: 1 } }
    }),
    prisma.userSession.updateMany({
      where: { userId: admin.id, revokedAt: null },
      data: { revokedAt: new Date() }
    }),
    prisma.activityLog.create({
      data: {
        actorId: admin.id,
        action: "ADMIN_PASSWORD_ROTATED",
        entity: "User",
        entityId: admin.id,
        metadata: { source: "secure deployment setup" }
      }
    })
  ]);
  console.log("PRIMARY_ADMIN_PASSWORD_ROTATED");
} finally {
  await prisma.$disconnect();
}
