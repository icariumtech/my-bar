---
phase: quick
plan: 260817-k8o
subsystem: ui
tags: [react, antd, autocomplete, barback, ingredient-picker]

requires:
  - phase: 02.1
    provides: IngredientPicker combined category/ingredient autocomplete component
provides:
  - Search-as-you-type filtering in IngredientPicker's combined category/ingredient dropdown
affects: [barback-recipe-form, ingredient-selection]

actuals:
  tokens: 806
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "IngredientPicker's categoryOptions/ingredientOptions now filter by case-insensitive substring match against `trimmed` before mapping to {value, label}, mirroring CategoryPicker.tsx/GlasswarePicker.tsx's existing filter-then-map pattern"

key-files:
  created: []
  modified:
    - apps/barback/src/components/pickers/IngredientPicker.tsx
    - apps/barback/src/components/pickers/IngredientPicker.test.tsx

key-decisions:
  - "Reused the existing `trimmed` variable (already used by hasExactIngredientMatch and the '+ Add' option) rather than introducing a new variable name, per plan guidance"
  - "Filtered ingredientOptions on `i.name` only, not the composed `${i.name} (${i.categoryName})` label, matching how hasExactIngredientMatch already compares"

patterns-established: []

requirements-completed: [MATCH-05, BARBACK-03]

coverage:
  - id: D1
    description: "Typing search text matching nothing hides all category/ingredient options, leaving only '+ Add new ingredient' visible"
    requirement: "MATCH-05"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/pickers/IngredientPicker.test.tsx#typing search text that matches neither the fixture category nor ingredient hides both from the dropdown"
        status: pass
    human_judgment: false
  - id: D2
    description: "Typing search text matching only the ingredient name hides the non-matching category option"
    requirement: "BARBACK-03"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/pickers/IngredientPicker.test.tsx#typing text that matches only the ingredient name hides the non-matching category option"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-17
status: complete
---

# Quick Task 260817-k8o: Fix IngredientPicker search filtering Summary

**IngredientPicker's categoryOptions/ingredientOptions now filter by case-insensitive substring match against the typed search text, matching CategoryPicker/GlasswarePicker's existing behavior**

## Performance

- **Duration:** 8 min
- **Started:** 2026-08-17T19:29:00Z
- **Completed:** 2026-08-17T19:37:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added two RED tests proving the dropdown previously ignored typed search text (only the "+ Add new ingredient" affordance reacted)
- Fixed `categoryOptions`/`ingredientOptions` in IngredientPicker.tsx to filter first via `.filter((x) => x.name.toLowerCase().includes(trimmed.toLowerCase()))` before mapping to `{value, label}`, mirroring CategoryPicker.tsx/GlasswarePicker.tsx's existing pattern
- Full IngredientPicker.test.tsx suite (78 tests across the barback app, all passing) confirms the fix and that no pre-existing behavior (category select, ingredient select, checkbox, inline-create sub-flow) regressed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing test proving the dropdown does not filter by search text** - `d37327f` (test)
2. **Task 2: Filter categoryOptions and ingredientOptions by the typed search text** - `80c0fa2` (feat)

_TDD cycle: RED (d37327f) -> GREEN (80c0fa2)_

## Files Created/Modified
- `apps/barback/src/components/pickers/IngredientPicker.tsx` - `categoryOptions` and `ingredientOptions` now filter by `trimmed` (case-insensitive substring on `name`) before mapping to options
- `apps/barback/src/components/pickers/IngredientPicker.test.tsx` - two new tests: non-matching search hides both category and ingredient options (leaving only "+ Add new ingredient"); ingredient-only-matching search hides the non-matching category

## Decisions Made
- Reused the file's existing `trimmed` variable rather than introducing a new one, consistent with how `hasExactIngredientMatch` and the "+ Add" option already use it
- Filtered ingredients on `i.name` alone (not the composed `"{name} ({categoryName})"` label) to match `hasExactIngredientMatch`'s existing comparison basis

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

IngredientPicker's search-as-you-type filtering now matches CategoryPicker/GlasswarePicker behavior across the barback app. No blockers.

---
*Phase: quick*
*Completed: 2026-08-17*
