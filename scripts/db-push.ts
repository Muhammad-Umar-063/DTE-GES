/**
 * scripts/db-push.ts — applies every migration in supabase/migrations/
 * to the Postgres database at $DATABASE_URL, in filename order.
 *
 * Run with:  npm run db:push
 *
 * Tracks which files have been applied in public._schema_migrations so re-runs
 * only execute new files. Each file is wrapped in a single transaction; any
 * error aborts that file (and the run) without leaving a half-applied schema.
 *
 * Expects a Supabase Postgres connection string in .env.local:
 *   DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
 * Or the session-pooler equivalent (port 5432, IPv4-friendly).
 * Do NOT use the transaction pooler (port 6543) — it doesn't support DDL transactions.
 */

import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { Client, type ClientConfig } from "pg";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "supabase/migrations");

// Parse `postgresql://user:password@host:port/db?params` manually so the
// password can contain special characters (#, /, ?, [, ], space, …) without
// requiring the user to URL-encode it themselves. We only treat the FIRST `:`
// and the LAST `@` as structural separators; everything between is the password.
function parseConnectionString(raw: string): ClientConfig {
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  const protoIdx = trimmed.indexOf("://");
  if (protoIdx < 0) throw new Error("DATABASE_URL must start with postgres:// or postgresql://");
  const afterProto = trimmed.slice(protoIdx + 3);

  const lastAt = afterProto.lastIndexOf("@");
  if (lastAt < 0) throw new Error("DATABASE_URL missing '@' between credentials and host");
  const userInfo = afterProto.slice(0, lastAt);
  const hostPart = afterProto.slice(lastAt + 1);

  const firstColon = userInfo.indexOf(":");
  if (firstColon < 0) throw new Error("DATABASE_URL missing ':' between user and password");
  const user = userInfo.slice(0, firstColon);
  const rawPassword = userInfo.slice(firstColon + 1);
  // Tolerate either an already-URL-encoded password or a raw one.
  let password = rawPassword;
  try {
    password = decodeURIComponent(rawPassword);
  } catch {
    // not valid percent-encoding — treat as literal
  }

  // hostPart = host:port/database?query
  const slashIdx = hostPart.indexOf("/");
  const hostPortAndQuery = slashIdx < 0 ? hostPart : hostPart.slice(0, slashIdx);
  const dbAndQuery = slashIdx < 0 ? "" : hostPart.slice(slashIdx + 1);

  const [hostPort] = hostPortAndQuery.split("?");
  const colonIdx = hostPort.lastIndexOf(":");
  const host = colonIdx > 0 ? hostPort.slice(0, colonIdx) : hostPort;
  const port = colonIdx > 0 ? parseInt(hostPort.slice(colonIdx + 1), 10) : 5432;

  const [database] = dbAndQuery.split("?");

  return {
    host,
    port,
    user,
    password,
    database: database || "postgres",
    ssl: { rejectUnauthorized: false },
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ Missing DATABASE_URL in .env.local");
    console.error(
      "  Get it from Supabase dashboard → Project Settings → Database → Connection string (URI).",
    );
    process.exit(1);
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error("✗ No .sql files in supabase/migrations/");
    process.exit(1);
  }

  const cfg = parseConnectionString(url);
  console.log(`→ Connecting to ${cfg.host}:${cfg.port}/${cfg.database} as ${cfg.user}`);
  const client = new Client(cfg);
  await client.connect();
  console.log("→ Connected.");

  // Ledger table.
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._schema_migrations (
      filename   text PRIMARY KEY,
      applied_at timestamptz DEFAULT now()
    );
  `);

  const { rows: applied } = await client.query<{ filename: string }>(
    "SELECT filename FROM public._schema_migrations",
  );
  const appliedSet = new Set(applied.map((r) => r.filename));

  let appliedCount = 0;
  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`   · ${file}  (already applied)`);
      continue;
    }

    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
    process.stdout.write(`   → ${file}  ... `);

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO public._schema_migrations (filename) VALUES ($1)",
        [file],
      );
      await client.query("COMMIT");
      console.log("ok");
      appliedCount++;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.log("FAILED");
      console.error(err);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();

  if (appliedCount === 0) {
    console.log("\n✓ Database already up to date.");
  } else {
    console.log(`\n✓ Applied ${appliedCount} migration(s).`);
  }
}

main().catch((err) => {
  console.error("\n✗ db-push failed:", err);
  process.exit(1);
});
