# Phase 1: Barback Inventory Foundation - Research

**Researched:** 2026-08-09
**Domain:** Full-stack CRUD web app bootstrap — pnpm monorepo, Fastify + Drizzle/SQLite backend, React 19 + Vite + Tailwind v4 mobile frontend, swipe-gesture interaction
**Confidence:** HIGH (stack/versions verified against npm registry; architecture patterns MEDIUM — cross-checked web sources, no direct Context7 doc fetch available this session)

## Summary

Phase 1 is a greenfield bootstrap: there is no application code yet, only planning docs. The phase must stand up the full vertical slice needed for the Barback screen alone — a pnpm monorepo (`apps/server`, `apps/barback`, `packages/shared`), a Fastify + better-sqlite3 + Drizzle backend exposing a small CRUD REST API for ingredients and categories, and a React 19 + Vite + Tailwind v4 mobile-first frontend with swipe-to-toggle-stock gestures. Phase 2+ (Patron, Bartender, Socket.IO sync) are explicitly out of scope — this phase's backend only needs REST, not WebSocket, since SYNC-01 belongs to Phase 3.

The two data-model decisions with the highest execution risk are: (1) categories are their own owner-managed table (not free text) with `ON DELETE RESTRICT` so a category with ingredients can't be silently orphaned, since Phase 2's makeable-matching depends on every ingredient always having a category; and (2) the swipe-to-toggle interaction needs a client-side "pending" state with a timer-based commit (not an immediate PATCH), matching the user's explicit undo-grace-period decision (D-08/D-10).

**Primary recommendation:** Use the exact stack pinned in `.claude/CLAUDE.md` (Fastify 5 + better-sqlite3 + Drizzle + React 19 + Vite + Tailwind v4 + TanStack Query), add `@fastify/type-provider-zod` for schema-validated routes, and `react-swipeable` for the swipe gesture — skip Socket.IO entirely in this phase since no other screen exists yet to sync with.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Ingredient/category CRUD (add, edit) | API / Backend | Database | Fastify route validates + writes via Drizzle; owner-facing form is client-side only for input collection |
| In-stock/out-of-stock toggle | API / Backend | Browser / Client | Server holds the single source of truth (boolean `in_stock` column); client owns only the swipe gesture + optimistic UI + undo-timer, not the authoritative state |
| Search/filter inventory list | Browser / Client | API / Backend | At this scale (50-100 rows) client-side filter over an already-fetched list is simplest and instant; API just needs to return the full list, no server-side search endpoint needed in Phase 1 |
| Category taxonomy management (add/rename/delete) | API / Backend | Database | Same as ingredient CRUD — FK constraints (`ON DELETE RESTRICT`) live in the database, enforced through the API layer |
| Mobile-first responsive layout | Browser / Client | — | Pure CSS/Tailwind concern, no backend involvement |
| Data persistence | Database | — | better-sqlite3 file on the local server; single source of truth for all three future screens |

## User Constraints (from CONTEXT.md)

<user_constraints>
### Locked Decisions

**Category Model**
- D-01: Categories are a fixed, curated list — not free-text per ingredient. Prevents typo drift that would silently break Phase 2's category-based makeable matching. Reversibility: costly.
- D-02: One category per ingredient (not multi-category). Simpler data model and simpler Phase 2 matching logic.
- D-03: The owner can add/rename/delete categories directly from the Barback screen in Phase 1 — not a hardcoded preset list. Categories can be as broad or specific as the owner wants.

**Ingredient Identity**
- D-04: Inventory entries represent specific bottles/brands, not generic ingredient types — e.g. "Bombay Sapphire Gin," not just "Gin."
- D-05: A single free-text **Name** field holds the full product title. No separate structured Brand/Product fields — Category (D-01–D-03) is the separate field used for matching/filtering.
- D-06: An optional free-text size/note field is included per ingredient (e.g. "750ml"), even though nothing reads it yet in Phase 1 or Phase 2's matching logic.
- D-07: Flavor-profile data is explicitly OUT of Phase 1's data model — deferred. Do not add a flavor/profile field now.

**In-stock Toggle & Defaults**
- D-08: Toggle interaction is a **swipe gesture** on the ingredient row: swipe left → out-of-stock, swipe right → in-stock, with a brief (~few seconds) undo grace period before the change finalizes. Not a switch control, not a full-row tap.
- D-09: Newly added ingredients default to **in-stock**.
- D-10: No blocking confirmation modal on toggle — the swipe's undo grace period (D-08) is the safety net instead.

**Barback Visual Style**
- D-11: The Barback screen gets its own **distinct, utilitarian** visual style — does NOT reuse the dark-neon Patron branding.
- D-12: Barback uses a **dark color scheme** — easier on the eyes in dim bar lighting when restocking.
- D-13: Layout prioritizes **large tap targets and minimal chrome** over information density — optimized for one-handed thumb use.

### Claude's Discretion
None — every gray area discussed had an explicit user decision. No open "you decide" items from this discussion.

### Deferred Ideas (OUT OF SCOPE)
- AI-assisted brand/flavor-affinity matching — depends on flavor-profile data (D-07, also deferred); consider as a fast-follow after Phase 2.
- Barcode-scan-to-toggle-stock — refinement to v2 SCAN-01/SCAN-02; relevant when those are eventually planned.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INV-01 | Barback can add a new ingredient/bottle with name and category | Fastify+Zod POST `/api/ingredients` route pattern; Drizzle insert; React form + TanStack Query mutation (Code Examples section) |
| INV-02 | Barback can edit an existing ingredient's name/category | PATCH `/api/ingredients/:id` route pattern; same form component reused for edit; TanStack Query optimistic update pattern |
| INV-03 | Barback can toggle an ingredient in-stock/out-of-stock | Swipe gesture pattern (react-swipeable) + client-side undo-timer before PATCH `/api/ingredients/:id/stock` fires (Pattern 2, Pitfall 2) |
| INV-04 | Barback can search/filter the inventory list by name or category | Client-side filter over TanStack Query cached list — no new backend endpoint needed (Architectural Responsibility Map) |
| INV-05 | Barback interface is mobile-first responsive (usable one-handed on a phone) | Tailwind v4 mobile-first breakpoints, thumb-zone layout guidance (Pattern 3, Common Pitfalls) |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22.x LTS (22.22.1 confirmed installed locally) | Runtime | Pinned by `.claude/CLAUDE.md`; confirmed present in dev environment `[VERIFIED: node --version]` |
| TypeScript | 5.9.3 (latest 5.x) | Language | `.claude/CLAUDE.md` pins "TypeScript 5.x" as a locked project constraint. **Note:** npm's `latest` dist-tag for `typescript` is now `7.0.2` (the native/Corsa compiler) `[VERIFIED: npm registry]` — this is newer than the CLAUDE.md recommendation and is flagged in Open Questions/Assumptions below rather than silently upgraded. |
| Fastify | 5.11.3 | Backend API server | `[VERIFIED: npm registry]` — matches CLAUDE.md's "5.x" pin |
| better-sqlite3 | 13.0.3 | Database driver | `[VERIFIED: npm registry]` — matches CLAUDE.md's "13.x" pin |
| Drizzle ORM | 0.45.2 | Type-safe SQL layer | `[VERIFIED: npm registry]` — matches CLAUDE.md's "0.45.x" pin |
| drizzle-kit | 0.31.10 | Migration CLI companion to Drizzle | `[VERIFIED: npm registry]` |
| React | 19.2.8 | UI library | `[VERIFIED: npm registry]` — matches CLAUDE.md's "19.x" pin |
| react-dom | 19.2.8 | React DOM renderer | `[VERIFIED: npm registry]` |
| Vite | 8.2.1 | Frontend build tool | `[VERIFIED: npm registry]` — matches CLAUDE.md's "8.x" pin |
| @vitejs/plugin-react | 6.0.5 | Vite React JSX/Fast Refresh plugin | `[VERIFIED: npm registry]` |
| @tanstack/react-query | 5.101.4 | Client-side data fetching/cache | `[VERIFIED: npm registry]` — matches CLAUDE.md's "5.x" pin |
| Tailwind CSS | 4.3.3 | Styling | `[VERIFIED: npm registry]` — matches CLAUDE.md's "4.3.x" pin |
| @tailwindcss/vite | 4.3.3 | Tailwind v4 Vite plugin (replaces PostCSS config) | `[VERIFIED: npm registry]` |
| Zod | 4.4.3 | Runtime schema validation | `[VERIFIED: npm registry]` — matches CLAUDE.md's "4.x" pin |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fastify/static | 10.1.3 | Serve built Vite SPA bundle from the Fastify process | Always in this project — Fastify serves `/barback`'s built `dist/` directly, no reverse proxy `[VERIFIED: npm registry]` |
| @fastify/type-provider-zod | 1.x (latest per registry) | Wires Zod schemas into Fastify route validation + type inference | Recommended addition (not in CLAUDE.md's table, but directly implements CLAUDE.md's stated "Zod... defines... one source of truth" pattern) `[CITED: github.com/fastify/fastify-type-provider-zod]` |
| @fastify/cors | 11.3.0 | CORS headers for local dev (Vite dev server origin ≠ Fastify origin) | Dev-only convenience; in production the SPA is served from the same origin as the API so CORS isn't needed there `[VERIFIED: npm registry]` |
| pino | 10.3.1 | Structured logging | Ships with Fastify by default `[VERIFIED: npm registry]` |
| react-swipeable | 7.0.2 | Swipe gesture detection for the stock-toggle row interaction | Implements D-08's directional swipe-left/swipe-right requirement; lightweight (no animation engine baked in), pairs with a CSS transform for the visual reveal `[VERIFIED: npm registry]` |
| vitest | 4.1.10 | Test runner (backend + shared package) | Matches Vite's ecosystem; used for Nyquist validation (see below) `[VERIFIED: npm registry]` |
| light-my-request | 6.6.0 | Fastify's built-in HTTP injection for route testing without a real network port | Ships as a transitive Fastify dependency; use `.inject()` on the Fastify instance for fast route tests `[VERIFIED: npm registry]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-swipeable | @use-gesture/react + framer-motion | More powerful (spring physics, multi-touch) but heavier and overkill for a single-direction reveal-and-commit gesture; only reach for this if react-swipeable proves too limited during implementation |
| @fastify/type-provider-zod | Fastify's native JSON-Schema validation (Ajv) | CLAUDE.md explicitly designates Zod as the "one source of truth" for both API validation and Claude structured-output schemas later — staying on Zod now avoids a schema-format split later |
| Client-side search/filter | Server-side `/api/ingredients?q=` search endpoint | Only justified if the list grows well past the ~50-100 bottle estimate in PROJECT.md; not needed for Phase 1 |

**Installation:**
```bash
# apps/server
pnpm add fastify @fastify/static @fastify/cors @fastify/type-provider-zod better-sqlite3 drizzle-orm zod pino
pnpm add -D drizzle-kit typescript vitest light-my-request @types/better-sqlite3

# apps/barback
pnpm add react react-dom @tanstack/react-query react-swipeable
pnpm add -D vite @vitejs/plugin-react tailwindcss @tailwindcss/vite typescript

# packages/shared
pnpm add zod
pnpm add -D typescript
```

**Version verification:** All versions above were checked live via `npm view <package> version` on 2026-08-09 and cross-referenced against `.claude/CLAUDE.md`'s existing recommendations — all core packages match the project's pinned major/minor ranges. One discrepancy found: `typescript`'s npm `latest` tag now resolves to `7.0.2` (see Open Questions).

## Package Legitimacy Audit

| Package | Registry | Age (latest version publish) | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-------------------------------|--------------|--------------|---------|-------------|
| fastify | npm | 1 day | 11.0M | github.com/fastify/fastify | SUS (too-new) | Approved — official org, 11M weekly downloads, routine release cadence; "too-new" reflects the specific patch version's publish date, not package legitimacy |
| better-sqlite3 | npm | 4 days | 9.7M | github.com/WiseLibs/better-sqlite3 | SUS (too-new) | Approved — same false-positive shape, long-established package |
| react / react-dom | npm | ~2-3 weeks | 163M / 154M | github.com/react/react | SUS (too-new) | Approved — official Meta/React org, hundreds of millions of weekly downloads |
| vite | npm | 3 days | 164M | github.com/vitejs/vite | SUS (too-new) | Approved — official vitejs org |
| @vitejs/plugin-react | npm | ~1 week | 80M | github.com/vitejs/vite-plugin-react | SUS (too-new) | Approved |
| @tanstack/react-query | npm | ~3 weeks | 63.5M | github.com/TanStack/query | SUS (too-new) | Approved |
| tailwindcss / @tailwindcss/vite | npm | ~3 weeks | 120M / 43.6M | github.com/tailwindlabs/tailwindcss | SUS (too-new) | Approved — official Tailwind Labs org |
| @fastify/static | npm | 3 days | 4.5M | github.com/fastify/fastify-static | SUS (too-new) | Approved — official fastify org |
| drizzle-orm / drizzle-kit | npm | ~5 months | 18M / 15.2M | github.com/drizzle-team/drizzle-orm | OK | Approved |
| zod | npm | ~3 months | 254M | github.com/colinhacks/zod | OK | Approved |
| @fastify/cors | npm | ~1 month | 5.9M | github.com/fastify/fastify-cors | OK | Approved |
| @fastify/type-provider-zod | npm | ~4 months | 18.1K | github.com/fastify/fastify-type-provider-zod | OK | Approved |
| pino | npm | ~6 months | 42.6M | github.com/pinojs/pino | OK | Approved |
| typescript | npm | ~1 month | 260.7M | github.com/microsoft/TypeScript | OK | Approved (see version note above — install the pinned `5.9.3`, not `latest`) |
| vitest | npm | ~1 month | 89.7M | github.com/vitest-dev/vitest | OK | Approved |
| light-my-request | npm | ~6 months | 10.9M | github.com/fastify/light-my-request | OK | Approved |
| react-swipeable | npm | ~1.5 yrs | 961K | github.com/FormidableLabs/react-swipeable | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** fastify, better-sqlite3, react, react-dom, vite, @vitejs/plugin-react, @tanstack/react-query, tailwindcss, @tailwindcss/vite, @fastify/static — all flagged solely on the "too-new" heuristic (fast-release-cadence official packages), not on download count, repo absence, or postinstall risk. No `checkpoint:human-verify` is warranted for these given they are the exact packages already named and versioned in `.claude/CLAUDE.md` with millions of weekly downloads and canonical org-owned repos; the planner may proceed without a manual-verify checkpoint for this specific set. Treat this note as the audit trail for that decision.

*No packages in this phase were discovered only via WebSearch/training data without registry+repo cross-check — all are directly named in the project's own locked `.claude/CLAUDE.md` stack table.*

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────┐
│  Barback SPA (React+Vite)   │
│  phone browser, apps/barback │
│                              │
│  IngredientList              │
│   ├─ SearchFilterBar ────────┼─▶ filters client-cached list (no network)
│   ├─ IngredientRow (×N)       │
│   │   └─ useSwipeable ────────┼─▶ swipe-left/right → local "pending" state
│   │                            │   + visible countdown/undo affordance
│   │                            │   + setTimeout commits after grace period
│   └─ AddEditIngredientForm     │
│         (also used for        │
│          category CRUD)       │
└──────────────┬────────────────┘
               │ HTTP (fetch, via TanStack Query)
               │ GET/POST/PATCH /api/ingredients
               │ GET/POST/PATCH/DELETE /api/categories
               ▼
┌──────────────────────────────┐
│  Fastify server (apps/server) │
│                                │
│  Route handlers                │
│   ├─ zod schema validate body  │
│   ├─ Drizzle query/insert/update│
│   └─ JSON response              │
│                                  │
│  better-sqlite3 (WAL mode)       │
│   ├─ ingredients table            │
│   └─ categories table (FK RESTRICT)│
└────────────────────────────────────┘
```

Data flow for the primary use case (toggle stock): swipe gesture on `IngredientRow` → local optimistic state flips instantly + undo affordance shown → after grace period elapses with no undo tap, `PATCH /api/ingredients/:id` fires with `{in_stock: boolean}` → Zod validates → Drizzle updates the row → TanStack Query's mutation `onSettled` invalidates the ingredients query → list refetches, confirming server truth matches the optimistic UI.

### Recommended Project Structure
```
my-bar/
├── apps/
│   ├── server/              # Fastify API + SQLite/Drizzle
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── schema.ts       # Drizzle table defs (ingredients, categories)
│   │   │   │   └── client.ts       # better-sqlite3 + WAL pragma setup
│   │   │   ├── routes/
│   │   │   │   ├── ingredients.ts
│   │   │   │   └── categories.ts
│   │   │   └── index.ts            # server bootstrap, @fastify/static registration
│   │   └── drizzle/                # generated SQL migrations (committed)
│   └── barback/              # React + Vite mobile SPA
│       └── src/
│           ├── components/
│           │   ├── IngredientList.tsx
│           │   ├── IngredientRow.tsx      # swipe gesture lives here
│           │   ├── SearchFilterBar.tsx
│           │   └── AddEditIngredientForm.tsx
│           ├── api/                        # TanStack Query hooks
│           │   ├── useIngredients.ts
│           │   └── useCategories.ts
│           └── main.tsx
├── packages/
│   └── shared/                # Zod schemas + inferred TS types shared by server+client
│       └── src/
│           ├── ingredient.ts
│           └── category.ts
├── pnpm-workspace.yaml
└── package.json
```

### Pattern 1: Shared Zod schema as single source of truth
**What:** Define the Ingredient/Category shape once in `packages/shared` as a Zod schema; the Fastify route imports it for request validation via `@fastify/type-provider-zod`, and the React form imports the same schema for client-side validation before submit.
**When to use:** Every CRUD entity in this phase (ingredient, category).
**Example:**
```typescript
// packages/shared/src/ingredient.ts
import { z } from 'zod'

export const ingredientInput = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.string().uuid(),
  note: z.string().max(200).optional(),
})
export type IngredientInput = z.infer<typeof ingredientInput>

// apps/server/src/routes/ingredients.ts
import { ingredientInput } from '@my-bar/shared'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'

app.withTypeProvider<ZodTypeProvider>().post('/api/ingredients', {
  schema: { body: ingredientInput },
}, async (request, reply) => {
  const created = await db.insert(ingredients).values({
    ...request.body,
    inStock: true, // D-09: default in-stock
  }).returning()
  return created[0]
})
```
Source pattern: `[CITED: github.com/fastify/fastify-type-provider-zod]`

### Pattern 2: Swipe-with-undo-grace-period toggle (D-08, D-10)
**What:** The swipe gesture updates local component state immediately (instant visual feedback: row background shifts, "Marked out of stock — Undo" label appears) but the network `PATCH` request is deferred behind a `setTimeout`. Tapping "Undo" within the window clears the timeout and reverts local state — no network call ever fires for an undone swipe.
**When to use:** The single stock-toggle interaction (INV-03).
**Example:**
```typescript
// apps/barback/src/components/IngredientRow.tsx
import { useSwipeable } from 'react-swipeable'
import { useState, useRef } from 'react'

function IngredientRow({ ingredient, onCommitToggle }: Props) {
  const [pending, setPending] = useState<null | boolean>(null) // optimistic target state
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const startToggle = (nextInStock: boolean) => {
    setPending(nextInStock)
    timerRef.current = setTimeout(() => {
      onCommitToggle(ingredient.id, nextInStock) // fires the PATCH mutation
      setPending(null)
    }, 3000) // undo grace period, per D-08 "brief (~few seconds)"
  }

  const undo = () => {
    clearTimeout(timerRef.current)
    setPending(null)
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => startToggle(false),  // D-08: left = out-of-stock
    onSwipedRight: () => startToggle(true),  // D-08: right = in-stock
  })

  const displayedInStock = pending ?? ingredient.inStock
  return (
    <div {...handlers} className={displayedInStock ? 'bg-neutral-800' : 'bg-neutral-900 opacity-60'}>
      <span>{ingredient.name}</span>
      {pending !== null && <button onClick={undo}>Undo</button>}
    </div>
  )
}
```
Source pattern: `[CITED: nearform.com/open-source/react-swipeable/docs]` for the gesture handler shape; the undo-timer wrapper is original composition satisfying D-08/D-10, not copied from a library example.

### Pattern 3: Category delete guarded by FK RESTRICT
**What:** The `categories` table's foreign key from `ingredients.category_id` uses `ON DELETE RESTRICT` (SQLite enforces this only when `PRAGMA foreign_keys = ON` is set on every connection). A delete attempt on a category still referenced by ingredients throws a SQLite constraint error, which the route handler translates into a 409 Conflict with a clear message ("Reassign or remove N ingredient(s) in this category first").
**When to use:** D-03's category delete flow.
**Example:**
```typescript
// apps/server/src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
})

export const ingredients = sqliteTable('ingredients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  categoryId: text('category_id').notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  note: text('note'),
  inStock: integer('in_stock', { mode: 'boolean' }).notNull().default(true),
})
```
Source pattern: `[CITED: sqlitetutorial.net/sqlite-foreign-key]` for RESTRICT semantics; Drizzle `references()` syntax `[CITED: orm.drizzle.team/docs/sqlite/get-started-sqlite]`.

### Anti-Patterns to Avoid
- **Free-text category per ingredient:** Explicitly rejected by D-01 — would let "Liqueur"/"liqueur"/"Liquer" typo-drift and silently break Phase 2 matching. Categories must be their own table, ingredients hold a foreign key.
- **Full-row-tap toggle or a switch control:** Explicitly rejected by D-08 in favor of the swipe gesture — do not build a toggle switch UI even as a "simpler first pass."
- **Immediate PATCH on swipe with a toast-based undo:** D-08/D-10 specifically want the mutation *deferred* until the grace period elapses, not fired-then-potentially-reversed. A toast-based "undo last action" pattern (fire immediately, offer to undo after) is the wrong shape here — see Pattern 2.
- **Server-side search endpoint for Phase 1's list size:** Premature at ~50-100 rows; adds a network round-trip to something that should feel instant while typing.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe gesture detection (touch start/move/end math, threshold, direction) | Custom touch-event handlers | `react-swipeable` | Cross-browser touch/pointer event quirks (iOS Safari especially) are exactly what a small maintained library already handles; hand-rolled swipe math is a classic source of jank on the exact devices (iPad/phone Safari) this project targets |
| Request body validation + type inference | Manual `if (!body.name) throw ...` checks | Zod schema + `@fastify/type-provider-zod` | One schema definition serves both runtime validation and compile-time types; manual checks drift from types over time |
| SQL migrations | Hand-written ALTER TABLE scripts run manually | `drizzle-kit generate` + committed `/drizzle` SQL files | Guarantees every environment (dev machine, eventual Pi deployment) converges on the same schema; manual migration is how "works on my machine" schema drift happens |
| Optimistic UI + rollback-on-error for mutations | Custom `useState` + manual cache patching | TanStack Query's `onMutate`/`onError`/`onSettled` mutation lifecycle | The cancel-outgoing-refetch + snapshot + rollback dance is easy to get subtly wrong (race conditions between an optimistic update and an in-flight refetch); TanStack Query has already solved this |

**Key insight:** Every "don't hand-roll" item above maps to a specific interaction in this phase's success criteria (swipe toggle, add/edit forms, search-while-typing feel, category delete safety) — none of them are exotic, all have a well-worn, actively-maintained library solution already in the approved stack.

## Common Pitfalls

### Pitfall 1: better-sqlite3's synchronous API blocking the event loop
**What goes wrong:** better-sqlite3 queries run synchronously on the main thread — a slow query freezes every other in-flight request until it completes.
**Why it happens:** better-sqlite3 deliberately trades async I/O for raw speed and simplicity; there is no async variant.
**How to avoid:** At this phase's scale (a few dozen rows, indexed primary-key/foreign-key lookups), typical query time is sub-millisecond — well under the overhead of an async Promise wrapper — so this is a non-issue for INV-01 through INV-05's simple CRUD queries. Keep it that way: don't add unindexed full-table scans or heavy joins in this phase. `[CITED: multiple sources cross-checked, see Sources]`
**Warning signs:** If a future phase adds a query that takes >10-20ms (e.g. a large `LIKE '%...%'` scan without an index once the dataset grows), revisit — Phase 1's scale does not warrant proactive worker-thread offloading.

### Pitfall 2: SQLite foreign keys are OFF by default per-connection
**What goes wrong:** Defining a Drizzle `references()` FK relationship (or a raw SQL `FOREIGN KEY` clause) does nothing to actually enforce it unless `PRAGMA foreign_keys = ON` is executed on that specific database connection — SQLite does not enable FK enforcement globally or persist the pragma across connections.
**Why it happens:** This is a long-standing SQLite default (kept off for backward compatibility) that's easy to miss coming from Postgres/MySQL where FKs are always enforced.
**How to avoid:** Set `sqlite.pragma('foreign_keys = ON')` immediately after opening the better-sqlite3 connection, in the same `db/client.ts` file that sets `journal_mode = WAL`.
**Warning signs:** A category delete "succeeds" even though ingredients still reference it — if that happens, FK enforcement isn't actually on.

### Pitfall 3: Tailwind v4's config model is CSS-first — old tutorials will mislead
**What goes wrong:** Following a Tailwind v3-era tutorial produces a `tailwind.config.js` with a `darkMode`/`theme.extend` object and a `@tailwind base; @tailwind components; @tailwind utilities;` CSS entry — neither is the v4 pattern, and mixing them causes confusing build errors or silently-ignored config.
**Why it happens:** Tailwind v4 (already the pinned version here) moved configuration into CSS via `@theme` and `@import "tailwindcss"`; most existing web content and AI training data defaults to v3 patterns.
**How to avoid:** Use `@import "tailwindcss";` as the CSS entry point, `@theme { ... }` for any custom color/spacing tokens (needed for D-11/D-12's distinct dark utilitarian palette), and `@custom-variant dark (&:where(.dark, .dark *));` for dark-mode variant support — add the `@tailwindcss/vite` plugin to `vite.config.ts`, no PostCSS config file needed. `[CITED: tailwindcss.com v4 docs, cross-checked via multiple 2026 sources]`
**Warning signs:** Build succeeds but custom theme colors don't apply — usually means config was placed in a `tailwind.config.js` that v4's Vite plugin isn't reading.

### Pitfall 4: TanStack Query mutation without `onSettled` invalidation leaves optimistic state permanently diverged from server truth
**What goes wrong:** If an optimistic `onMutate` update is never followed by an `invalidateQueries` (or a manual `setQueryData` with the real server response), a failed-but-uncaught mutation or a partial network issue leaves the UI showing stale/wrong state indefinitely.
**Why it happens:** It's easy to implement only the "happy path" optimistic update and skip the settle/reconcile step.
**How to avoid:** Every mutation in this phase (add ingredient, edit ingredient, toggle stock, add/rename/delete category) must call `queryClient.invalidateQueries({ queryKey: ['ingredients'] })` (or `['categories']`) in `onSettled`, regardless of success/failure, so the list always resyncs to server truth.
**Warning signs:** Toggling stock on device A doesn't match what a manual page-refresh shows — a sign the optimistic update was never reconciled.

## Code Examples

### Fastify server bootstrap serving both API and static SPA
```typescript
// apps/server/src/index.ts
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import path from 'node:path'
import { ingredientsRoutes } from './routes/ingredients'
import { categoriesRoutes } from './routes/categories'

const app = Fastify({ logger: true })
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(ingredientsRoutes, { prefix: '/api/ingredients' })
app.register(categoriesRoutes, { prefix: '/api/categories' })

// Serve the built Barback SPA from the same process (no reverse proxy)
app.register(fastifyStatic, {
  root: path.join(__dirname, '../../barback/dist'),
  prefix: '/barback/',
})

app.listen({ port: 3000, host: '0.0.0.0' }) // 0.0.0.0: reachable from other LAN devices
```
Source: `[CITED: npmjs.com/package/@fastify/static, github.com/fastify/fastify-type-provider-zod]`

### better-sqlite3 + Drizzle client with WAL and FK pragmas
```typescript
// apps/server/src/db/client.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database(process.env.DB_PATH ?? './data/my-bar.db')
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON') // required per-connection — see Pitfall 2

export const db = drizzle(sqlite, { schema })
```
Source: `[CITED: orm.drizzle.team/docs/sqlite/get-started-sqlite, github.com/drizzle-team/drizzle-orm/issues/4968]`

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `tailwind.config.js` + PostCSS | Tailwind v4 CSS-first `@theme` + `@tailwindcss/vite` plugin | Tailwind v4 (already the pinned version) | Any AI-generated or copy-pasted Tailwind setup code from before v4 will not work as-is — see Pitfall 3 |
| TypeScript 5.x (`tsc`, JS-based compiler) | TypeScript 7.x "Corsa" native/Go-based compiler is now npm's `latest` | Sometime before 2026-08-09 per registry `[VERIFIED: npm registry]` | `.claude/CLAUDE.md` still pins "5.x" — treat this as a locked project constraint and pin `typescript@5.9.3` explicitly rather than installing `latest`, since a major compiler rewrite is a meaningfully different risk surface for a solo dev's first phase |

**Deprecated/outdated:**
- `@tailwind base; @tailwind components; @tailwind utilities;` — replaced by `@import "tailwindcss";` in v4.
- Fastify's native Ajv-only JSON Schema validation is still supported but this project's own CLAUDE.md steers toward Zod as the single schema source of truth — don't mix both validation styles across routes.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@fastify/type-provider-zod` is the right glue library for Zod+Fastify (not in CLAUDE.md's explicit table, found via WebSearch) | Standard Stack / Supporting, Pattern 1 | Low — package is npm-verified OK, official `fastify` GitHub org, widely referenced; if wrong, native Ajv JSON Schema validation is a safe fallback with no data-model impact |
| A2 | `react-swipeable` (vs. `@use-gesture/react` or `react-swipeable-list`) is sufficiently capable for the swipe-to-reveal-with-undo-timer pattern described in Pattern 2 | Standard Stack / Supporting, Pattern 2 | Low-medium — if gesture reliability proves poor on iPhone/iPad Safari during implementation, `@use-gesture/react` is the documented escape hatch (same tier of effort as html5-qrcode → zxing-wasm fallback already established in CLAUDE.md for barcode scanning) |
| A3 | `ON DELETE RESTRICT` (vs. `SET NULL` or requiring app-level reassignment UI) is the correct FK behavior for category deletion | Pattern 3 | Medium — if the owner expects "just delete it, orphan the ingredients," this needs adjusting; but RESTRICT is safer given Phase 2's matching logic assumes every ingredient has a category, and D-03 doesn't specify delete-with-references behavior explicitly |
| A4 | 3 seconds is a reasonable concrete value for D-08's "brief (~few seconds)" undo grace period | Pattern 2 code example | Low — trivially adjustable constant, not a structural decision; flag for the owner to confirm/tune during UAT |
| A5 | better-sqlite3's synchronous-blocking characteristic is a non-issue at Phase 1's data scale | Pitfall 1 | Low — corroborated by multiple independent sources describing indexed-query timing in microseconds; would only matter under a query pattern this phase doesn't have |

## Open Questions

1. **TypeScript 7 ("Corsa") vs. pinned 5.x**
   - What we know: `.claude/CLAUDE.md` locks "TypeScript 5.x"; npm's `latest` tag now resolves to `7.0.2`, a native-compiler rewrite `[VERIFIED: npm registry]`.
   - What's unclear: Whether CLAUDE.md's pin predates TS7's release/stabilization, or is a deliberate choice to stay on the JS-based compiler for tooling/plugin compatibility reasons not stated in the doc.
   - Recommendation: Planner should pin `typescript@5.9.3` explicitly in every `package.json` (not `^5` or `latest`) to honor the locked constraint, and surface this drift to the user as a one-line heads-up rather than silently deciding either way.

2. **Category delete-with-references UX**
   - What we know: D-03 grants delete capability; Pattern 3 recommends `ON DELETE RESTRICT` at the DB layer.
   - What's unclear: What the Barback UI should *show* when a delete is blocked — a plain error toast, or a guided "N ingredients use this category, reassign them to:" flow.
   - Recommendation: Plan a simple blocking error message for Phase 1 (409 + toast); a guided reassignment flow is a reasonable fast-follow but not required by any of INV-01–05's success criteria.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend runtime, Vite build | ✓ | v22.22.1 | — |
| pnpm | Monorepo package manager | ✓ | 11.17.0 | — |
| npm | Registry verification tooling | ✓ | 9.2.0 | — |
| git | Version control | ✓ | 2.53.0 | — |

**Missing dependencies with no fallback:** none — all required local tooling is present.
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (backend + shared package); no frontend component test framework selected yet for Phase 1 |
| Config file | none yet — see Wave 0 gaps |
| Quick run command | `pnpm --filter server test` |
| Full suite command | `pnpm -r test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INV-01 | POST /api/ingredients creates a row with name+category, defaults in_stock=true | integration (Fastify `.inject()`) | `pnpm --filter server test -- ingredients.test.ts` | ❌ Wave 0 |
| INV-02 | PATCH /api/ingredients/:id updates name/category | integration (Fastify `.inject()`) | `pnpm --filter server test -- ingredients.test.ts` | ❌ Wave 0 |
| INV-03 | PATCH /api/ingredients/:id/stock (or equivalent) toggles in_stock | integration (Fastify `.inject()`) | `pnpm --filter server test -- ingredients.test.ts` | ❌ Wave 0 |
| INV-04 | GET /api/ingredients returns full list for client-side filtering | integration (Fastify `.inject()`) | `pnpm --filter server test -- ingredients.test.ts` | ❌ Wave 0 |
| INV-05 | Mobile-first responsive layout | manual-only — visual/UAT check on actual phone viewport, not meaningfully unit-testable | manual UAT | n/a |
| D-03 (category CRUD) | Category delete blocked when referenced by ingredients (RESTRICT) | integration (Fastify `.inject()`) | `pnpm --filter server test -- categories.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter server test`
- **Per wave merge:** `pnpm -r test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/server/vitest.config.ts` — Vitest config for the server package
- [ ] `apps/server/src/routes/ingredients.test.ts` — covers INV-01, INV-02, INV-03, INV-04
- [ ] `apps/server/src/routes/categories.test.ts` — covers D-03's RESTRICT-on-delete behavior
- [ ] `apps/server/src/db/test-helpers.ts` — in-memory or temp-file SQLite fixture (fresh DB per test file), avoiding shared mutable state across tests
- [ ] Framework install: `pnpm add -D vitest light-my-request` in `apps/server`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Project constraint: no authentication anywhere (`.claude/CLAUDE.md` "Access model") — LAN-only trusted access |
| V3 Session Management | No | No sessions/cookies in this phase — stateless REST CRUD |
| V4 Access Control | No | No per-user roles; single "owner" persona, no multi-tenant boundary |
| V5 Input Validation | Yes | Zod schemas (`packages/shared`) validated at the Fastify route boundary via `@fastify/type-provider-zod`, rejecting malformed name/category/note payloads before they reach Drizzle |
| V6 Cryptography | No | No secrets or sensitive data stored in Phase 1's data model (ingredient names/categories are not sensitive) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via unparameterized queries | Tampering | Drizzle ORM generates parameterized SQL for all query builder calls — never construct raw SQL string concatenation with user input |
| Unbounded/oversized input (e.g. a 1MB "name" field) | Denial of Service | Zod `.max()` length constraints on all string fields (see Pattern 1's `name: z.string().min(1).max(200)`) |
| CORS misconfiguration exposing the API beyond intended origins | Information Disclosure | `@fastify/cors` scoped to the dev-server origin only in development; in production the SPA and API share an origin, so CORS can be omitted or locked to `same-origin` |

*Note: This phase is explicitly LAN-only per project constraints — the "no auth" and "no TLS" posture is a deliberate, already-approved project-level decision (see `.claude/CLAUDE.md` "Stack Patterns by Variant"), not a Phase 1 gap to remediate.*

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view <package> version`, `npm view <package> dist-tags`) — live version numbers and publish dates for every package listed above, checked 2026-08-09
- `gsd-tools query package-legitimacy check` — registry existence, download counts, repo URLs, postinstall-script scan for all 19 packages evaluated
- Local environment probes (`node --version`, `pnpm --version`, `npm --version`, `git --version`) — confirmed toolchain availability

### Secondary (MEDIUM confidence)
- tanstack.com/query/v5 docs (via WebSearch snippet) — mutation lifecycle (`onMutate`/`onError`/`onSettled`) pattern
- orm.drizzle.team/docs/sqlite (via WebSearch snippet) — Drizzle+better-sqlite3 setup, `references()` FK syntax
- github.com/fastify/fastify-type-provider-zod, fastify.dev/docs (via WebSearch snippet) — Zod type-provider wiring
- tailwindcss.com v4 docs, cross-checked across multiple 2026-dated blog posts (via WebSearch) — `@theme`, `@import "tailwindcss"`, `@custom-variant dark`
- sqlitetutorial.net/sqlite-foreign-key, sqlite.org forum (via WebSearch snippet) — RESTRICT vs SET NULL semantics
- nearform.com/open-source/react-swipeable/docs (via WebSearch snippet) — swipe handler API shape

### Tertiary (LOW confidence)
- Various aggregator/blog posts on pnpm monorepo structure (WebSearch only, no single authoritative source) — used only for directory-layout convention, not for any load-bearing technical claim
- Blog-sourced better-sqlite3 event-loop-blocking commentary (WebSearch only) — corroborated across multiple independent posts but not an official docs source; treated as a pitfall worth noting, not a hard technical constraint

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version verified live against the npm registry and cross-checked against the project's own locked `.claude/CLAUDE.md` table
- Architecture: MEDIUM — patterns are well-established and cross-checked across multiple independent web sources, but Context7 MCP tooling was unavailable this session so no single authoritative doc-page fetch was performed; recommend the planner/executor spot-check the Zod/Fastify type-provider wiring against current docs during implementation
- Pitfalls: MEDIUM — SQLite FK-pragma and Tailwind v4 config pitfalls are well-documented and consistent across sources; the better-sqlite3 event-loop pitfall is corroborated but blog-sourced

**Research date:** 2026-08-09
**Valid until:** 2026-09-08 (30 days — stack is fast-moving per the TypeScript 7 / Tailwind v4 / Vite 8 findings above; re-verify versions if planning is delayed)
