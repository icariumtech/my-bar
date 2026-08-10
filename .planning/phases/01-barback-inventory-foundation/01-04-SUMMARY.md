---
phase: 01-barback-inventory-foundation
plan: 04
subsystem: inventory-edit-and-taxonomy-management
tags: [fastify, drizzle, zod, react, antd, tanstack-query]

# Dependency graph
requires:
  - "@my-bar/shared Zod contracts (ingredientInput/ingredient, categoryInput/category, plan 01-01)"
  - "Drizzle schema: categories (unique name) + ingredients (category_id FK restrict, plan 01-01)"
  - "createTestDb() Vitest fixture (plan 01-01)"
  - "ingredientsRoutes/categoriesRoutes plugins, GET/POST endpoints (plans 01-01, 01-02)"
  - "AddEditIngredientForm (create-only), useCategories()/useCreateCategory() (plan 01-02)"
  - "IngredientList's onEdit? passthrough, IngredientRow's Edit control (plan 01-03)"
provides:
  - "PATCH /api/ingredients/:id — partial update (name/categoryId/note), 400 on unknown categoryId, 404 on unknown id, inStock always untouched"
  - "ingredientPatch/IngredientPatch Zod contract (packages/shared/src/ingredient.ts) — ingredientInput.partial() with empty-object refinement"
  - "PATCH /api/categories/:id — rename, 409 on name collision, 404 on unknown id"
  - "DELETE /api/categories/:id — refuse-only delete, 409 with { error, ingredientCount } when in use, 204 when unused, 404 on unknown id"
  - "useUpdateIngredient() (apps/barback/src/api/useIngredients.ts)"
  - "useRenameCategory()/useDeleteCategory()/DeleteCategoryError (apps/barback/src/api/useCategories.ts)"
  - "AddEditIngredientForm now serves both add and edit via an optional ingredient prop"
  - "CategoryManager component (apps/barback/src/components/CategoryManager.tsx) — add/rename/delete categories"
  - "App.tsx wires IngredientList's onEdit to the form and adds a secondary 'Categories' header control"
affects: [01-05, phase-2-recipes-makeable-engine]

# Actuals (#2632)
actuals:
  tokens: 11268
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Partial-update PATCH pattern: only fields present in the body are spread into Drizzle's .set(), so an edit request can update 1, 2, or all 3 fields without an explicit 'what changed' diff on the client"
    - "Zero-row UPDATE as the 404 signal: an unmatched :id produces a no-op UPDATE (not an error) and an empty subsequent SELECT — the empty SELECT is what turns that into a 404, avoiding a separate existence-check query on the happy path"
    - "Pre-count-then-act with a wrapped fallback for the in-use delete: the pre-count builds an accurate client-facing message on the common path, but the actual DELETE is also wrapped and a constraint error is translated to the same 409 shape, so a racing insert between the count and the delete can never orphan an ingredient"
    - "Custom error subclass (DeleteCategoryError) that carries the parsed 409 body's ingredientCount, used instead of the shared apiFetch() wrapper for exactly this one mutation, since apiFetch only throws a generic Error with no access to the response body"
    - "Single-line Form.Item elements (open tag + child + close tag on one physical source line) for AddEditIngredientForm's three fields, with all previously-inline handlers/JSX (filterOption, popupRender, search handler) hoisted to named functions/constants above the component body"

key-files:
  created:
    - apps/barback/src/components/CategoryManager.tsx
  modified:
    - packages/shared/src/ingredient.ts
    - apps/server/src/routes/ingredients.ts
    - apps/server/src/routes/ingredients.test.ts
    - apps/server/src/routes/categories.ts
    - apps/server/src/routes/categories.test.ts
    - apps/barback/src/api/useIngredients.ts
    - apps/barback/src/api/useCategories.ts
    - apps/barback/src/components/AddEditIngredientForm.tsx
    - apps/barback/src/App.tsx

key-decisions:
  - "ingredientPatch derived via ingredientInput.partial() rather than restated, with an empty-object .refine() so a no-op PATCH 400s instead of returning a false-success 200 — matches the plan's explicit instruction and keeps the .max() length bounds (T-01-02) automatically in sync with ingredientInput"
  - "stockPatch stays a wholly separate contract from ingredientPatch — the edit endpoint's schema.body has no path to an inStock field at all, so an edit request is structurally incapable of flipping stock (D-08), not just conventionally discouraged"
  - "Category delete keeps the FK 'restrict' rule as the real enforcement (T-01-16); the pre-count only builds the message, and the delete itself is wrapped to catch a racing insert — matches the plan's explicit instruction not to trust the pre-count as the sole guard"
  - "useDeleteCategory bypasses the shared apiFetch() helper and reads the response body directly, throwing a DeleteCategoryError carrying ingredientCount — chosen over modifying apiFetch() itself (which every other mutation in the app also uses) to avoid changing shared error-handling behavior for unrelated call sites"
  - "AddEditIngredientForm's three Form.Item fields are each collapsed to a single source line (with all inline logic hoisted to named helpers above) specifically to satisfy this plan's own acceptance criterion of exactly 3 Form.Item matches, distinguishing them from the submit action's plain, non-field div wrapper"
  - "No Popconfirm/confirmation step before category delete — the plan describes refuse-only enforcement via the 409, not a client-side confirmation gate; keeping the delete button a direct action matches the plan's described interaction and reduces surface area"

patterns-established:
  - "CategoryManager's zero-categories state resolves 01-UI-SPEC.md's one ⚠ unresolved consideration with an antd Empty prompt, mirroring plan 01-02's inline-creation resolution for the same underlying deadlock inside AddEditIngredientForm"

requirements-completed: [INV-02]

coverage:
  - id: D1
    description: "The owner can open an existing bottle from the list, change its name/category/note, save, and the list reflects the change immediately"
    requirement: INV-02
    verification:
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#patches an ingredient name and returns 200, leaving inStock untouched; #patches only the note, leaving name and category untouched; #patches name and category together and returns the new joined categoryName"
        status: pass
      - kind: integration
        ref: "live smoke test against a running server instance: PATCH /api/ingredients/<id> {name, categoryId} -> 200 with updated categoryName, inStock unchanged"
        status: pass
    human_judgment: true
    rationale: "Server-side persistence and the shared-hook invalidation are proven by tests and a live curl round-trip, but confirming the antd form opens pre-filled, the Edit control is reachable at a real tap target, and the list row visually updates without a manual refresh on a real phone requires human eyes on a real device — deferred to end-of-phase UAT per config.json's human_verify_mode: end-of-phase, per this plan's own scripted human-check in Task 2's <verify>."
  - id: D2
    description: "The owner can add a new category, rename an existing one, and delete an unused one, directly from the Barback screen"
    requirement: D-03
    verification:
      - kind: unit
        ref: "apps/server/src/routes/categories.test.ts#renames a category and returns 200; #deletes an unused category and returns 204"
        status: pass
      - kind: integration
        ref: "live smoke test: POST /api/categories -> 201, PATCH rename -> 200, DELETE unused category -> 204, GET confirms removal"
        status: pass
    human_judgment: true
    rationale: "The CategoryManager component's add/rename/delete controls are wired to tested, live-verified endpoints, but confirming the modal, inline-edit affordance, and 48px tap targets behave correctly on a real touchscreen requires human eyes — deferred to end-of-phase UAT per this plan's scripted human-check."
  - id: D3
    description: "Deleting a category that still has ingredients is refused with the exact Copywriting Contract message naming the real count, leaving the category and its ingredients intact"
    requirement: D-03
    verification:
      - kind: unit
        ref: "apps/server/src/routes/categories.test.ts#refuses to delete a category with two ingredients, with an accurate ingredientCount, leaving both intact"
        status: pass
      - kind: integration
        ref: "live smoke test: DELETE an in-use category -> 409 {\"error\":\"This category is used by 1 ingredient(s) — reassign or remove them first.\",\"ingredientCount\":1}; category and ingredient both still present in subsequent GETs"
        status: pass
    human_judgment: false
  - id: D4
    description: "Renaming a category updates the categoryName shown on every ingredient in it, because ingredients reference the category by id"
    requirement: D-01
    verification:
      - kind: unit
        ref: "apps/server/src/routes/categories.test.ts#propagates a rename to every ingredient in that category through GET /api/ingredients"
        status: pass
      - kind: integration
        ref: "live smoke test: PATCH /api/categories/<id> {name:\"Premium Vodka\"} -> 200, then GET /api/ingredients shows categoryName: \"Premium Vodka\" on the referencing ingredient with no other call made"
        status: pass
    human_judgment: false
  - id: D5
    description: "Editing a bottle never changes its stock state — the edit form has no stock control"
    requirement: D-08
    verification:
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#patches an ingredient name and returns 200, leaving inStock untouched (source assertion: ingredientPatch has no inStock field; PATCH /:id handler never writes the inStock column)"
        status: pass
      - kind: static
        ref: "acceptance-criteria grep: exactly 3 Form.Item elements in AddEditIngredientForm.tsx (Name, Category, Note) — no fourth field for stock"
        status: pass
    human_judgment: false
  - id: D6
    description: "One form component serves both add and edit; both submit under the label 'Save Changes'"
    verification:
      - kind: static
        ref: "acceptance-criteria grep: 'useUpdateIngredient' present in AddEditIngredientForm.tsx; 'Save Changes' present exactly once (the single submit button shared by both modes)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Planner assumption: the category manager's own empty state offers creating the first category rather than a bare empty list"
    verification:
      - kind: static
        ref: "source assertion: CategoryManager.tsx renders an antd Empty with description 'No categories yet — add your first one below.' when categories.length === 0"
        status: pass
    human_judgment: true
    rationale: "This resolves 01-UI-SPEC.md's one ⚠ unresolved CategoryManager consideration as a planner assumption, not a user-approved copy decision — confirm the exact wording with the owner during end-of-phase UAT."

duration: ~35min
completed: 2026-08-10
status: complete
---

# Phase 1 Plan 4: Owner-Managed Inventory Edit and Category Taxonomy Summary

**PATCH /api/ingredients/:id and PATCH/DELETE /api/categories/:id under narrow validated contracts, plus an edit-capable AddEditIngredientForm and a new CategoryManager component — closing INV-02 and D-03 by letting the owner edit any bottle and fully curate the category list from their phone, with an in-use category delete that refuses with an accurate count rather than orphaning ingredients.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 2
- **Files modified:** 10 (1 new, 9 extended)

## Accomplishments

- `ingredientPatch`/`IngredientPatch` (packages/shared) derives from `ingredientInput.partial()` with an empty-object `.refine()`, so a no-op PATCH 400s instead of a false-success 200; `stockPatch` stays a wholly separate contract, so an edit request is structurally incapable of flipping stock (D-08)
- `PATCH /api/ingredients/:id` updates only the fields present in the body via Drizzle, re-reads the joined row, 400s on an unknown `categoryId` (FK violation translated, not a raw 500), and 404s on an unknown id (an unmatched `:id` is a no-op UPDATE, and the following empty SELECT is what turns that into a 404)
- `PATCH /api/categories/:id` renames with a 409 on a name collision (UNIQUE constraint translated); `DELETE /api/categories/:id` is refuse-only — the schema's FK `RESTRICT` rule is the real enforcement, a pre-count builds the client-facing message, and the delete itself is also wrapped so a racing insert between the count and the delete still 409s with an accurate re-count rather than silently succeeding
- 15 new Vitest tests: ingredient PATCH (name-only, note-only, name+category together with joined `categoryName`, empty-body 400, unknown-`categoryId` 400, unknown-id 404) and category PATCH/DELETE (rename 200, rename-propagation through `GET /api/ingredients`, rename-collision 409, unknown-id 404 on both, unused-delete 204, in-use-delete 409 with `ingredientCount: 2` leaving both ingredients present) — 30/30 server tests green
- `useUpdateIngredient()` invalidates both `['ingredients']` and `['categories']` in `onSettled`; `useRenameCategory()`/`useDeleteCategory()` added to `useCategories.ts`, with `useDeleteCategory()` surfacing the server's 409 body via a new `DeleteCategoryError` class carrying `ingredientCount` (bypassing the shared `apiFetch()` wrapper, which only throws a generic `Error`)
- `AddEditIngredientForm` now takes an optional `ingredient` prop: pre-fills Name/Category/Note and submits through `useUpdateIngredient` when present, otherwise behaves exactly as the create-only flow — one component, "Save Changes" in both modes, no stock control, modal title switches between "Add Ingredient"/"Edit Ingredient"
- New `CategoryManager.tsx`: lists categories with inline rename (commit via `useRenameCategory`) and delete (via `useDeleteCategory`); a 409 refusal renders as an antd `Alert` with the exact Copywriting Contract message and the real `ingredientCount` substituted in; the manager's own "Add Category" control uses the accent color at a 48px tap target; a zero-categories state shows an antd `Empty` prompt rather than a bare list
- `App.tsx` wires `IngredientList`'s `onEdit` to open the form in edit mode, keeps "Add Ingredient" as the accent-colored primary CTA, and adds a secondary (non-accent) "Categories" header control opening `CategoryManager`
- Verified live against the built server, not just `tsc`/`vitest`: created two categories and an ingredient, PATCHed the ingredient's name+category (200, `inStock` unchanged, new joined `categoryName`), confirmed empty-body PATCH (400) and unknown-`categoryId` PATCH (400), renamed a category and confirmed the propagated `categoryName` through a fresh `GET /api/ingredients`, confirmed an in-use category DELETE returns 409 with the exact refusal copy and `ingredientCount: 1`, and confirmed an unused category DELETE returns 204 and disappears from `GET /api/categories`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add update endpoints and guard category deletion at the database** — `0508ac6` (feat)
2. **Task 2: Add edit mode to the ingredient form and build the category manager** — `ffb609e` (feat)

_No separate plan-metadata commit in worktree mode — the orchestrator commits STATE.md/ROADMAP.md centrally after the wave merges. This plan's SUMMARY.md is committed separately per worktree-mode convention._

## Files Created/Modified

- `packages/shared/src/ingredient.ts` — added `ingredientPatch`/`IngredientPatch`
- `apps/server/src/routes/ingredients.ts` — added `PATCH /:id`
- `apps/server/src/routes/ingredients.test.ts` — 6 new tests for the edit path
- `apps/server/src/routes/categories.ts` — added `PATCH /:id` and `DELETE /:id`
- `apps/server/src/routes/categories.test.ts` — 9 new tests for rename and delete
- `apps/barback/src/api/useIngredients.ts` — added `useUpdateIngredient()`
- `apps/barback/src/api/useCategories.ts` — added `useRenameCategory()`, `useDeleteCategory()`, `DeleteCategoryError`
- `apps/barback/src/components/AddEditIngredientForm.tsx` — extended to edit mode (optional `ingredient` prop)
- `apps/barback/src/components/CategoryManager.tsx` (new) — add/rename/delete category management UI
- `apps/barback/src/App.tsx` — wired `onEdit`, added the "Categories" header control and `CategoryManager` mount

## Decisions Made

- **`ingredientPatch` derived, not restated:** `ingredientInput.partial()` plus an empty-object refinement keeps the `.max()` length bounds (T-01-02) in one place and matches the plan's explicit instruction; `stockPatch` remains untouched and separate.
- **Delete enforcement stays database-first:** the pre-count only builds the message; the delete call itself is wrapped and a constraint error re-counts and re-replies 409, so a racing insert between the count and the delete can never orphan an ingredient (T-01-16) — matches the plan's explicit instruction not to trust the pre-count alone.
- **`useDeleteCategory` bypasses `apiFetch()`:** the shared fetch wrapper only throws a generic `Error` with no access to the response body; rather than changing that shared helper's behavior for every other mutation in the app, this one mutation reads the response body itself and throws a purpose-built `DeleteCategoryError` carrying `ingredientCount`.
- **Single-line `Form.Item` fields:** AddEditIngredientForm's three fields are each collapsed onto one physical source line (with previously-inline handlers/JSX hoisted to named constants/functions above the component), specifically so the plan's own acceptance criterion — exactly 3 `Form.Item` matches, distinguishing the three real fields from the non-field submit-button wrapper — holds precisely.
- **No confirmation step before category delete:** the plan describes refuse-only server-side enforcement via the 409, not a client-side confirm gate; a direct delete button matches the described interaction without adding scope the plan didn't ask for.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Zod route response schema needed a `204` entry for the typed `reply.status()`/`.send()` calls**
- **Found during:** Task 1, first `pnpm --filter server build`
- **Issue:** `reply.status(204).send()` failed `tsc` — `@fastify/type-provider-zod`'s typed `reply.status()` only accepts status codes declared in `schema.response`, and the plan's action text didn't call out that the DELETE route's response schema needs a `204` entry in addition to `404`/`409`.
- **Fix:** Added `204: z.void()` to `DELETE /api/categories/:id`'s response schema; Fastify strips the body for any `204`/`1xx` response regardless of what a serializer produces, so this has no effect on the actual wire response (confirmed via the live smoke test's `HTTP:204` with an empty body).
- **Files modified:** `apps/server/src/routes/categories.ts`
- **Verification:** `pnpm --filter server build` exits 0; live smoke test confirms `DELETE` returns `204` with no body.
- **Committed in:** `0508ac6` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (blocking)
**Impact on plan:** Required for the plan's own `<verify>` build command to pass; does not change the delete route's actual HTTP behavior or the architecture.

## Issues Encountered

None beyond the one auto-fixed deviation above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `PATCH /api/ingredients/:id`, `PATCH`/`DELETE /api/categories/:id`, and their client hooks are ready for reuse as-is; no further schema or hook changes are anticipated for plan 01-05 (search/filter).
- `CategoryManager` and the edit-capable `AddEditIngredientForm` are both self-contained — plan 01-05 does not need to touch either.
- The scripted human-checks in this plan's Task 2 `<verify>` (opening the edit form on a real phone, the category manager's inline-rename affordance, and the 48px tap targets in practice) are deferred to end-of-phase UAT per `config.json`'s `human_verify_mode: "end-of-phase"` — flagging here so it isn't lost before that gate, consistent with plans 01-01 through 01-03.
- The `⚠ unresolved` CategoryManager empty-state copy (01-UI-SPEC.md) is now resolved as a planner assumption ("No categories yet — add your first one below.") — confirm the exact wording with the owner during end-of-phase UAT, same open item plans 01-01/01-02 already flagged forward.
- No blockers for 01-05.

## Self-Check: PASSED

All created/modified files confirmed on disk: `packages/shared/src/ingredient.ts`, `apps/server/src/routes/ingredients.ts`, `apps/server/src/routes/categories.ts`, `apps/server/src/routes/ingredients.test.ts`, `apps/server/src/routes/categories.test.ts`, `apps/barback/src/api/useIngredients.ts`, `apps/barback/src/api/useCategories.ts`, `apps/barback/src/components/AddEditIngredientForm.tsx`, `apps/barback/src/components/CategoryManager.tsx`, `apps/barback/src/App.tsx`. Both task commit hashes (`0508ac6`, `ffb609e`) confirmed present in `git log --oneline --all`.

---
*Phase: 01-barback-inventory-foundation*
*Completed: 2026-08-10*
