---
phase: 02-recipe-collection-makeable-engine
plan: 05
subsystem: ui
tags: [react, antd, tanstack-query, form.list]

# Dependency graph
requires:
  - phase: 02-recipe-collection-makeable-engine
    plan: 01
    provides: recipe contracts (Recipe, RecipeInput, RecipePatch), GET/POST /api/recipes with server-computed makeable
  - phase: 02-recipe-collection-makeable-engine
    plan: 02
    provides: PATCH/DELETE /api/recipes/:id
  - phase: 02-recipe-collection-makeable-engine
    plan: 03
    provides: glassware contracts and GET/POST/PATCH/DELETE /api/glassware
provides:
  - useRecipes.ts hooks (useRecipes, useCreateRecipe, useUpdateRecipe, useDeleteRecipe, DeleteRecipeError)
  - RecipeList/RecipeRow/MakeableStatusBadge — real searchable recipe list with confirmed delete
  - IngredientListForm/MethodStepList/UnitDropdown/GlasswareSelector — RecipeForm's four sub-components
affects: [02-06 (RecipeForm assembles these sub-components for create/edit)]

# Actuals (#2632)
actuals:
  tokens: 3481
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RecipeRow owns useDeleteRecipe() directly and gates the mutate call behind antd Modal.confirm — no onDelete prop threaded from the parent"
    - "MethodStepList binds Form.Item directly to field.name (no nested tuple) since recipeInput.method is a flat string array, unlike IngredientListForm's [field.name, 'categoryId'] tuple pattern"
    - "GlasswareSelector and UnitDropdown are pure presentational Select wrappers with no data-fetching of their own — callers own the fetch"

key-files:
  created:
    - apps/barback/src/api/useRecipes.ts
    - apps/barback/src/components/RecipeList.tsx
    - apps/barback/src/components/RecipeRow.tsx
    - apps/barback/src/components/MakeableStatusBadge.tsx
    - apps/barback/src/components/IngredientListForm.tsx
    - apps/barback/src/components/MethodStepList.tsx
    - apps/barback/src/components/UnitDropdown.tsx
    - apps/barback/src/components/GlasswareSelector.tsx
  modified: []

key-decisions:
  - "MakeableStatusBadge takes only `{ makeable: boolean }` — no missingCategoryNames prop — reserving the longer 'Missing: [...]' sentence for 02-06's RecipeDetailView per the Copywriting Contract's detail-view placement"
  - "RecipeRow never renders a View button in this plan, regardless of whether onView is supplied — RecipeDetailView doesn't exist until 02-06, so the prop is accepted (threaded through by RecipeList) but intentionally unused for now"

requirements-completed: [RECIPE-01, RECIPE-02, MATCH-01, MATCH-02, MATCH-04]

coverage:
  - id: D1
    description: "Owner can see every recipe in a scrollable list, each row showing name and a server-computed makeable/not-makeable badge (D-15)"
    requirement: "MATCH-01"
    verification:
      - kind: manual
        ref: "RecipeList renders RecipeRow per recipe.id; RecipeRow renders MakeableStatusBadge bound to recipe.makeable, never recomputed client-side (T-02-15)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Owner can search the recipe list by name"
    requirement: "RECIPE-01"
    verification:
      - kind: manual
        ref: "apps/barback/src/components/RecipeList.tsx — in-memory filter on recipe.name.toLowerCase().includes(query)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Owner can delete a recipe directly from its row, with a confirmation prompt naming the recipe before the delete fires"
    requirement: "RECIPE-02"
    verification:
      - kind: manual
        ref: "apps/barback/src/components/RecipeRow.tsx — Modal.confirm({ title: 'Delete {name}?', content: \"This can't be undone.\" }) gates useDeleteRecipe().mutate"
        status: pass
    human_judgment: false
  - id: D4
    description: "Zero recipes renders the empty state 'No recipes yet' / 'Add your first recipe to build your menu.'"
    verification:
      - kind: manual
        ref: "apps/barback/src/components/RecipeList.tsx — !hasAnyRecipes branch"
        status: pass
    human_judgment: false
  - id: D5
    description: "Ingredient sub-form enforces at least one ingredient line at the UI layer; method sub-form numbers steps sequentially and renumbers after mid-list removal; unit dropdown offers exactly the D-19 fixed set with no free text"
    requirement: "MATCH-04"
    verification:
      - kind: manual
        ref: "IngredientListForm does not auto-seed a row (relies on Form.Item required rule + Form.List validation); MethodStepList numbers via `index + 1`, never a stored per-step field; UnitDropdown options built from the fixed 6-value D-19 array only"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-08-11
status: complete
---

# Phase 2 Plan 5: Recipe List & Form Sub-Components Summary

**Searchable recipe list with server-computed makeable badges and confirmed delete, plus the four reusable form sub-components 02-06's RecipeForm will assemble**

## Performance

- **Duration:** ~4 min
- **Completed:** 2026-08-11
- **Tasks:** 2
- **Files created:** 8

## Accomplishments
- `useRecipes.ts` live with all four CRUD hooks (`useRecipes`, `useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe`) plus `DeleteRecipeError`, mirroring `useIngredients.ts`/`useCategories.ts` conventions exactly (onSettled-only cache invalidation, body-reading delete error)
- `MakeableStatusBadge` renders the exact "Ready to make" / "Missing ingredients" copy from 02-UI-SPEC.md's Component Inventory, sourced solely from the server-computed `recipe.makeable` boolean (T-02-15 — no client-side recomputation exists anywhere)
- `RecipeRow` truncates long names, shows the makeable badge inline, and self-contains its delete flow behind an antd `Modal.confirm` naming the recipe before `useDeleteRecipe().mutate` fires (T-02-14)
- `RecipeList` is real and searchable: loading/error/true-empty/filtered-empty states mirror `IngredientList.tsx`'s pattern exactly, with an in-memory name-only filter (no query parameter ever sent to the server)
- Four form sub-components built for 02-06's `RecipeForm` to assemble: `UnitDropdown` (fixed D-19 6-value enum, no free text), `IngredientListForm` (antd `Form.List name="ingredients"`, no auto-seeded row), `MethodStepList` (antd `Form.List name="method"` over a flat string array, index-derived numbering), `GlasswareSelector` (purely presentational, takes `glassware` as a prop, no `useGlassware` import)

## Task Commits

Each task was committed atomically:

1. **Task 1: useRecipes.ts, RecipeList.tsx, RecipeRow.tsx, MakeableStatusBadge.tsx** - `a4ba5d9` (feat)
2. **Task 2: IngredientListForm.tsx, MethodStepList.tsx, UnitDropdown.tsx, GlasswareSelector.tsx** - `c0cd67a` (feat)

## Files Created/Modified
- `apps/barback/src/api/useRecipes.ts` - `useRecipes`, `useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe`, `DeleteRecipeError`
- `apps/barback/src/components/MakeableStatusBadge.tsx` - `{ makeable: boolean }` → "Ready to make" / "Missing ingredients" `Tag`
- `apps/barback/src/components/RecipeRow.tsx` - single recipe row: truncated name, badge, conditional Edit, self-contained confirmed Delete
- `apps/barback/src/components/RecipeList.tsx` - searchable, scrollable recipe list with loading/error/empty/filtered-empty states
- `apps/barback/src/components/UnitDropdown.tsx` - fixed D-19 `Select` (oz, dash, splash, barspoon, muddled, part)
- `apps/barback/src/components/IngredientListForm.tsx` - `Form.List name="ingredients"` sub-component (category + quantity + unit per row)
- `apps/barback/src/components/MethodStepList.tsx` - `Form.List name="method"` sub-component (ordered, numbered steps)
- `apps/barback/src/components/GlasswareSelector.tsx` - presentational `Select` over a `glassware` prop

## Decisions Made
- `MakeableStatusBadge` deliberately excludes a `missingCategoryNames` prop — the plan's Copywriting Contract reserves the longer "Can't make this right now. Missing: [...]" sentence for 02-06's `RecipeDetailView`, where the full category-name list has room to render; this plan's badge only ever shows the two short strings.
- `RecipeRow` accepts an `onView` prop (threaded through by `RecipeList`) but never renders a View button in this plan — `RecipeDetailView` doesn't exist until 02-06. The prop is kept in the interface now so `RecipeList`'s consumer contract doesn't need to change again in 02-06.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 02-06's `RecipeForm` can now import `IngredientListForm`, `MethodStepList`, `GlasswareSelector`, and wire `useCreateRecipe`/`useUpdateRecipe` (already defined in `useRecipes.ts`) directly — no new hook contracts needed
- `RecipeList` and `RecipeRow` are ready to be wired into `App.tsx`'s Recipes surface in 02-06, alongside the eventual `onView` → `RecipeDetailView` wiring
- Full server test suite (67 tests) still green — this plan touched no server files, confirming no regression

---
*Phase: 02-recipe-collection-makeable-engine*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 8 created source files and the SUMMARY.md itself confirmed present on disk. Both commit hashes (`a4ba5d9` feat, `c0cd67a` feat) confirmed present in `git log`.
