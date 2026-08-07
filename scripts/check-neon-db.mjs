import { neon } from "@neondatabase/serverless";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing.");
}

const sql = neon(process.env.DATABASE_URL);
const tables = await sql.query("select tablename from pg_tables where schemaname = 'public' order by tablename", []);
const counts = {};

for (const table of ["User", "Product", "Order", "Category", "Brand"]) {
  try {
    const result = await sql.query(`select count(*)::int as count from "${table}"`, []);
    counts[table] = result[0]?.count ?? 0;
  } catch {
    counts[table] = "missing";
  }
}

console.log(`TABLE_COUNT=${tables.length}`);
console.log(`TABLES=${tables.map((row) => row.tablename).slice(0, 14).join(",")}`);
console.log(`ROW_COUNTS=${JSON.stringify(counts)}`);
