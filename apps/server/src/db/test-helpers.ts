import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

/**
 * Opens a fresh, unique-per-call SQLite file, sets the same pragmas the
 * production client sets, creates the categories/ingredients tables, and
 * returns the Drizzle handle plus a cleanup() that closes the connection
 * and removes the temp file.
 *
 * Reproducing `foreign_keys = ON` here is deliberate: a harness without it
 * would let the FK-enforcement tests pass vacuously (01-RESEARCH.md
 * Pitfall 2) — a fresh file per test file also avoids order-dependent
 * shared state across test files.
 */
export function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `my-bar-test-${crypto.randomUUID()}.db`)
  const sqlite = new Database(dbPath)

  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  sqlite.exec(`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE ingredients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      note TEXT,
      in_stock INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE glassware (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE recipes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      method TEXT NOT NULL,
      glassware_id TEXT REFERENCES glassware(id) ON DELETE SET NULL,
      garnish TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
      category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      quantity TEXT NOT NULL,
      unit TEXT NOT NULL,
      display_order INTEGER NOT NULL
    );
  `)

  const db = drizzle(sqlite, { schema })

  function cleanup() {
    sqlite.close()
    for (const suffix of ['', '-shm', '-wal', '-journal']) {
      const file = `${dbPath}${suffix}`
      if (fs.existsSync(file)) fs.rmSync(file)
    }
  }

  return { db, cleanup }
}
