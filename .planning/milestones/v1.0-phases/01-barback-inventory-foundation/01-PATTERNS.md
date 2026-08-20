# Phase 1: Barback Inventory Foundation - Pattern Map

**Mapped:** 2026-08-09
**Files analyzed:** 15 (new — all files in this phase are new; nothing is being modified)
**Analogs found:** 0 / 15 — **this is a greenfield repository.**

## Codebase Search Result

Confirmed via `find . -maxdepth 2` at repo root: the only tracked/present content is `.claude/CLAUDE.md`, `.planning/`, `LICENSE`, `README.md`, and two unrelated reference photos (`PXL_20260809_011509863.jpg`, `PXL_20260809_011531977.jpg` — dark-neon Patron style references, not relevant until Phase 3). There are:

- No `apps/` or `packages/` directories
- No `package.json`, `pnpm-workspace.yaml`, or any monorepo scaffolding
- No `.ts`/`.tsx`/`.js` source files anywhere
- No prior Fastify routes, Drizzle schemas, React components, or test files to pattern-match against

**Conclusion: there are no existing-code analogs for any file in this phase.** Every file below has "No analog — first implementation" as its match quality. The planner must build all files fresh, using RESEARCH.md's Code Examples/Architecture Patterns sections (cited from official docs, not from this codebase) as the pattern source instead of an in-repo analog.

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|-----------------|---------------|
| `pnpm-workspace.yaml`, root `package.json` | config | — | none | no analog |
| `apps/server/src/index.ts` | config/bootstrap | request-response | none | no analog |
| `apps/server/src/db/client.ts` | config | — | none | no analog |
| `apps/server/src/db/schema.ts` | model | CRUD | none | no analog |
| `apps/server/src/routes/ingredients.ts` | controller/route | CRUD | none | no analog |
| `apps/server/src/routes/categories.ts` | controller/route | CRUD | none | no analog |
| `apps/server/src/routes/ingredients.test.ts` | test | CRUD | none | no analog |
| `apps/server/src/routes/categories.test.ts` | test | CRUD | none | no analog |
| `apps/server/src/db/test-helpers.ts` | utility | — | none | no analog |
| `packages/shared/src/ingredient.ts` | model (schema) | transform | none | no analog |
| `packages/shared/src/category.ts` | model (schema) | transform | none | no analog |
| `apps/barback/src/components/IngredientList.tsx` | component | CRUD | none | no analog |
| `apps/barback/src/components/IngredientRow.tsx` | component | event-driven | none | no analog |
| `apps/barback/src/components/SearchFilterBar.tsx` | component | transform | none | no analog |
| `apps/barback/src/components/AddEditIngredientForm.tsx` | component | CRUD | none | no analog |
| `apps/barback/src/api/useIngredients.ts` | hook | CRUD | none | no analog |
| `apps/barback/src/api/useCategories.ts` | hook | CRUD | none | no analog |
| `apps/barback/src/main.tsx` | provider/bootstrap | — | none | no analog |
| `apps/barback/vite.config.ts`, Tailwind entry CSS | config | — | none | no analog |

## Pattern Assignments

Since no in-repo analogs exist, planner should copy the following patterns directly from RESEARCH.md (`.planning/phases/01-barback-inventory-foundation/01-RESEARCH.md`), which are cited from official documentation sources rather than derived from this codebase.

### `apps/server/src/index.ts` (bootstrap, request-response)
**Source:** RESEARCH.md "Code Examples > Fastify server bootstrap serving both API and static SPA" (lines 369-394)
Pattern: Fastify instance with Zod validator/serializer compilers registered, route plugins registered with `/api/...` prefixes, `@fastify/static` serving the built Barback SPA from the same process, `host: '0.0.0.0'` for LAN reachability.

### `apps/server/src/db/client.ts` (config)
**Source:** RESEARCH.md "Code Examples > better-sqlite3 + Drizzle client with WAL and FK pragmas" (lines 397-409)
Pattern: `new Database(...)`, then `pragma('journal_mode = WAL')` and `pragma('foreign_keys = ON')` (required — SQLite FKs are off by default per Pitfall 2), then `drizzle(sqlite, { schema })`.

### `apps/server/src/db/schema.ts` (model, CRUD)
**Source:** RESEARCH.md "Pattern 3: Category delete guarded by FK RESTRICT" (lines 300-322)
Pattern: `sqliteTable` defs for `categories` (id, name unique) and `ingredients` (id, name, categoryId with `.references(() => categories.id, { onDelete: 'restrict' })`, note, inStock boolean defaulting true — satisfies D-09).

### `apps/server/src/routes/ingredients.ts`, `categories.ts` (controller/route, CRUD)
**Source:** RESEARCH.md "Pattern 1: Shared Zod schema as single source of truth" (lines 227-256)
Pattern: import Zod schema from `packages/shared`, use `app.withTypeProvider<ZodTypeProvider>()`, `schema: { body: ingredientInput }` on route def, Drizzle insert/update inside handler, return created/updated row. For category delete, translate the SQLite RESTRICT constraint error into a 409 response (Pattern 3, Open Question 2).

### `packages/shared/src/ingredient.ts`, `category.ts` (model/schema, transform)
**Source:** RESEARCH.md "Pattern 1" code block (lines 232-241)
Pattern: `z.object({...})` with `.min()/.max()` constraints, exported `z.infer<>` type — this is the single source of truth consumed by both the Fastify route (server-side validation) and the React form (client-side validation).

### `apps/barback/src/components/IngredientRow.tsx` (component, event-driven)
**Source:** RESEARCH.md "Pattern 2: Swipe-with-undo-grace-period toggle" (lines 258-298)
Pattern: `useSwipeable({ onSwipedLeft, onSwipedRight })` from `react-swipeable`; swipe sets local `pending` state immediately (optimistic UI) and starts a `setTimeout` (~3s, D-08's "brief" grace period) before firing `onCommitToggle` (the actual PATCH mutation); an `Undo` button clears the timeout and reverts local state without any network call. Do NOT fire the PATCH immediately with toast-based undo-after — D-08/D-10 require deferred commit, not immediate-then-reversible.

### `apps/barback/src/api/useIngredients.ts`, `useCategories.ts` (hook, CRUD)
**Source:** RESEARCH.md "Don't Hand-Roll" table + Pitfall 4 (lines 337, 361-365)
Pattern: TanStack Query hooks; every mutation (add, edit, toggle stock, category add/rename/delete) must call `queryClient.invalidateQueries({ queryKey: ['ingredients'] })` (or `['categories']`) in `onSettled` regardless of success/failure, so the list always resyncs to server truth — do not implement a hand-rolled optimistic-update/rollback with plain `useState`.

### `apps/barback/vite.config.ts` / Tailwind CSS entry (config)
**Source:** RESEARCH.md "Pitfall 3: Tailwind v4's config model is CSS-first" (lines 355-359)
Pattern: `@import "tailwindcss";` as the CSS entry point (NOT the v3 `@tailwind base/components/utilities` directives), `@theme { ... }` block for the D-11/D-12 distinct dark utilitarian palette, `@custom-variant dark (&:where(.dark, .dark *));`, and `@tailwindcss/vite` plugin added to `vite.config.ts` — no `tailwind.config.js`, no PostCSS config file.

## Shared Patterns

### Zod as single source of truth for validation
**Source:** RESEARCH.md Pattern 1, `.claude/CLAUDE.md` Zod row
**Apply to:** every route file and every form component — one schema in `packages/shared`, imported by both server (via `@fastify/type-provider-zod`) and client.

### TanStack Query mutation settle/reconcile
**Source:** RESEARCH.md Pitfall 4
**Apply to:** all four mutation types in this phase (add ingredient, edit ingredient, toggle stock, category add/rename/delete).

### SQLite FK pragma + WAL mode
**Source:** RESEARCH.md Pitfall 2, Code Examples "better-sqlite3 + Drizzle client"
**Apply to:** the single `db/client.ts` file — must set both pragmas on every connection at startup.

## No Analog Found

All 15+ files in this phase have no analog — this is the expected/correct state for a Phase 1 greenfield bootstrap.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| all files listed above | various | various | No application code exists anywhere in the repository prior to this phase; verified via directory listing at repo root and `.planning/phases/01-.../01-CONTEXT.md` code_context section ("no application code exists yet") |

## Metadata

**Analog search scope:** entire repository root (`find . -maxdepth 2`), confirmed empty of application code
**Files scanned:** 0 source files found (repo contains only `.claude/`, `.planning/`, `LICENSE`, `README.md`, two `.jpg` reference photos)
**Pattern extraction date:** 2026-08-09
**Pattern source for this phase:** `.planning/phases/01-barback-inventory-foundation/01-RESEARCH.md` (Architecture Patterns, Code Examples, Don't Hand-Roll, Common Pitfalls sections) — used in place of in-repo analogs
</content>
</invoke>
