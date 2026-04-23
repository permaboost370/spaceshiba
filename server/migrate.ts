// One-shot migration runner. Reads server/schema.sql and applies it.
// Usage:
//   DATABASE_URL="..." npx tsx server/migrate.ts
//
// Safe to run repeatedly — the schema uses IF NOT EXISTS.
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  const schemaPath = path.join(__dirname, "schema.sql");
  const sql = readFileSync(schemaPath, "utf8");
  await client.query(sql);
  const r = await client.query(
    "select tablename from pg_tables where schemaname='public' order by tablename",
  );
  console.log(
    "migration ok. tables:",
    r.rows.map((x: { tablename: string }) => x.tablename).join(", "),
  );
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
