---
phase: 02-recipe-collection-makeable-engine
plan: 06
subsystem: ui
tags: [react, antd, tanstack-query, recipe-crud]

# Dependency graph
requires:
  - phase: 02-recipe-collection-makeable-engine
    plan: 04
    provides: useGlassware() hooks and GlasswareManager UI
  - phase: 02-recipe-collection-makeable-engine
    plan: 05
    provides: useRecipes() hooks, RecipeList/RecipeRow/MakeableStatusBadge, IngredientListForm/MethodStepList/UnitDropdown/GlasswareSelector sub-components
provides:
  - apps/barback/src/components/RecipeForm.tsx — create/edit recipe modal assembling every 02-05 sub-component
  - apps/barback/src/components/RecipeDetailView.tsx — full recipe detail modal with the exact missing-category sentence
  - RecipeRow View icon button (gated on onView prop)
  - App.tsx "Recipes" header entry point wiring add/edit/view/delete into one modal surface
affects: []

# Actuals (#2632)
actuals:
  tokens: 3522
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Form.Item name=X wrapping a Form.List-based sub-component (IngredientListForm/MethodStepList) of the SAME name X — the outer Form.Item's `rules` supplies required-field validation that Form.List alone doesn't expose, while the inner Form.List still registers against the same Form instance under that name"
    - "RecipeDetailView renders recipe.missingCategoryNames verbatim with no client-side lookup or recomputation (T-02-16) — the same server-verbatim-rendering discipline MakeableStatusBadge established in 02-05"

key-files:
  created:
    - apps/barback/src/components/RecipeForm.tsx
    - apps/barback/src/components/RecipeDetailView.tsx
  modified:
    - apps/barback/src/components/RecipeRow.tsx
    - apps/barback/src/App.tsx

key-decisions: []

patterns-established:
  - "Recipe create/edit/view is a single header-reached modal group in App.tsx (recipesOpen/recipeFormOpen/editingRecipe/viewingRecipe state) rather than a route — mirrors the CategoryManager/GlasswareManager modal convention exactly, completing D-14"

requirements-completed: [RECIPE-01, RECIPE-02, MATCH-02]

coverage:
  - id: D1
    description: "Owner can create a new recipe from the Barback UI with name, ingredients, method, optional glassware, optional garnish, and see it appear in the list immediately"
    requirement: "RECIPE-01"
    verification:
      - kind: automated_ui
        ref: "pnpm -F @my-bar/barback build (typecheck + bundle succeeds)"
        status: pass
    human_judgment: true
    rationale: "Build/typecheck confirms RecipeForm wires useCreateRecipe correctly and the App.tsx Add Recipe button opens it, but the actual create-and-see-it-appear flow needs a human click-through — covered by this phase's end-of-phase human-verify checkpoint"
  - id: D2
    description: "Owner can edit an existing recipe, pre-filled with its current values including glassware"
    requirement: "RECIPE-02"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/RecipeForm.tsx — useEffect([open, recipe, form]) calls form.setFieldsValue with every field including glasswareId ?? undefined"
        status: pass
    human_judgment: true
    rationale: "Source confirms the pre-fill effect maps every RecipeInput field; actual pre-filled-modal rendering needs a human to visually confirm"
  - id: D3
    description: "Recipe detail view shows ingredients (qty/unit/category), numbered method, glassware name or 'None specified', garnish, and makeable status"
    requirement: "RECIPE-01"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/RecipeDetailView.tsx — renders ingredient lines as `${quantity} ${unit} ${categoryName}`, method as <ol>, glassware as glasswareName ?? 'None specified', garnish omitted when null"
        status: pass
    human_judgment: false
  - id: D4
    description: "Not-makeable recipe detail shows the exact sentence 'Can't make this right now. Missing: {category names}.' using server-computed missingCategoryNames"
    requirement: "MATCH-02"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/RecipeDetailView.tsx — `Can't make this right now. Missing: ${recipe.missingCategoryNames.join(', ')}.` rendered only when !recipe.makeable"
        status: pass
    human_judgment: false
  - id: D5
    description: "Recipe save failure shows the exact contracted error copy without losing typed values; Save Recipe button shows a loading state bound to the active mutation"
    requirement: "RECIPE-01"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/RecipeForm.tsx — catch block (no form.resetFields()) + Alert title=\"Couldn't save recipe — check your connection and try again.\" when saveFailed; Button loading={saving}"
        status: pass
    human_judgment: false
  - id: D6
    description: "Owner reaches the whole Recipes area from a header entry point in the existing Barback shell (D-14) — no new standalone app or route"
    requirement: "RECIPE-01"
    verification:
      - kind: automated_ui
        ref: "pnpm -F @my-bar/barback build; apps/barback/src/App.tsx — 'Recipes' header Button opens a Modal composing RecipeList + RecipeForm + RecipeDetailView"
        status: pass
    human_judgment: true
    rationale: "Build confirms the wiring compiles; the actual click-through of Recipes button → Add Recipe → edit → view → delete against a live server needs the phase's end-of-phase human-verify checkpoint"

duration: 6min
completed: 2026-08-10
status: complete
---

# Phase 2 Plan 6: RecipeForm, RecipeDetailView & Barback Recipes Entry Point Summary

**Create/edit recipe modal assembling every 02-05 sub-component, a detail view rendering MATCH-02's exact missing-category sentence, and a "Recipes" header entry point in App.tsx completing the full add/edit/view/delete loop**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-08-10T22:10:23-05:00
- **Completed:** 2026-08-10T22:13:16-05:00
- **Tasks:** 2
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- `RecipeForm.tsx` — single create/edit modal (props `{ recipe?, open, onClose }`, identical convention to `AddEditIngredientForm`) assembling `IngredientListForm`, `MethodStepList`, `GlasswareSelector` (fed by `useGlassware()`), submitting through `useCreateRecipe`/`useUpdateRecipe`
- Edit mode pre-fills every field including `glasswareId` via a `useEffect` keyed on `[open, recipe, form]`; submit failure leaves typed values intact and renders the exact "Couldn't save recipe — check your connection and try again." copy
- `RecipeDetailView.tsx` — full recipe detail modal rendering ingredients (`${quantity} ${unit} ${categoryName}`), numbered method steps, glassware (`glasswareName ?? 'None specified'`), garnish (omitted, not "None specified", when null per D-18), and the exact "Can't make this right now. Missing: {names}." sentence sourced verbatim from `recipe.missingCategoryNames` — no client-side recomputation (T-02-16)
- `RecipeRow.tsx` gains a View icon button (`EyeOutlined`, 48px tap target), gated on the `onView` prop that 02-05 had already threaded through but left unused
- `App.tsx` wires the whole Recipes area behind a new header "Recipes" button (default styling, accent reserved for primary CTAs per D-14/02-UI-SPEC.md): a modal composing `RecipeList` + an "Add Recipe" CTA, plus `RecipeForm` and a conditionally-rendered `RecipeDetailView` at the top level of the component tree

## Task Commits

Each task was committed atomically:

1. **Task 1: RecipeForm.tsx — create + edit, assembling all sub-components** - `11e232e` (feat)
2. **Task 2: RecipeDetailView.tsx + RecipeRow view wiring + final App.tsx Recipes entry point** - `f792f60` (feat)

## Files Created/Modified
- `apps/barback/src/components/RecipeForm.tsx` - create/edit recipe modal, assembles IngredientListForm/MethodStepList/GlasswareSelector, submits through useCreateRecipe/useUpdateRecipe
- `apps/barback/src/components/RecipeDetailView.tsx` - full recipe detail modal with exact missing-category sentence
- `apps/barback/src/components/RecipeRow.tsx` - adds View icon button gated on onView prop
- `apps/barback/src/App.tsx` - adds recipesOpen/recipeFormOpen/editingRecipe/viewingRecipe state, "Recipes" header button, and the Recipes modal composing RecipeList + RecipeForm + RecipeDetailView

## Decisions Made
None - followed the plan's instructions exactly, including the `Form.Item name="ingredients"` wrapping `IngredientListForm`'s internal `Form.List name="ingredients"` pattern specified in 02-PATTERNS.md.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- This was the final plan in Phase 2 — the full user workflow (create/edit/view recipe with correct live makeable status) is now usable end-to-end from the actual Barback UI, not just the API
- `pnpm -F @my-bar/barback build` succeeds with no type errors; `pnpm -F @my-bar/server test` remains green (67/67 tests, no server files touched)
- Remaining verification is the phase's end-of-phase human-verify checkpoint (per `workflow.human_verify_mode: end-of-phase`) confirming the full add → view → edit → delete loop in the actual browser against a real recipe and a toggled ingredient's in-stock state

---
*Phase: 02-recipe-collection-makeable-engine*
*Completed: 2026-08-10*

## Self-Check: PASSED

All 4 files (`RecipeForm.tsx`, `RecipeDetailView.tsx`, `RecipeRow.tsx`, `App.tsx`) confirmed present on disk with expected content. Both commit hashes (`11e232e`, `f792f60`) confirmed present in `git log`.
