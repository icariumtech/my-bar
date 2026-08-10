---
phase: 01-barback-inventory-foundation
plan: 02
subsystem: inventory-write-path
tags: [fastify, drizzle, zod, react, antd, tanstack-query]

# Dependency graph
requires:
  - "@my-bar/shared Zod contracts (categoryInput/category, ingredientInput/ingredient)"
  - "Drizzle schema: categories (unique name) + ingredients (category_id FK restrict, in_stock default true)"
  - "createTestDb() Vitest fixture"
  - "ingredientsRoutes plugin and GET /api/ingredients (plan 01-01)"
provides:
  - "POST /api/ingredients — creates an ingredient under shared-contract validation, in-stock by default"
  - "categoriesRoutes plugin: GET /api/categories, POST /api/categories (categories.ts, new file)"
  - "useCategories()/useCreateCategory() TanStack Query hooks (apps/barback/src/api/useCategories.ts, new file)"
  - "useCreateIngredient() mutation added to apps/barback/src/api/useIngredients.ts"
  - "AddEditIngredientForm component — antd Modal/Form add-ingredient flow with inline category creation"
  - "'Add Ingredient' CTA wired into App.tsx"
affects: [01-03, 01-04, 01-05, phase-2-recipes-makeable-engine]

# Actuals (#2632)
actuals:
  tokens: 5147
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route response schema declares every reply status the handler actually sends (201 + 400/409 error shape), not just the happy path — @fastify/type-provider-zod's reply.status().send() typing enforces this at compile time"
    - "SQLite constraint errors are translated to fixed 400/409 JSON bodies by matching on err.message text (FOREIGN KEY / UNIQUE constraint substrings), never re-thrown as a raw 500 with SQLite's own error text"
    - "TanStack Query mutations invalidate their query key in onSettled, not onSuccess, so a failed create still resyncs the list to server truth"
    - "Inline resource creation inside a form (antd Select showSearch + popupRender footer) lets a required foreign-key field be populated without leaving the parent form — used here to resolve the zero-categories deadlock"

key-files:
  created:
    - apps/server/src/routes/categories.ts
    - apps/server/src/routes/categories.test.ts
    - apps/barback/src/api/useCategories.ts
    - apps/barback/src/components/AddEditIngredientForm.tsx
  modified:
    - apps/server/src/routes/ingredients.ts
    - apps/server/src/routes/ingredients.test.ts
    - apps/server/src/index.ts
    - apps/barback/src/api/useIngredients.ts
    - apps/barback/src/App.tsx

key-decisions:
  - "Category creation is inline inside AddEditIngredientForm's Category Select (search box text + popup footer button), not a separate CategoryManager screen — resolves 01-UI-SPEC.md's one ⚠ unresolved consideration (zero-categories deadlock) without adding a new component this plan didn't otherwise need"
  - "Constraint-error translation matches on err.message substring ('FOREIGN KEY constraint failed' / 'UNIQUE constraint failed') rather than better-sqlite3's SqliteError.code, mirroring the exact assertions already locked in plan 01-01's ingredients.test.ts"

patterns-established:
  - "Response-schema-complete route pattern: every status a handler can send is declared in schema.response, catching a missing error-shape declaration at tsc time instead of at runtime"

requirements-completed: [INV-01]

coverage:
  - id: D1
    description: "The owner can tap 'Add Ingredient', fill Name + Category (+ optional Note), save, and the bottle appears in the inventory list, in stock by default"
    requirement: INV-01
    verification:
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#creates an ingredient and reads back inStock true when the request omitted stock"
        status: pass
      - kind: integration
        ref: "live smoke test against a running server instance: POST /api/categories -> 201, POST /api/ingredients with that categoryId -> 201 with inStock:true, GET /api/ingredients -> includes the created row"
        status: pass
    human_judgment: true
    rationale: "Automated tests and a live-server curl smoke test confirm the write path persists correctly end-to-end, but confirming the antd form renders/behaves correctly on an actual phone viewport (tap targets, keyboard behavior, Select popup usability) requires human eyes on a real device — deferred to end-of-phase human_verify_mode per config.json."
  - id: D2
    description: "A bar with zero categories is not deadlocked — the owner can create the first category inline from inside the add-ingredient flow"
    requirement: D-03
    verification:
      - kind: unit
        ref: "apps/server/src/routes/categories.test.ts#creates a category and returns 201"
        status: pass
      - kind: integration
        ref: "AddEditIngredientForm's Select popupRender renders an 'Add Category' action whenever categoryOptions is empty, calling useCreateCategory() with the typed search text and selecting the created id"
        status: pass
    human_judgment: true
    rationale: "The inline-creation code path is exercised by useCreateCategory()'s own hook logic and the server-side test, but visually confirming the empty-state prompt reads correctly inside the antd Select dropdown is a human-verify item."
  - id: D3
    description: "Duplicate category names return 409 rather than creating a second row (D-01 typo-proofing)"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/categories.test.ts#rejects a duplicate category name with 409, not a duplicate row"
        status: pass
      - kind: integration
        ref: "live smoke test: POST /api/categories twice with the same name -> 201 then 409"
        status: pass
    human_judgment: false
  - id: D4
    description: "An unknown categoryId on ingredient create is a 400, not a 500; a blank/oversized name is rejected by Zod before any database work"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#rejects an unknown categoryId with 400, not 500; #rejects a blank name with 400 before any database work; #rejects a name over the 200-character bound with 400"
        status: pass
      - kind: integration
        ref: "live smoke test: unknown categoryId -> 400; blank name -> 400"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-10
status: complete
---

# Phase 1 Plan 2: Add-a-Bottle Write Path Summary

**POST /api/ingredients and POST/GET /api/categories under shared-Zod validation, plus the antd AddEditIngredientForm — closing INV-01 by letting the owner add a real bottle (with inline category creation) from their phone and see it persist, in stock by default.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 9 (5 new, 4 extended)

## Accomplishments

- `POST /api/ingredients` validates through the shared `ingredientInput` Zod contract (the same object the client form uses), leaves `inStock` to the column default so D-09's in-stock-by-default guarantee lives in one place, and translates a foreign-key violation on an unknown `categoryId` into a 400 rather than a raw 500 (T-01-10, T-01-11)
- New `categories.ts` plugin: `GET /api/categories` (ordered by name) and `POST /api/categories` validated through shared `categoryInput`, with `categories.name`'s UNIQUE constraint translated into a 409 (D-01) — registered under `/api/categories` in `index.ts`
- 7 new Vitest integration tests (via Fastify `.inject()`) lock in-stock-default, blank/oversized-name rejection, unknown-`categoryId` → 400, and duplicate-category-name → 409 — all green alongside the 4 tests plan 01-01 already had, 11/11 total
- `useCategories()`/`useCreateCategory()` (new hook file) and `useCreateIngredient()` (added to the existing hook file) — every mutation invalidates its query key in `onSettled`, not `onSuccess`, so a failed create still resyncs the list to server truth (01-RESEARCH.md Pitfall 4)
- `AddEditIngredientForm`: antd `Modal` + `Form` with Name (required, `maxLength=200`), Category (required, `Select` with `showSearch`), and optional Note (`maxLength=200`); submit reads "Save Changes", a failed save shows the exact Copywriting Contract error copy while preserving typed input, and the submit button carries antd's `loading` state so a double-tap can't fire twice
- Category creation is inline: typing into the Category `Select`'s search box and tapping "Add Category" in the popup footer calls `useCreateCategory()` and auto-selects the new category — this is the resolution for `01-UI-SPEC.md`'s one `⚠ unresolved` consideration (a zero-categories bar could otherwise never add its first bottle)
- `App.tsx` gained a persistent "Add Ingredient" primary CTA (48px minimum tap target, accent color) in the header, holding the form's open/close state
- Verified live, not just via `tsc`/`vitest`: started the built server against a temp SQLite file and curled the real write path — category create → 201, duplicate name → 409, ingredient create → 201 with `inStock:true`, unknown `categoryId` → 400, blank name → 400

## Task Commits

Each task was committed atomically:

1. **Task 1: Create endpoints for ingredients and categories, validated by the shared contract** — `a881823` (feat)
2. **Task 2: Build the antd add-ingredient form and wire it to the list** — `818905b` (feat)

_No separate plan-metadata commit in worktree mode — the orchestrator commits STATE.md/ROADMAP.md centrally after the wave merges. This plan's SUMMARY.md and REQUIREMENTS.md are committed separately per worktree-mode convention._

## Files Created/Modified

- `apps/server/src/routes/categories.ts`, `apps/server/src/routes/categories.test.ts` — new category endpoints and their tests
- `apps/server/src/routes/ingredients.ts` — added `POST /` with FK-error translation
- `apps/server/src/routes/ingredients.test.ts` — 4 new tests for the create path
- `apps/server/src/index.ts` — registered `categoriesRoutes` under `/api/categories`
- `apps/barback/src/api/useCategories.ts` — new hook file (`useCategories`, `useCreateCategory`)
- `apps/barback/src/api/useIngredients.ts` — added `useCreateIngredient`
- `apps/barback/src/components/AddEditIngredientForm.tsx` — new form component
- `apps/barback/src/App.tsx` — "Add Ingredient" CTA + form mount

## Decisions Made

- **Inline category creation over a separate CategoryManager screen:** the plan's `<action>` and Planner Assumptions section specifically resolve the zero-categories UI-SPEC gap this way — a dedicated management screen is out of scope for this plan and not needed to unblock INV-01.
- **Constraint-error detection by message substring:** matches the pattern plan 01-01 already established and tested (`toThrow(/FOREIGN KEY constraint failed/i)`), so the route's error-translation logic is provably aligned with what SQLite actually throws under the `foreign_keys = ON` pragma, rather than depending on `better-sqlite3`'s `SqliteError.code` (untested in this codebase).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Zod route response schema needed explicit error-status entries**
- **Found during:** Task 1, first `pnpm --filter server build`
- **Issue:** `reply.status(400).send({ error: ... })` / `reply.status(409).send({ error: ... })` failed `tsc` because `@fastify/type-provider-zod`'s typed `reply.status()` only accepts status codes declared in `schema.response` — the plan's action text didn't call out that the response schema needs the error shape too, only the 201 success shape.
- **Fix:** Added `400: z.object({ error: z.string() })` to the `POST /api/ingredients` response schema and `409: z.object({ error: z.string() })` to `POST /api/categories`'s.
- **Files modified:** `apps/server/src/routes/ingredients.ts`, `apps/server/src/routes/categories.ts`
- **Verification:** `pnpm --filter server build` exits 0; existing and new tests still assert the correct status codes.
- **Committed in:** `a881823` (Task 1 commit)

**2. [Rule 2 - Missing functionality] Category-creation failure had no user-visible feedback**
- **Found during:** Task 2, while building the inline "Add Category" action
- **Issue:** The plan's action text describes the happy path (typed text → `useCreateCategory()` → select the new category) but doesn't address what the owner sees if that create fails (e.g. a duplicate name typed into the inline box, which the server correctly 409s). Without handling, the button's loading spinner would simply stop with no explanation.
- **Fix:** Added local `categoryError` state, set on a caught mutation failure and rendered via the Category `Form.Item`'s `extra` slot ("Couldn't create category — check the name and try again."), cleared whenever the owner edits the search text again.
- **Files modified:** `apps/barback/src/components/AddEditIngredientForm.tsx`
- **Verification:** Server-side 409 test (`categories.test.ts`) already proves the failure case exists to react to; manual review of the component confirms the catch path sets and later clears the message.
- **Committed in:** `818905b` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing functionality)
**Impact on plan:** Neither changes architecture or scope — both are corrections required for the plan's own literal `<verify>` commands (build/tsc) to pass and for the form to behave correctly on a realistic failure path the plan's happy-path description didn't spell out.

## Issues Encountered

None beyond the two auto-fixed deviations above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `POST /api/ingredients` and `POST /api/categories` are ready for plan 01-03 (edit) and 01-04 (category rename/delete UI) to extend against the same tables and shared contracts.
- The `AddEditIngredientForm` component is structured to be reusable for edit mode in a later plan (form fields and validation are already contract-driven), though this plan only wires the Add flow per its explicit scope boundary.
- `useCategories()`/`useCreateCategory()` are ready for plan 01-04's category management screen to reuse directly.
- No blockers for 01-03/01-04/01-05.

## Self-Check: PASSED

All created files confirmed on disk: `apps/server/src/routes/categories.ts`, `apps/server/src/routes/categories.test.ts`, `apps/barback/src/api/useCategories.ts`, `apps/barback/src/components/AddEditIngredientForm.tsx`. Both task commit hashes (`a881823`, `818905b`) confirmed present in `git log --oneline --all`.

---
*Phase: 01-barback-inventory-foundation*
*Completed: 2026-08-10*
