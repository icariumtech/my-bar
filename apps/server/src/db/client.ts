import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'

const dbPath = process.env.DB_PATH ?? './data/my-bar.db'

// better-sqlite3 does not create its parent directory — on a clean
// checkout (data/ is gitignored) opening the connection would otherwise
// throw "Cannot open database because the directory does not exist".
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

const sqlite = new Database(dbPath)

// SQLite disables foreign-key enforcement per-connection by default — this
// pragma is what makes the onDelete: 'restrict' clause in schema.ts actually
// enforced rather than decorative (01-RESEARCH.md Pitfall 2).
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
