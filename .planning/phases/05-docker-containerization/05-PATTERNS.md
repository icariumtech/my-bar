# Phase 5: Docker Containerization - Pattern Map

**Mapped:** 2026-08-20
**Files analyzed:** 6 new/modified files
**Analogs found:** 5 / 6 with strong matches

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `Dockerfile` | config | build/file-I/O | `setup.sh`, `start_server.sh` | role-match (build orchestration) |
| `docker-compose.yml` | config | configuration | `apps/server/src/index.ts`, `apps/server/src/db/client.ts` | role-match (env var & port defaults) |
| `.env.example` | config | configuration | `apps/server/src/db/client.ts`, `apps/server/src/index.ts` | exact (env var usage patterns) |
| `README.md` (update) | documentation | documentation | `setup.sh`, `start_server.sh` | exact (setup flow, build steps) |
| `.github/workflows/ci.yml` | ci/automation | automation | `package.json`, `setup.sh` | role-match (test/build scripts) |
| `apps/server/src/index.ts` (health endpoint) | route | request-response | `apps/server/src/index.ts` (existing routes) | exact (Fastify route registration) |

---

## Pattern Assignments

### `Dockerfile` (config, build/file-I/O)

**Primary Analog:** `setup.sh` (lines 1-69) — shows build sequence and dependency installation pattern

**Analog Reference:** `/home/gjohnson/src/my-bar/setup.sh`

**Build sequence pattern** (lines 31-38 of setup.sh):
```bash
# Step 1: Install dependencies
pnpm install

# Step 2: Build monorepo (shared package, server, all apps)
pnpm build
```

**Key insight for Dockerfile:** Root-level `pnpm install` (not per-package) respects workspace `*` dependencies in `apps/server/package.json` (line 18: `"@my-bar/shared": "workspace:*"`) and other app packages. Dockerfile must run from monorepo root.

**Supporting Analog:** `start_server.sh` (lines 12-24) — shows the requirement to preserve relative directory structure:

```bash
# Checks that these paths exist and are populated:
if [ ! -d "apps/barback/dist" ] || [ -z "$(ls -A apps/barback/dist 2>/dev/null)" ]; then
    pnpm --filter barback build
fi
if [ ! -d "apps/server/dist" ]; then
    pnpm --filter server build
fi
```

**Key insight for Dockerfile:** Build output must preserve monorepo layout (`apps/server/dist`, `apps/barback/dist`, `apps/patron/dist`, `apps/bartender/dist`) — do NOT flatten into single output dir. The runtime `index.ts` uses relative paths like `path.join(__dirname, '../../barback/dist')` (line 49 of `apps/server/src/index.ts`).

**Runtime environment in Dockerfile:** `apps/server/src/index.ts` (lines 78-81) shows expected runtime behavior:
```typescript
const port = process.env.PORT ? Number(process.env.PORT) : 3000
// 0.0.0.0: reachable from other devices (phone, iPads) on the LAN, not just localhost
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err)
  process.exit(1)
})
```

**Key insight:** Container must expose port 3000 (or whatever `PORT` env is set to), bind to `0.0.0.0`, and fail cleanly on errors.

**Database initialization in Dockerfile:** `apps/server/src/db/client.ts` (lines 7-12):
```typescript
const dbPath = process.env.DB_PATH ?? './data/my-bar.db'
// better-sqlite3 does not create its parent directory
fs.mkdirSync(path.dirname(dbPath), { recursive: true })
```

**Key insight:** `DB_PATH` defaults to `./data/my-bar.db` relative to the running process. Dockerfile must ensure `./data` directory exists on runtime and is writable for SQLite WAL files (`.db-wal`, `.db-shm`).

**Monorepo root `package.json` scripts** (lines 4-7):
```json
"scripts": {
  "build": "pnpm -r build",
  "test": "pnpm -r test"
}
```

**Key insight:** Dockerfile can shell out to root `pnpm build` and `pnpm test` directly — these already orchestrate per-package builds correctly.

---

### `docker-compose.yml` (config, configuration)

**Primary Analog:** `apps/server/src/index.ts` (lines 78-81) and `apps/server/src/db/client.ts` (lines 7)

**Port mapping pattern** — from `apps/server/src/index.ts`:
```typescript
const port = process.env.PORT ? Number(process.env.PORT) : 3000
app.listen({ port, host: '0.0.0.0' })
```

**Key for compose.yml:** Map host:container → `3000:3000` (default, can be overridden via `PORT` env var in compose).

**Bind-mount path pattern** — from `apps/server/src/db/client.ts`:
```typescript
const dbPath = process.env.DB_PATH ?? './data/my-bar.db'
fs.mkdirSync(path.dirname(dbPath), { recursive: true })
```

**Key for compose.yml:** 
- Volume mount: `./data:/app/data` (bind host `./data` to container `/app/data`)
- Env var in compose: `DB_PATH=/app/data/my-bar.db` or rely on default (Docker working directory is `/app`, so `./data/my-bar.db` = `/app/data/my-bar.db`)

**Environment variable propagation pattern** — from root `package.json` (lines 4-7) + `setup.sh` (line 9):
```bash
PORT="${PORT:-3000}"
export PORT
```

**Key for compose.yml:** Set `PORT` and other env vars in compose `environment:` section or via `.env` file that compose reads.

**Health check pattern** — no existing health endpoint yet, but based on standard HTTP health check pattern for Fastify services:
- Target: `GET /health` (to be added as new endpoint)
- Interval: 30s typical for services
- Timeout: 5s
- Retries: 3

---

### `.env.example` (config, configuration)

**Analog:** `apps/server/src/db/client.ts` (line 7) and `apps/server/src/index.ts` (line 78)

**Environment variables used by the app:**

From `apps/server/src/db/client.ts` (line 7):
```typescript
const dbPath = process.env.DB_PATH ?? './data/my-bar.db'
```

From `apps/server/src/index.ts` (line 78):
```typescript
const port = process.env.PORT ? Number(process.env.PORT) : 3000
```

From `apps/server/src/index.ts` (line 26):
```typescript
if (process.env.NODE_ENV !== 'production') {
  // CORS enabled only in non-production
}
```

**Pattern for `.env.example`:**
```
# Port the server listens on
PORT=3000

# Path to SQLite database file (will be created if missing)
# Default: ./data/my-bar.db (relative to working directory)
DB_PATH=./data/my-bar.db

# Node environment (production vs development)
# In production: CORS is disabled, Fastify logger is at lower level
NODE_ENV=production

# Claude API key for recipe extraction, recommendations, substitutions
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_api_key_here
```

---

### `README.md` (update) (documentation, documentation)

**Primary Analog:** `setup.sh` (lines 1-69) and `start_server.sh` (lines 1-40)

**Setup flow pattern** — from `setup.sh`:
```bash
# Step-by-step with user feedback
echo "Step 1/4: Installing dependencies..."
pnpm install
echo "✓ Dependencies installed"

echo "Step 2/4: Building shared package, server, and Barback app..."
pnpm build

echo "Step 3/4: Applying database schema..."
pnpm --filter server db:push

echo "Step 4/4: Example data seed (optional)..."
read -p "Seed the database with example ingredients/categories? [y/N] " -n 1 -r
```

**Key pattern for README:** Break down into numbered steps with clear feedback. For Docker version, simplify to: (1) clone, (2) copy `.env.example` → `.env`, (3) fill in `ANTHROPIC_API_KEY`, (4) `docker compose up -d`.

**Server startup feedback pattern** — from `start_server.sh` (lines 27-37):
```bash
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "Server will be accessible at:"
echo "  Local:   http://127.0.0.1:$PORT/barback/"
echo "  Network: http://$LOCAL_IP:$PORT/barback/   <- use this from a phone or iPad"
```

**Key pattern for README:** Document where to access each screen (`/patron/`, `/bartender/`, `/barback/`) with a clear note that kiosk devices use the LAN IP.

**Troubleshooting pattern** — from `start_server.sh` (lines 11-24):
```bash
if [ ! -d "apps/barback/dist" ] || [ -z "$(ls -A apps/barback/dist 2>/dev/null)" ]; then
    echo "Barback app not built yet — building..."
    pnpm --filter barback build
fi
```

**Key pattern for README troubleshooting:** Common failure modes:
- "Database file corrupted" → SQLite WAL mode edge cases (document in troubleshooting)
- "Better-sqlite3 native binding failed" → ARM64/armv7 compilation issues (reference `.planning/research/PITFALLS.md`)
- "Port already in use" → Change `PORT` in `.env` or via `docker compose` override

---

### `.github/workflows/ci.yml` (ci/automation, automation)

**Primary Analog:** `package.json` (lines 4-7) and `setup.sh` (lines 12-43)

**Test/build command pattern** — from root `package.json`:
```json
"scripts": {
  "build": "pnpm -r build",
  "test": "pnpm -r test"
}
```

**Key for CI workflow:**
```yaml
- name: Install dependencies
  run: pnpm install

- name: Lint/typecheck
  run: pnpm -r typecheck  # or linter if added later

- name: Test
  run: pnpm -r test

- name: Build
  run: pnpm -r build
```

**Validation pattern** — from `setup.sh` (lines 12-20):
```bash
echo "Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    exit 1
fi
NODE_VERSION=$(node --version)
```

**Key for CI workflow:** Node.js is already guaranteed by GitHub Actions runner, but CI should log versions for debugging.

**Docker build & push pattern:** No existing analog in this repo (Phase 5 is adding it), but standard practice:
- Build image: `docker build -t ghcr.io/icariumtech/my-bar:latest .`
- Push (main branch only): `docker push ghcr.io/icariumtech/my-bar:latest`
- PR builds: Build only, do not push

**Conditional execution pattern** — from CONTEXT.md (D-05):
```yaml
# Skip CI on doc-only commits
- name: Check if changes are doc-only
  id: check-docs
  run: |
    # Only run if non-doc files changed
    # .planning/**, README.md are doc-only
```

---

### `apps/server/src/index.ts` — Health Endpoint Addition (route, request-response)

**Analog:** `apps/server/src/index.ts` (lines 39-44, existing route registrations)

**Route registration pattern** (lines 39-44):
```typescript
app.register(ingredientsRoutes, { prefix: '/api/ingredients' })
app.register(categoriesRoutes, { prefix: '/api/categories' })
app.register(recipesRoutes, { prefix: '/api/recipes' })
```

**Health endpoint pattern — add before or after route registrations (order doesn't matter):**
```typescript
// Lightweight health check for Docker healthcheck directive
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})
```

**Rationale:** Returns 200 OK if the server is up and responding. Docker `healthcheck` will GET this endpoint; if it fails or times out, the container is marked unhealthy and can be restarted.

**Alternative:** Reuse existing cheap route (e.g., `GET /api/ingredients` with no auth) if that's preferred — healthcheck just needs anything that returns 200 quickly. But a dedicated `/health` route is cleaner and doesn't pollute API logs.

---

## Shared Patterns

### Port Configuration
**Used by:** `docker-compose.yml`, health endpoint, README quickstart  
**Source:** `apps/server/src/index.ts` (line 78), `start_server.sh` (line 9)

Port defaults to 3000 and is read from `PORT` environment variable. Compose maps to 3000, health check hits `localhost:3000/health` inside the container.

### Environment Variables
**Used by:** `docker-compose.yml`, `.env.example`, Dockerfile  
**Source:** `apps/server/src/db/client.ts`, `apps/server/src/index.ts`

Three core env vars:
- `PORT` — server port (default 3000)
- `DB_PATH` — database file path (default `./data/my-bar.db`)
- `NODE_ENV` — production vs development (affects CORS, logging)
- `ANTHROPIC_API_KEY` — Claude API key (required for future AI features)

All have sensible defaults or are optional; Dockerfile and compose pass them as needed.

### Database Persistence
**Used by:** `docker-compose.yml`, `.env.example`, README  
**Source:** `apps/server/src/db/client.ts` (lines 7-12)

SQLite database auto-creates parent directory on startup. Compose bind-mounts `./data` to container `/app/data` so the database persists across restarts. `.gitignore` ignores `data/`, `*.db`, `*.db-wal`, `*.db-shm`, so the volume is never committed.

### Monorepo Build Layout
**Used by:** `Dockerfile`, `docker-compose.yml`, runtime behavior  
**Source:** `apps/server/src/index.ts` (lines 48-70), `start_server.sh` (lines 12-24)

Runtime expects:
- `apps/server/dist/index.js` — compiled server
- `apps/barback/dist/` — built SPA
- `apps/patron/dist/` — built SPA
- `apps/bartender/dist/` — built SPA

These relative paths (`path.join(__dirname, '../../barback/dist')`) must be preserved in Docker image; do NOT flatten into a single `dist/` directory.

---

## No Analog Found

**Files with no close match in the codebase:**

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `Dockerfile` | config | build/file-I/O | First Docker config for this project; `setup.sh` and `start_server.sh` provide analogs for orchestration logic but not Dockerfile syntax |
| `.github/workflows/ci.yml` | ci | automation | First GitHub Actions workflow; package.json scripts provide analog for commands, but no existing CI config |

These should follow standard Docker/GitHub Actions patterns as referenced in CONTEXT.md ("janus-console/janus-deploy pattern" for Dockerfile, standard GitHub Actions patterns for CI). The PATTERNS.md above provides all command/environment analog patterns; Dockerfile and CI workflow syntax are not code excerpts from this repo but standard tool conventions.

---

## Metadata

**Analog search scope:**
- `apps/server/src/` — route registration, env var usage, server startup
- `apps/[barback|patron|bartender]/` — build patterns, frontend app structure
- `packages/shared/` — workspace dependency resolution
- Root `package.json`, `setup.sh`, `start_server.sh` — build orchestration, startup flow

**Files scanned:** 10+
- `apps/server/src/index.ts`
- `apps/server/src/db/client.ts`
- `apps/server/src/db/schema.ts`
- `apps/server/package.json`
- `apps/patron/package.json`
- `apps/barback/package.json`
- `apps/bartender/package.json`
- Root `package.json`
- `setup.sh`
- `start_server.sh`
- `apps/patron/vite.config.ts`

**Pattern extraction date:** 2026-08-20
