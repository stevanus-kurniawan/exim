/**
 * Run all SQL migration files in order (001_, 002_, ...).
 * Requires DATABASE_URL. Run from backend directory: npm run migrate.
 */

import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { getPool, closeDb } from "./index.js";

const MIGRATIONS_DIR = join(process.cwd(), "src", "db", "migrations");

async function run(): Promise<void> {
  const pool = getPool();
  const files = await readdir(MIGRATIONS_DIR);
  const sqlFiles = files
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (sqlFiles.length === 0) {
    console.log("No migration files found.");
    await closeDb();
    process.exit(0);
    return;
  }

  const client = await pool.connect();
  try {
    for (const file of sqlFiles) {
      const path = join(MIGRATIONS_DIR, file);
      const sql = await readFile(path, "utf-8");
      await client.query(sql);
      console.log(`Ran: ${file}`);
    }
    console.log("Migrations completed.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await closeDb();
    process.exit(0);
  }
}

run();
