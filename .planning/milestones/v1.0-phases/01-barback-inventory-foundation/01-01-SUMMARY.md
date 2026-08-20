---
phase: 01-barback-inventory-foundation
plan: 01
subsystem: infra
tags: [pnpm-workspace, fastify, drizzle, better-sqlite3, react, vite, antd, tanstack-query, zod, tailwindcss-v4]

# Dependency graph
requires: []
provides:
  - pnpm monorepo skeleton (apps/server, apps/barback, packages/shared)
  - "@my-bar/shared Zod contracts: categoryInput/category, ingredientInput/ingredient"
  - Drizzle schema: categories (unique name) + ingredients (category_id FK onDelete restrict, in_stock default true)
  - better-sqlite3 client with WAL + foreign_keys pragmas (apps/server/src/db/client.ts)
  - createTestDb() Vitest fixture reproducing production pragmas (apps/server/src/db/test-helpers.ts)
  - "GET /api/ingredients route (ingredientsRoutes, injectable db option for tests)"
  - Fastify bootstrap serving the built Barback SPA same-origin under /barback/, bound to 0.0.0.0
  - Barback SPA shell: antd ConfigProvider (darkAlgorithm + D-11/D-12 tokens), useIngredients() hook, IngredientList component
affects: [01-02, 01-03, 01-04, 01-05, phase-2-recipes-makeable-engine]

# Actuals (#2632)
actuals:
  tokens: 6967
  tasks: 4
  commits: 2

# Tech tracking
tech-stack:
  added:
    - "pnpm workspaces (apps/*, packages/*)"
    - "Fastify 5.11.3 + @fastify/type-provider-zod 1.0.0 + @fastify/static 10.1.3 + @fastify/cors 11.3.0"
    - "better-sqlite3 13.0.3 + drizzle-orm 0.45.2 + drizzle-kit 0.31.10"
    - "React 19.2.8 + Vite 8.2.1 + @vitejs/plugin-react 6.0.5"
    - "antd 6.5.4 + @ant-design/icons 6.3.2 (owner-approved v6 line, Task 1 checkpoint)"
    - "@tanstack/react-query 5.101.4"
    - "Tailwind CSS 4.3.3 (CSS-first, @tailwindcss/vite)"
    - "Zod 4.4.3 (packages/shared single source of truth)"
    - "Vitest 4.1.10 + tsx 4.23.12"
  patterns:
    - "Shared Zod schema (packages/shared) imported by both the Fastify route (server-side validation/response typing) and, in later plans, the React form"
    - "SQLite WAL + foreign_keys=ON pragmas set independently in both db/client.ts (runtime) and drizzle.config.ts (drizzle-kit CLI), since drizzle-kit opens the file directly rather than through client.ts"
    - "Route plugins accept an optional `db` plugin option defaulting to the production db, so Vitest can inject a temp-file db via Fastify .inject() without a real port"
    - "Workspace packages consumed as compiled dist/ output; server and barback build scripts each run `pnpm --filter @my-bar/shared build` as a prerequisite step so the plan's literal per-package verify commands work standalone from a clean checkout"

key-files:
  created:
    - pnpm-workspace.yaml
    - package.json
    - packages/shared/src/category.ts
    - packages/shared/src/ingredient.ts
    - apps/server/src/db/schema.ts
    - apps/server/src/db/client.ts
    - apps/server/src/db/seed.ts
    - apps/server/src/db/test-helpers.ts
    - apps/server/src/routes/ingredients.ts
    - apps/server/src/routes/ingredients.test.ts
    - apps/server/src/index.ts
    - apps/barback/src/App.tsx
    - apps/barback/src/components/IngredientList.tsx
    - apps/barback/src/api/useIngredients.ts
  modified: []

key-decisions:
  - "Task 1 checkpoint (owner pre-approved): antd 6.5.4 + @ant-design/icons 6.3.2, not v5 + the React-19 patch shim — v6 is React-19-native with no compatibility shim needed"
  - "Task 2 checkpoint (owner pre-approved): category delete is refused via onDelete: 'restrict' at the schema level when ingredients still reference it — not reassign, not orphan"
  - "packages/shared compiles to dist/ (not consumed as raw .ts) so the server's runtime `node dist/index.js` (SKELETON.md's documented deployment target) resolves it without a TS loader at runtime"

patterns-established:
  - "Pattern 1 (RESEARCH.md): shared Zod schema as single source of truth for both API and (later) client form validation"
  - "Pattern 3 (RESEARCH.md): category delete guarded by FK RESTRICT, translated to a 409 by a later plan's route handler"

requirements-completed: [INV-05]
# NOTE: INV-01 ("Barback can add a new ingredient") was in this plan's frontmatter
# but is NOT marked complete — this plan proves the read path only (GET
# /api/ingredients); no POST/write endpoint or form exists yet (explicitly out of
# scope for the tracer task, see "Deviations from Plan" below). INV-01 stays
# Pending in REQUIREMENTS.md until a later plan (01-02) adds the write path.

coverage:
  - id: D1
    description: "Owner can load http://<lan-ip>:3000/barback/ on their phone and see the real inventory list rendered from the server's SQLite file"
    requirement: INV-05
    verification:
      - kind: integration
        ref: "curl http://127.0.0.1:3000/barback/ -> 200 text/html; curl http://127.0.0.1:3000/api/ingredients -> seeded row with joined categoryName"
        status: pass
    human_judgment: true
    rationale: "Automated curl checks confirm the server serves the SPA and the API returns live data, but actually viewing rendered rows on a phone over the LAN (visual/mobile-viewport confirmation, D-11/D-12/D-13 utilitarian dark styling) requires human eyes on a real device."
  - id: D2
    description: "Ingredient rows persist across a server restart (SQLite file, not in-memory)"
    verification:
      - kind: integration
        ref: "manual curl before/after `kill` + restart of `pnpm --filter server start`, same row id returned both times"
        status: pass
    human_judgment: false
  - id: D3
    description: "Foreign-key enforcement: an ingredient cannot reference a missing category, and a category in use cannot be deleted"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#rejects inserting an ingredient whose category_id does not reference an existing category"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#rejects deleting a category that still has ingredients referencing it"
        status: pass
    human_judgment: false
  - id: D4
    description: "GET /api/ingredients returns ingredients joined to their category name, defaulting new rows to in-stock"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#returns the ingredient joined to its category name, defaulting inStock true"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#returns 200 with an empty array on an empty database"
        status: pass
    human_judgment: false

duration: 14min
completed: 2026-08-10
status: complete
---

# Phase 1 Plan 1: Walking Skeleton Summary

**pnpm monorepo (Fastify + Drizzle/better-sqlite3 + React 19/Vite/antd) proving one live read path — the Barback screen renders a seeded SQLite ingredient row, joined to its category, surviving a server restart, with FK enforcement locked under 4 passing Vitest tests.**

## Performance

- **Duration:** ~14 min
- **Started:** 2026-08-10T14:02:00Z (approx, worktree creation)
- **Completed:** 2026-08-10T14:16:01Z
- **Tasks:** 4 (2 pre-approved checkpoints + 1 tracer + 1 blocking test-lock task)
- **Files modified:** 30 (27 in the tracer commit, 3 in the test-lock commit)

## Accomplishments

- Stood up the pnpm workspace (`apps/server`, `apps/barback`, `packages/shared`) with every dependency pinned to an exact version per `01-RESEARCH.md`'s Standard Stack and `SKELETON.md`
- `@my-bar/shared` Zod contracts (`categoryInput`/`category`, `ingredientInput`/`ingredient`) are the single source of truth for the API response shape, with load-bearing `.max()` bounds (threat T-01-02)
- Drizzle schema enforces D-01 (unique category names) and D-02/D-03 (`category_id` FK `onDelete: 'restrict'`) — the owner's pre-approved "refuse" delete-in-use decision (Task 2 checkpoint) is now a database-level guarantee, not an app-level convention
- `GET /api/ingredients` joins ingredients to categories via Drizzle's query builder exclusively (T-01-01); Fastify serves the built Barback SPA same-origin under `/barback/` and binds `0.0.0.0` for LAN reachability
- Barback SPA renders real seeded data: antd `ConfigProvider` with `darkAlgorithm` and the four D-11/D-12 utilitarian dark tokens, a `useIngredients()` TanStack Query hook, and `IngredientList` rendering name/category/in-stock dot at a 48px row height
- 4 Vitest integration tests (via Fastify `.inject()`, no real port) lock the read path and prove FK enforcement isn't vacuous: empty-db → `[]`, seeded row → joined `categoryName` + `inStock: true`, unknown `category_id` insert → FK error, delete-in-use category → FK error
- End-to-end proof: seeded "Bombay Sapphire Gin" / "Dry Gin" survives a full server kill + restart with an identical row id, confirming SQLite-file persistence rather than in-memory state

## Task Commits

Each task was committed atomically:

1. **Task 1: Approve the Ant Design dependency (checkpoint:human-verify)** — pre-approved by the owner ("approve v6"), no code, no commit.
2. **Task 2: Category-delete-on-FK-conflict decision (checkpoint:decision)** — pre-approved by the owner ("refuse"), no code, no commit.
3. **Task 3: End-to-end tracer — Barback lists real bottles from SQLite** - `b8ba4b3` (feat)
4. **Task 4: Apply schema to live DB, lock the read path under test** - `721daea` (test)

_No separate plan-metadata commit in worktree mode — the orchestrator commits STATE.md/ROADMAP.md centrally after the wave merges._

## Files Created/Modified

- `pnpm-workspace.yaml`, `package.json`, `.gitignore` — workspace root config
- `packages/shared/{package.json,tsconfig.json,src/index.ts,src/category.ts,src/ingredient.ts}` — shared Zod contracts, compiled to `dist/` for runtime consumption
- `apps/server/{package.json,tsconfig.json,drizzle.config.ts,vitest.config.ts}` — server package config
- `apps/server/src/db/{schema.ts,client.ts,seed.ts,test-helpers.ts}` — Drizzle schema, WAL/FK-pragma client, idempotent seed, Vitest fixture
- `apps/server/src/routes/{ingredients.ts,ingredients.test.ts}` — the one read route and its integration tests
- `apps/server/src/index.ts` — Fastify bootstrap: Zod compilers, CORS (dev-only), static SPA mount, `0.0.0.0` bind
- `apps/barback/{package.json,tsconfig.json,vite.config.ts,index.html}` — Barback app config
- `apps/barback/src/{main.tsx,App.tsx,index.css}` — React 19 root, antd `ConfigProvider` dark theme shell, Tailwind v4 CSS-first entry with D-11/D-12 palette
- `apps/barback/src/api/{client.ts,useIngredients.ts}` — typed fetch wrapper, TanStack Query hook
- `apps/barback/src/components/IngredientList.tsx` — populated-state ingredient row rendering

## Decisions Made

- **Task 1 (pre-approved):** antd 6.5.4 + @ant-design/icons 6.3.2 — the React-19-native line, removing the `@ant-design/v5-patch-for-react-19` shim v5 would have needed.
- **Task 2 (pre-approved):** category delete is refused at the schema level (`onDelete: 'restrict'`) when ingredients still reference it — enforced by the database itself via the `foreign_keys = ON` pragma, not by application-layer checks alone.
- **packages/shared build step:** compiled to `dist/` (with `main`/`types` pointing there) rather than consumed as raw `.ts`, because `SKELETON.md` documents `node apps/server/dist/index.js` as the deployment target and Node cannot execute a raw `.ts` file at runtime without a loader. Both `apps/server` and `apps/barback`'s `build` scripts run `pnpm --filter @my-bar/shared build` as a prerequisite so the plan's literal `<verify>` commands (`pnpm --filter barback build && pnpm --filter server build`, called with no separate shared-build step) succeed standalone from a clean checkout.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] better-sqlite3 does not create its DB file's parent directory**
- **Found during:** Task 3, first run of the plan's automated `<verify>` command on a clean checkout (no `data/` dir yet, since it's gitignored)
- **Issue:** `new Database(process.env.DB_PATH ?? './data/my-bar.db')` throws `Cannot open database because the directory does not exist` on a fresh clone — both `src/db/client.ts` (runtime) and `drizzle.config.ts` (drizzle-kit CLI, which opens the file independently) hit this.
- **Fix:** Both files now `fs.mkdirSync(path.dirname(dbPath), { recursive: true })` before opening the connection.
- **Files modified:** `apps/server/src/db/client.ts`, `apps/server/drizzle.config.ts`
- **Verification:** Full clean-checkout run of `pnpm install && pnpm --filter server db:push && pnpm --filter server db:seed && pnpm --filter barback build && pnpm --filter server build` succeeds with `data/` removed beforehand.
- **Committed in:** `b8ba4b3` (Task 3 commit)

**2. [Rule 3 - Blocking] `@my-bar/shared` unresolvable at server runtime without a compile step**
- **Found during:** Task 3, running `pnpm --filter server start` for the first time — `node dist/index.js` threw `ERR_UNKNOWN_FILE_EXTENSION` trying to load `packages/shared/src/index.ts` directly (the package's `main` field pointed at raw `.ts`).
- **Issue:** Plain `node` cannot execute `.ts` files; the compiled server bundle needs `@my-bar/shared` to resolve to compiled JS, but the plan's own `<files>` list and `<verify>` commands don't call out a separate shared-build step.
- **Fix:** Gave `packages/shared` a `build` script (`tsc`) with `main`/`types` pointing at `dist/`; made both `apps/server` and `apps/barback`'s `build` scripts run `pnpm --filter @my-bar/shared build` first, so each app's build is self-sufficient from a bare `pnpm install`.
- **Files modified:** `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts` (relative imports needed explicit `.js` extensions under `NodeNext` resolution), `apps/server/package.json`, `apps/barback/package.json`
- **Verification:** Clean-checkout run of the plan's exact `<verify>` line succeeds; `node dist/index.js` boots and serves both the API and the static SPA.
- **Committed in:** `b8ba4b3` (Task 3 commit)

**3. [Rule 3 - Blocking] pnpm's default-deny native build scripts silently skip better-sqlite3/esbuild**
- **Found during:** Task 3, first `pnpm install`
- **Issue:** pnpm 11's new build-script allowlist model reported `[ERR_PNPM_IGNORED_BUILDS]` for `better-sqlite3` and `esbuild` — both already carry an "Approved" verdict in `01-RESEARCH.md`'s Package Legitimacy Audit table, so this is a pnpm-version-specific mechanical gate, not a new legitimacy question.
- **Fix:** Set `allowBuilds: { better-sqlite3: true, esbuild: true }` in the auto-generated block in `pnpm-workspace.yaml`.
- **Files modified:** `pnpm-workspace.yaml`
- **Verification:** `better-sqlite3` loads and opens a real SQLite connection (`node -e "require('better-sqlite3')..."` inside `apps/server`); `esbuild` postinstall completes for vite/tsx's transitive deps.
- **Committed in:** `b8ba4b3` (Task 3 commit)

**4. [Rule 1 - Bug] REQUIREMENTS.md correction: INV-01 reverted from auto-marked-complete**
- **Found during:** State-update step, after running the standard `requirements mark-complete INV-01 INV-05` from this plan's frontmatter `requirements:` field
- **Issue:** The mechanical mark-complete step checked off both IDs the plan frontmatter listed, but INV-01 ("Barback can add a new ingredient/bottle with name and category") is not actually satisfied by this plan — Task 3 explicitly scopes out "a write endpoint, a form" as later-plan work, and only `GET /api/ingredients` exists. Leaving INV-01 checked would misrepresent project state to anyone reading REQUIREMENTS.md or a future ship-gate audit.
- **Fix:** Reverted INV-01's checkbox and Traceability row back to unchecked/Pending in `.planning/REQUIREMENTS.md`; kept INV-05 (mobile-first responsive layout) marked complete since the Barback SPA shell genuinely delivers that. This SUMMARY's `coverage:` block was also corrected to drop the `requirement: INV-01` links on deliverables that don't actually complete INV-01.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** Manual review of Task 3's `<action>` boundary ("Do not add ... a write endpoint, a form") confirms no add-ingredient capability was built.
- **Committed in:** part of the SUMMARY/REQUIREMENTS.md metadata commit (not a task commit — this is a correction to the state-update step, not to shipped code)

---

**Total deviations:** 4 auto-fixed (2 bug, 2 blocking)
**Impact on plan:** The first three were required for the plan's own `<verify>` commands to pass on a genuinely clean checkout; none change the architecture, data model, or the two owner-approved checkpoint decisions. The fourth corrects a project-record accuracy issue (REQUIREMENTS.md), not shipped code. No scope creep — no write endpoints, forms, search, or swipe gesture were added (those remain later plans' scope per the tracer task's explicit boundary).

## Issues Encountered

None beyond the three auto-fixed deviations above — each was caught by actually running the plan's own automated `<verify>` commands from a clean state (not just trusting `tsc`/`vite build` success, which had already passed before the runtime/clean-checkout issues surfaced).

## User Setup Required

None — no external service configuration required. `DB_PATH`, `PORT`, and `NODE_ENV` all have working defaults; no secrets or API keys are used in this phase.

## Next Phase Readiness

- The `@my-bar/shared` contracts, Drizzle schema, and `ingredientsRoutes` injectable-`db` pattern are ready for plan 01-02 (add ingredient) and 01-03 (edit/toggle) to extend with `POST`/`PATCH` handlers against the same tables.
- `createTestDb()` is ready to be reused by every subsequent server-side test file in this phase — no changes needed to the fixture itself.
- The category-delete-refused behavior (Task 2 decision) is enforced at the schema level now; plan 01-04 only needs to translate the SQLite constraint error into a 409 response with the Copywriting Contract's exact message — no further schema changes required.
- No blockers. The zero-categories-exist UI state (flagged `⚠ unresolved` in `01-UI-SPEC.md`) remains open for whichever plan builds category management (D-03) — not this plan's scope.

## Self-Check: PASSED

All created files confirmed on disk (pnpm-workspace.yaml, apps/server/src/db/{schema.ts,test-helpers.ts}, apps/server/src/routes/ingredients.test.ts, apps/barback/src/App.tsx, apps/barback/src/components/IngredientList.tsx). Both task commit hashes (`b8ba4b3`, `721daea`) confirmed present in `git log --oneline --all`.

---
*Phase: 01-barback-inventory-foundation*
*Completed: 2026-08-10*
