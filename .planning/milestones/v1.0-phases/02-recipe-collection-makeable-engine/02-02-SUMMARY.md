---
phase: 02-recipe-collection-makeable-engine
plan: 02
subsystem: api
tags: [fastify, drizzle, zod, sqlite, vitest, tdd]

# Dependency graph
requires:
  - phase: 02-recipe-collection-makeable-engine
    plan: 01
    provides: recipe/glassware/recipeIngredients schema, computeMakeable, GET/POST /api/recipes, recipePatch contract
provides:
  - PATCH/DELETE /api/recipes/:id (RECIPE-02)
  - DELETE /api/categories/:id now recipe-aware (D-21 extended)
affects: [02-03, Barback recipe UI edit/delete flows, GlasswareManager delete-guard (mirrors this pattern)]

# Actuals (#2632)
actuals:
  tokens: 5557
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "PATCH ingredients-replace wrapped in a single db.transaction() call — delete-then-reinsert is atomic, a failed insert mid-loop rolls back the delete too"
    - "PATCH checks row existence via a direct SELECT before calling loadRecipe (which throws on a miss), turning an unknown id into 404 rather than an uncaught exception"
    - "Category delete-guard refusal message built from a conditional parts array (inUseMessage(ingredientCount, recipeIngredientCount)) so a zero count contributes no clause — keeps the Phase 1 ingredient-only message byte-for-byte unchanged"

key-files:
  created: []
  modified:
    - apps/server/src/routes/recipes.ts
    - apps/server/src/routes/recipes.test.ts
    - apps/server/src/routes/categories.ts
    - apps/server/src/routes/categories.test.ts

key-decisions:
  - "PATCH existence check uses a direct db.select() on recipes rather than relying on loadRecipe's return value, since loadRecipe throws (not returns undefined) on a miss by design from 02-01 — preserves that helper's existing contract for GET/POST while still getting a clean 404 path for PATCH"

requirements-completed: [RECIPE-02]

coverage:
  - id: D1
    description: "PATCH /api/recipes/:id updates only the fields supplied, leaving the rest untouched"
    requirement: "RECIPE-02"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#updates only the name field, leaving ingredients/method/glassware/garnish untouched"
        status: pass
    human_judgment: false
  - id: D2
    description: "PATCH with a replaced ingredients array atomically swaps the set; makeable/missing fields reflect the NEW set"
    requirement: "RECIPE-02"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#replaces the ingredients array atomically — prior rows gone, new set present with fresh displayOrder, makeable reflects the NEW set"
        status: pass
    human_judgment: false
  - id: D3
    description: "PATCH with an empty body ({}) is rejected 400 before any write; unknown id 404; unknown categoryId in ingredients 400 not 500"
    requirement: "RECIPE-02"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#rejects an empty patch body with 400"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#returns 404 for an unknown recipe id"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#rejects an ingredients array containing an unknown categoryId with 400, not 500"
        status: pass
    human_judgment: false
  - id: D4
    description: "DELETE /api/recipes/:id cascades recipe_ingredients, verified by direct table query, not assumed; unknown id 404; repeated delete 204-then-404"
    requirement: "RECIPE-02"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#deletes an existing recipe and returns 204; cascade to recipe_ingredients verified by direct query"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/recipes.test.ts#returns 204 then 404 on a repeated delete — never a repeated 204"
        status: pass
    human_judgment: false
  - id: D5
    description: "Category deletion refused if referenced by recipe ingredient lines alone, with an accurate recipe(s) count; combined ingredient+recipe conflict produces one message with both counts"
    requirement: "D-21 (Phase 2 CONTEXT.md)"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/categories.test.ts#refuses to delete a category referenced by 2 recipe ingredient lines and 0 ingredients, with an accurate recipeIngredientCount (D-21)"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/categories.test.ts#combines ingredient and recipe counts into one refusal message when both reference the category (D-21)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Existing ingredient-only category delete-guard message (Phase 1) is unchanged"
    requirement: "Regression guard"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/categories.test.ts#refuses to delete a category with two ingredients, with an accurate ingredientCount, leaving both intact"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-11
status: complete
---

# Phase 2 Plan 2: Recipe Edit/Delete & Recipe-Aware Category Guard Summary

**PATCH/DELETE /api/recipes/:id with an atomic ingredients-replace transaction, plus D-21's category delete-guard extended to count recipe references alongside ingredients**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-08-11
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `PATCH /api/recipes/:id` live: partial updates to name/method/glasswareId/garnish via conditional field-set, full ingredients-array replace wrapped in a single `db.transaction()` call so a failed insert never leaves a partially-replaced ingredient set, empty body rejected 400 by the shared `recipePatch` refine, unknown categoryId/glasswareId translated from a raw FK error to 400
- `DELETE /api/recipes/:id` live: existence-checked before delete so unknown/repeated ids 404 rather than a false-success 204; cascade to `recipe_ingredients` is the DB's job (`onDelete: 'cascade'`), verified in tests by a direct table query, not assumed
- `DELETE /api/categories/:id` now counts both `ingredients` and `recipeIngredients` before refusing (D-21) — `inUseMessage(ingredientCount, recipeIngredientCount)` builds a conditional-parts refusal string so a recipe-only conflict, an ingredient-only conflict, and a combined conflict each get the exact right phrasing, and the Phase 1 ingredient-only test passes unmodified
- Two full RED → GREEN TDD cycles (one per task): 9 new tests written failing first, then made to pass

## Task Commits

Each task followed the RED/GREEN TDD cycle:

1. **Task 1 RED: failing tests for PATCH/DELETE /api/recipes/:id** - `3f9d8d4` (test)
2. **Task 1 GREEN: PATCH/DELETE /api/recipes/:id implementation** - `bea5939` (feat)
3. **Task 2 RED: failing tests for D-21 recipe-aware category delete-guard** - `80ab861` (test)
4. **Task 2 GREEN: extend category delete-guard to count recipe references** - `a2f739a` (feat)

_Both tasks: RED (`test(02-02)`) precedes GREEN (`feat(02-02)`) in git log, confirmed via `git log --oneline --grep`._

## Files Created/Modified
- `apps/server/src/routes/recipes.ts` - added `PATCH '/:id'` (atomic ingredients-replace transaction, conditional field updates, FK-error translation) and `DELETE '/:id'` (existence check, cascade delete)
- `apps/server/src/routes/recipes.test.ts` - 9 new tests: PATCH name-only, ingredients-replace with makeable-reflects-new-set, method-replace, empty-body 400, unknown-id 404, unknown-categoryId 400; DELETE cascade-verified, unknown-id 404, repeated-delete 204-then-404
- `apps/server/src/routes/categories.ts` - `inUseMessage` signature changed to `(ingredientCount, recipeIngredientCount)` building a conditional `parts` array; `DELETE '/:id'` now pre-counts `recipeIngredients` alongside `ingredients`, gates on the combined total, and the race-condition FK-catch fallback re-counts both; 409 response schema/body gain `recipeIngredientCount`
- `apps/server/src/routes/categories.test.ts` - 2 new tests: recipe-only conflict (409 with `recipeIngredientCount: 2`, message says "2 recipe(s)"), combined ingredient+recipe conflict (409 with both counts, message says "1 ingredient(s) and/or 1 recipe(s)"); `seedRecipeIngredient` helper added

## Decisions Made
- The plan's action text said "if [loadRecipe] returns `undefined`... return 404," but `loadRecipe` (from 02-01) throws on a miss rather than returning `undefined` — its existing contract for GET/POST (which only ever call it with a known-good id) was left unchanged. PATCH instead runs its own `db.select({ id: recipes.id })...` existence check immediately before calling `loadRecipe`, achieving the same 404-on-unknown-id behavior without altering `loadRecipe`'s throw-on-miss contract for its other two callers.

## Deviations from Plan

None - plan executed exactly as written (the loadRecipe decision above is an implementation detail resolving an inaccuracy in the plan's prose, not a behavior change from what was specified).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- RECIPE-02 (edit/delete) and D-21 (category delete-guard extended to recipes) are both complete and covered by regression-safe tests
- `GlasswareManager`/glassware delete-guard (D-22, likely 02-03) can mirror the exact `inUseMessage`-conditional-parts pattern established here for categories
- Full server test suite (58 tests) and `tsc` build both pass — no known gaps blocking the next plan

---
*Phase: 02-recipe-collection-makeable-engine*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 4 modified source files and the SUMMARY.md itself confirmed present on disk. All 4 commit hashes (`3f9d8d4` test, `bea5939` feat, `80ab861` test, `a2f739a` feat) confirmed present in `git log`.
