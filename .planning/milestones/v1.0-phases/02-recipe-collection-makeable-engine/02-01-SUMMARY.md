---
phase: 02-recipe-collection-makeable-engine
plan: 01
subsystem: api
tags: [fastify, drizzle, zod, sqlite, vitest, tdd]

# Dependency graph
requires:
  - phase: 01-barback-inventory-foundation
    provides: categories/ingredients schema, Fastify plugin + injectable-db pattern, Zod Input/Full/Patch schema pattern, FK error-translation pattern
provides:
  - glassware, recipes, recipeIngredients Drizzle tables with FK onDelete rules pushed to the dev DB
  - packages/shared/src/recipe.ts contracts (recipeInput, recipeIngredient, recipe, recipePatch)
  - computeMakeable(requiredCategoryIds, db?) — presence-based, category-grouped makeable engine
  - GET/POST /api/recipes returning real, server-computed makeable status and missing-category info
affects: [02-02, recipe CRUD edit/delete, glassware management, Barback recipe UI]

# Actuals (#2632)
actuals:
  tokens: 7649
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "computeMakeable(requiredCategoryIds, db = defaultDb) — injectable-db service function, never imports the production client unconditionally"
    - "loadRecipe(db, recipeId) route-local helper joins recipe + glassware + recipeIngredients/categories and threads the route's own db into computeMakeable so response and makeable computation always agree"
    - "unit stored as plain TEXT column (no DB CHECK) — the enum constraint lives exclusively at the Zod boundary (recipeIngredientInput.unit)"

key-files:
  created:
    - packages/shared/src/recipe.ts
    - apps/server/src/services/makeableEngine.ts
    - apps/server/src/services/makeableEngine.test.ts
    - apps/server/src/routes/recipes.ts
    - apps/server/src/routes/recipes.test.ts
  modified:
    - apps/server/src/db/schema.ts
    - apps/server/src/db/test-helpers.ts
    - packages/shared/src/index.ts
    - apps/server/src/index.ts

key-decisions:
  - "computeMakeable takes db as an explicit second parameter defaulting to the real client, correcting 02-RESEARCH.md's sketch (which imported db unconditionally) so recipes.test.ts's injected testDb.db is never bypassed"
  - "missingCategoryNames added to the recipe response beyond the RESEARCH.md sketch so MATCH-02 is satisfiable without the frontend cross-referencing two separate id/name lists"

patterns-established:
  - "Recipe route builds its full response via a single loadRecipe(db, id) helper reused by both GET (mapped over all ids) and POST (called once after insert) — response shape and makeable computation can never drift between the two endpoints"

requirements-completed: [RECIPE-01, MATCH-01, MATCH-02, MATCH-03, MATCH-04]

coverage:
  - id: D1
    description: "POST /api/recipes creates a recipe with name, category-based ingredient lines (quantity+unit), ordered method steps, optional glassware, optional garnish"
    requirement: "RECIPE-01"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#creates a recipe with ingredients, method, glassware, and garnish; reports makeable true"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#creates a recipe without glassware or garnish — both null in the response"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/recipes returns every recipe with a server-computed makeable boolean, never client-computed"
    requirement: "MATCH-01"
    verification:
      - kind: unit
        ref: "apps/server/src/services/makeableEngine.test.ts#is makeable when the required category has an in-stock ingredient"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#reflects not-makeable with missing category ids/names once a required category has zero in-stock ingredients"
        status: pass
    human_judgment: false
  - id: D3
    description: "Not-makeable recipes expose missingCategoryIds and missingCategoryNames for every category with zero in-stock ingredients"
    requirement: "MATCH-02"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#reflects not-makeable with missing category ids/names once a required category has zero in-stock ingredients"
        status: pass
    human_judgment: false
  - id: D4
    description: "Matching is category-based — any in-stock bottle in the required category satisfies it, never a specific brand"
    requirement: "MATCH-03"
    verification:
      - kind: unit
        ref: "apps/server/src/services/makeableEngine.test.ts#MATCH-03: matches ANY in-stock ingredient in the category, never a specific one"
        status: pass
    human_judgment: false
  - id: D5
    description: "Quantity/unit are stored and returned exactly as submitted and never influence the makeable computation (presence-based, volume-agnostic)"
    requirement: "MATCH-04"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#preserves method step order and ingredient displayOrder exactly on immediate GET readback"
        status: pass
    human_judgment: false
  - id: D6
    description: "Validation edge cases: empty ingredients/method rejected 400; unknown categoryId/glasswareId rejected 400 not 500; duplicate recipe names allowed"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#rejects an empty ingredients array with 400"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#rejects an unknown glasswareId with 400, not 500"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#allows two recipes with identical name and ingredients to both be created (no uniqueness constraint)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Dev database physically has the glassware/recipes/recipe_ingredients tables"
    verification:
      - kind: other
        ref: "pnpm -F @my-bar/server db:push; sqlite_master query confirms glassware, recipes, recipe_ingredients"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-11
status: complete
---

# Phase 2 Plan 1: Recipe Schema, Makeable Engine & GET/POST /api/recipes Summary

**Server-side category-based makeable computation (RED/GREEN TDD) with real GET/POST /api/recipes backed by a pushed dev-DB schema**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-10T21:46:01-05:00
- **Completed:** 2026-08-11T02:48:26Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- `glassware`, `recipes`, `recipeIngredients` Drizzle tables added with the specified FK `onDelete` rules and pushed to the dev database (verified via `sqlite_master`)
- `packages/shared/src/recipe.ts` contracts (`recipeInput`, `recipeIngredient`, `recipe`, `recipePatch`) exported through `packages/shared/src/index.ts`
- `computeMakeable(requiredCategoryIds, db?)` — presence-based, category-grouped, injectable-db makeable engine — proving MATCH-01/02/03/04 with 8 unit tests
- `GET`/`POST /api/recipes` live and registered in `index.ts`, computing makeable status server-side and returning `missingCategoryIds`/`missingCategoryNames`
- Full RED → GREEN TDD cycle: 17 new tests written failing first (module-not-found), then made to pass by implementing `makeableEngine.ts` and `recipes.ts`

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing tests for recipe schema, contracts, and makeable engine** - `11bed78` (test)
2. **Task 1 GREEN: computeMakeable and GET/POST /api/recipes implementation** - `76a185a` (feat)
3. **Task 2: Push new schema to dev database** - no commit (DB-only side effect; `apps/server/data/my-bar.db` is gitignored)

_TDD task: RED (`test(02-01)`) precedes GREEN (`feat(02-01)`) in git log, confirmed via `git log --oneline --grep`._

## Files Created/Modified
- `apps/server/src/db/schema.ts` - added `glassware`, `recipes`, `recipeIngredients` Drizzle tables
- `apps/server/src/db/test-helpers.ts` - mirrored the three new tables in raw `CREATE TABLE` SQL for `foreign_keys = ON` enforcement in tests
- `packages/shared/src/recipe.ts` - `recipeIngredientInput`, `recipeInput`, `recipeIngredient`, `recipe`, `recipePatch` Zod schemas + inferred types
- `packages/shared/src/index.ts` - re-export `recipe.ts`
- `apps/server/src/services/makeableEngine.ts` - `computeMakeable(requiredCategoryIds, db?)`
- `apps/server/src/services/makeableEngine.test.ts` - 7 unit tests covering makeable/not-makeable, MATCH-03 any-in-stock matching, empty set, duplicate-id collapsing, db-injection isolation
- `apps/server/src/routes/recipes.ts` - `recipesRoutes` plugin: `loadRecipe()` helper, `GET /`, `POST /`
- `apps/server/src/routes/recipes.test.ts` - 10 tests covering creation, makeable/not-makeable readback, validation, FK-error translation, ordering, and no-uniqueness-on-name
- `apps/server/src/index.ts` - registered `recipesRoutes` at `/api/recipes`

## Decisions Made
- Corrected 02-RESEARCH.md's `computeMakeable` sketch (which imported the production `db` unconditionally) to accept `db` as an explicit second parameter defaulting to the real client — required so `recipes.test.ts`'s injected `testDb.db` is actually used instead of silently querying the real database
- Added `missingCategoryNames` to the `recipe` response schema (beyond the RESEARCH.md sketch's `missingCategoryIds`-only shape) so MATCH-02's "exactly which ingredients are missing" is satisfiable without the frontend cross-referencing two separate lists
- `unit` is stored as a plain `TEXT` column with no DB `CHECK` constraint — the D-19 enum lives exclusively at the Zod boundary (`recipeIngredientInput.unit`), matching the plan's explicit instruction; the read-path type mismatch this creates (DB returns `string`, contract expects the literal union) is resolved with a single documented cast in `loadRecipe`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript build failure from `unit` column type mismatch**
- **Found during:** Task 1 GREEN (verifying `pnpm -F @my-bar/server build`, beyond the plan's specified vitest-only verify command)
- **Issue:** `apps/server/src/routes/recipes.ts` returned `ingredientRows` (where Drizzle infers `unit: string` from the plain-text column) directly as `RecipeIngredient[]` (where `unit` is the literal union `'oz' | 'dash' | ...`). `tsc -p tsconfig.json` failed with a type-assignability error; `vitest` alone did not catch it since it transforms rather than type-checks.
- **Fix:** Imported `RecipeIngredient` from `@my-bar/shared` and cast `ingredients: ingredientRows as RecipeIngredient[]` in `loadRecipe`, with a comment noting the enum constraint is enforced at the Zod write boundary, not the DB read path.
- **Files modified:** `apps/server/src/routes/recipes.ts`
- **Verification:** `pnpm -F @my-bar/server build` passes; `pnpm -F @my-bar/server test` still 47/47 passing.
- **Committed in:** `76a185a` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for a clean type-checked build; no scope creep — the plan's own explicit design (`unit` as plain TEXT, no DB CHECK) is what created the mismatch, and the fix is a single narrowing cast at the one place the two representations meet.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- The makeable engine and recipe contracts are proven end-to-end and ready for plan 02-02 (edit/delete, glassware management) to build on
- `recipePatch` is already defined in `packages/shared/src/recipe.ts`, unused until 02-02's PATCH endpoint
- The dev database has the new tables live; no further schema push needed until the next schema change

---
*Phase: 02-recipe-collection-makeable-engine*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 9 created/modified source files, the SUMMARY.md itself, and the dev database file (`apps/server/data/my-bar.db`) were confirmed present on disk. Both commit hashes (`11bed78` test, `76a185a` feat) confirmed present in `git log`.
