import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";
import { Pool } from "@neondatabase/serverless";

nextEnv.loadEnvConfig(process.cwd());

const migrationName = process.argv[2];
if (!migrationName || !/^[a-zA-Z0-9_-]+$/.test(migrationName)) {
  throw new Error("Pass one migration directory name.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");

const migrationPath = path.join(process.cwd(), "prisma", "migrations", migrationName, "migration.sql");
const migrationSql = await readFile(migrationPath, "utf8");
const checksum = createHash("sha256").update(migrationSql).digest("hex");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  const existing = await client.query(
    'SELECT "finished_at", "rolled_back_at" FROM "_prisma_migrations" WHERE "migration_name" = $1 LIMIT 1',
    [migrationName]
  );
  if (existing.rowCount) {
    console.log(`Migration ${migrationName} is already recorded.`);
    process.exitCode = 0;
  } else {
    await client.query("BEGIN");
    await client.query(migrationSql);
    const now = new Date();
    await client.query(
      `INSERT INTO "_prisma_migrations"
        ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
       VALUES ($1, $2, $3, $4, NULL, NULL, $3, 1)`,
      [randomUUID(), checksum, now, migrationName]
    );
    await client.query("COMMIT");
    console.log(`Applied migration ${migrationName}.`);
  }
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  client.release();
  await pool.end();
}
