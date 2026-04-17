import { readdir, readFile } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { sequelize } from "../config/database.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function runMigrations(): Promise<void> {
  // Create migrations tracking table if not exists
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  const files = await readdir(__dirname)
  const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort()

  for (const file of sqlFiles) {
    const [applied] = await sequelize.query(
      `SELECT 1 FROM _migrations WHERE name = :name`,
      { replacements: { name: file }, type: "SELECT" as any },
    )

    if (applied) continue

    console.log(`[migrations] Running ${file}...`)
    const sql = await readFile(join(__dirname, file), "utf8")

    // Split by semicolons and run each statement (skip CONCURRENTLY in transactions)
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"))

    for (const stmt of statements) {
      try {
        await sequelize.query(stmt)
      } catch (err: any) {
        // Ignore "already exists" errors for idempotency
        if (err.original?.code === "42710" || err.original?.code === "42P07") {
          console.log(`[migrations] Skipping (already exists): ${stmt.slice(0, 60)}...`)
          continue
        }
        throw err
      }
    }

    await sequelize.query(
      `INSERT INTO _migrations (name) VALUES (:name)`,
      { replacements: { name: file } },
    )
    console.log(`[migrations] Applied ${file}`)
  }
}
