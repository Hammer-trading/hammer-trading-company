import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

if (process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();

function identifier(value, strict = false) {
  if ((strict && !/^[a-z][a-z0-9_]{2,62}$/.test(value)) || value.includes("\0")) {
    throw new Error(`Unsafe PostgreSQL identifier: ${value}`);
  }
  return `"${value.replaceAll('"', '""')}"`;
}

const requestedName = process.argv[2];
const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const schemaName = requestedName || `backup_${stamp}`;
const schema = identifier(schemaName, true);

try {
  const tables = await prisma.$queryRaw`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;

  const summary = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`CREATE SCHEMA ${schema}`);
    await tx.$executeRawUnsafe(`
      CREATE TABLE ${schema}."_snapshot_manifest" (
        "sourceSchema" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL,
        "tableName" TEXT NOT NULL,
        "rowCount" BIGINT NOT NULL
      )
    `);

    const copied = [];
    for (const row of tables) {
      const tableName = String(row.tablename);
      const table = identifier(tableName);
      await tx.$executeRawUnsafe(`CREATE TABLE ${schema}.${table} (LIKE "public".${table} INCLUDING ALL)`);
      const inserted = await tx.$executeRawUnsafe(`INSERT INTO ${schema}.${table} SELECT * FROM "public".${table}`);
      await tx.$executeRawUnsafe(
        `INSERT INTO ${schema}."_snapshot_manifest" ("sourceSchema", "createdAt", "tableName", "rowCount") VALUES ('public', NOW(), $1, $2)`,
        tableName,
        BigInt(inserted)
      );
      copied.push({ tableName, rowCount: Number(inserted) });
    }
    return copied;
  }, { maxWait: 20_000, timeout: 180_000 });

  console.log(JSON.stringify({
    snapshotSchema: schemaName,
    tables: summary.length,
    rows: summary.reduce((total, item) => total + item.rowCount, 0)
  }, null, 2));
} finally {
  await prisma.$disconnect();
}
