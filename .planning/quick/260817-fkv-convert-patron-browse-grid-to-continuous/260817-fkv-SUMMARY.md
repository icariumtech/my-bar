---
phase: quick
plan: 260817-fkv
subsystem: ui
tags: [react, tailwind, patron, list-layout]

# Dependency graph
requires:
  - phase: quick-260813-ea3
    provides: Patron neon-glow restyle (RecipeCard bordered-card treatment, TagRail, browse grid)
provides:
  - RecipeCard.tsx as an unbordered list row (no border/glow/rounded/background)
  - RecipeBrowse.tsx recipe container as a single-column divide-y list instead of a 2-col grid
affects: [patron-browse-experience, future patron UI polish quick tasks]

# Actuals (#2632)
actuals:
  tokens: 528
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns: ["divide-y divide-white/10 single-column list layout for Patron browse rows, replacing per-card glow-border grid"]

key-files:
  created: []
  modified:
    - apps/patron/src/components/RecipeCard.tsx
    - apps/patron/src/components/RecipeBrowse.tsx

key-decisions:
  - "Kept opacity-60 grayscale dimming (D-43) unchanged on not-makeable rows; only removed border/glow/rounded/background classes from the makeable branch"
  - "transition-shadow replaced with transition-opacity since the row no longer has a box-shadow/glow to transition"

patterns-established:
  - "Pattern: Patron list rows use flex flex-col divide-y divide-white/10 containers with unbordered py-lg rows, not per-item bordered cards"

requirements-completed: [PATR-01]

coverage:
  - id: D1
    description: "Patron browse view renders recipes as a single continuous vertical list separated by thin divider lines, not a 2-column grid of glow-bordered cards"
    requirement: "PATR-01"
    verification:
      - kind: unit
        ref: "apps/patron/src/components/RecipeBrowse.test.tsx (28 tests, full suite)"
        status: pass
      - kind: other
        ref: "grep -c for glow-orange|rounded-2xl|backdrop-blur|bg-patron-surface in RecipeCard.tsx (must be 0)"
        status: pass
    human_judgment: true
    rationale: "Visual list/divider appearance (single column, hairline separators, no per-row card box) is a layout/aesthetic outcome best confirmed by a human looking at the rendered page, though the automated grep and existing test suite both back the structural claim."

# Metrics
duration: 12min
completed: 2026-08-17
status: complete
---

# Quick Task 260817-fkv: Convert Patron Browse Grid to Continuous List Summary

**RecipeCard.tsx converted from a bordered/glow card to an unbordered list row, and RecipeBrowse.tsx's `grid grid-cols-2` container replaced with a single-column `divide-y divide-white/10` list.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-17T16:05:00Z
- **Completed:** 2026-08-17T16:17:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- RecipeCard.tsx root div no longer applies any border, glow, rounded-corner, background, or backdrop-blur classes — it's now a plain `py-lg flex flex-col gap-sm` row
- D-43 dimming (`opacity-60 grayscale` for not-makeable recipes) preserved exactly, still conditional on `recipe.overallStatus !== 'green'`
- RecipeBrowse.tsx's recipe container changed from `grid grid-cols-2 gap-md` to `flex flex-col divide-y divide-white/10`, producing a single continuous scrolling list with thin hairline dividers between rows instead of per-row boxed cards
- Full Patron test suite (28 tests) and Patron production build both pass clean with no changes required to any test assertions

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert RecipeCard from a bordered card to an unbordered list row** - `7d76f42` (feat)
2. **Task 2: Convert RecipeBrowse's grid container to a single-column divided list, then run full verification** - `d7369cc` (feat)

**Plan metadata:** pending final commit (docs)

## Files Created/Modified
- `apps/patron/src/components/RecipeCard.tsx` - Root row div stripped of border/glow/rounded/background classes; kept D-43 opacity-60 grayscale dimming; internal header/tags/ingredients/Tap-to-View content untouched; leading comment block updated with 260817-fkv note
- `apps/patron/src/components/RecipeBrowse.tsx` - Recipe container className changed from `grid grid-cols-2 gap-md` to `flex flex-col divide-y divide-white/10`; `.map()` body, key, onSelect callback, TagRail, and outer page wrapper all unchanged

## Decisions Made
- Kept the `opacity-60 grayscale` dimming as the sole remaining conditional class on the not-makeable branch, with an empty string for the makeable branch — no replacement border/background was substituted, matching the plan's explicit instruction to remove card styling entirely, not re-theme it
- Renamed `transition-shadow` to `transition-opacity` since the row no longer transitions a box-shadow/glow effect, only its opacity when dimmed

## Deviations from Plan

None - plan executed exactly as written. The planner's pre-flight grep (confirmed in plan context: no test asserts `grid-cols-2` or `glow-orange...` class names) held true — `pnpm --filter patron test` passed all 28 tests with zero assertion changes needed.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Patron browse view now matches the reference screenshot's single-column list layout; ready for visual confirmation by the user in the running app
- No blockers for Phase 4 (Bartender Console & Order Workflow), which is unrelated to this Patron-only change

---
*Phase: quick*
*Completed: 2026-08-17*
