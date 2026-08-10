import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'drizzle-kit'

const dbPath = process.env.DB_PATH ?? './data/my-bar.db'

// drizzle-kit opens this path directly (not through src/db/client.ts), so
// this config must independently ensure the parent directory exists on a
// clean checkout — same fix as src/db/client.ts.
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
})
