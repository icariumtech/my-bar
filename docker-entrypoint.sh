#!/bin/sh
set -e

# On a fresh deploy (empty ./data bind mount), better-sqlite3 creates an
# empty database file but nothing ever creates its tables — the app would
# start successfully and then fail every query. This entrypoint checks for
# that specific case and pushes the schema once, automatically.
#
# Deliberately scoped to "database has zero tables" only — it never re-runs
# on a database that already has data. Schema changes on an existing
# deployment remain a manual `pnpm --filter server db:push` step, same as
# local development; auto-applying schema diffs on every container restart
# would risk silently altering/losing data if a future schema.ts change is
# ambiguous (e.g. a column rename drizzle-kit reads as drop+add).

DB_PATH="${DB_PATH:-./data/my-bar.db}"
mkdir -p "$(dirname "$DB_PATH")"

TABLE_COUNT=$(cd apps/server && node -e "
const Database = require('better-sqlite3');
const db = new Database(process.env.DB_PATH || './data/my-bar.db');
const row = db.prepare(\"SELECT count(*) AS c FROM sqlite_master WHERE type='table'\").get();
console.log(row.c);
db.close();
")

if [ "$TABLE_COUNT" -eq 0 ]; then
  echo "[entrypoint] Empty database detected at $DB_PATH — initializing schema..."
  (cd apps/server && drizzle-kit push --force)
  echo "[entrypoint] Schema initialized."
else
  echo "[entrypoint] Database already initialized ($TABLE_COUNT tables) — skipping schema push."
fi

exec node apps/server/dist/index.js
