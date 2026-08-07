import { neon } from "@neondatabase/serverless";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

function readDollarTag(sql, index) {
  const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
  return match?.[0] ?? null;
}

function splitSql(sql) {
  const statements = [];
  let current = "";
  let singleQuote = false;
  let doubleQuote = false;
  let lineComment = false;
  let blockComment = false;
  let dollarTag = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      current += char;
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockComment) {
      current += char;
      if (char === "*" && next === "/") {
        current += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }

    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length - 1;
        dollarTag = null;
      } else {
        current += char;
      }
      continue;
    }

    if (singleQuote) {
      current += char;
      if (char === "'" && next === "'") {
        current += next;
        index += 1;
      } else if (char === "'") {
        singleQuote = false;
      }
      continue;
    }

    if (doubleQuote) {
      current += char;
      if (char === '"') doubleQuote = false;
      continue;
    }

    if (char === "-" && next === "-") {
      current += char + next;
      index += 1;
      lineComment = true;
      continue;
    }

    if (char === "/" && next === "*") {
      current += char + next;
      index += 1;
      blockComment = true;
      continue;
    }

    const tag = char === "$" ? readDollarTag(sql, index) : null;
    if (tag) {
      current += tag;
      index += tag.length - 1;
      dollarTag = tag;
      continue;
    }

    if (char === "'") {
      current += char;
      singleQuote = true;
      continue;
    }

    if (char === '"') {
      current += char;
      doubleQuote = true;
      continue;
    }

    if (char === ";") {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

function canSkipMigrationError(error) {
  const code = error?.code ?? error?.cause?.code;
  const message = String(error?.message ?? "");
  return code === "42710" || code === "42P07" || code === "42701" || /already exists/i.test(message);
}

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Pull Vercel env or set .env.local first.");
}

const sql = neon(databaseUrl);
const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const migrationNames = readdirSync(migrationsDir)
  .filter((name) => /^\d+/.test(name))
  .sort((a, b) => a.localeCompare(b));

let applied = 0;
let skipped = 0;

for (const migrationName of migrationNames) {
  const migrationPath = path.join(migrationsDir, migrationName, "migration.sql");
  if (!existsSync(migrationPath)) continue;

  const statements = splitSql(readFileSync(migrationPath, "utf8"));
  for (const statement of statements) {
    try {
      await sql.query(statement, []);
      applied += 1;
    } catch (error) {
      if (!canSkipMigrationError(error)) {
        console.error(`Failed migration statement in ${migrationName}:`);
        console.error(statement.slice(0, 700));
        throw error;
      }
      skipped += 1;
    }
  }
}

console.log(`NEON_MIGRATIONS_DONE applied=${applied} skipped=${skipped}`);
