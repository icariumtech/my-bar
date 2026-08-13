---
phase: 03-patron-browse-experience
plan: 02
subsystem: ui
tags: [react, tanstack-query, tailwind, vitest, lucide-react]

requires:
  - phase: 03-patron-browse-experience (plan 01)
    provides: apps/patron workspace, useRecipes hook, RecipeCard/MakeableIndicator, tags/description API surface
provides:
  - Live D-36 tag-rail filtering (TagRail/TagSubmenu) over 4 fixed D-34 groups (Spirit/Type/Season/Flavor)
  - D-37 single-active-filter model (select/replace/re-tap-to-clear) as pure, unit-tested helpers
  - RecipeBrowse container composing TagRail + grid with all UI-SPEC loading/error/empty states
  - App.tsx reduced to a thin `<RecipeBrowse />` mount, mirroring Barback's thin-shell precedent
affects: [03-03, 03-04, 03-05]

actuals:
  tokens: 5552
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Pure filter/derive helpers (getActiveTagIds, filterRecipesByTag) exported ahead of the component (Interface-First) so RecipeBrowse imports them directly instead of re-deriving the same logic"
    - "Toggle-to-clear tag selection implemented once in TagRail's wrapped callback, keeping TagSubmenu a dumb, reusable list renderer with no selection-rule awareness"
    - "Accordion-style single-expanded-group rail state (expandedGroupId), inline submenu (not overlay/popover) beneath its own group icon"

key-files:
  created:
    - apps/patron/src/components/TagRail.tsx
    - apps/patron/src/components/TagRail.test.tsx
    - apps/patron/src/components/TagSubmenu.tsx
    - apps/patron/src/components/RecipeBrowse.tsx
    - apps/patron/src/components/RecipeBrowse.test.tsx
    - apps/patron/src/App.test.tsx
  modified:
    - apps/patron/src/App.tsx

key-decisions:
  - "Task 2 (RecipeBrowse/App.tsx) is a non-TDD `type=\"auto\"` task per the plan's own frontmatter, but its acceptance criteria and verify command explicitly require RecipeBrowse.test.tsx/App.test.tsx — wrote both as part of the single implementation commit rather than splitting into RED/GREEN, since the task carries no `tdd=\"true\"` attribute."
  - "Disambiguated RecipeBrowse.test.tsx's tag-select assertion with getByRole('button', { name: 'Whiskey' }) instead of getByText('Whiskey') — the fixture recipe's own RecipeCard renders 'Whiskey' twice (tag pill + ingredient categoryName), colliding with the TagSubmenu button text."

requirements-completed: [PATR-01, PATR-06]

coverage:
  - id: D1
    description: "TagRail renders 4 fixed D-34 groups; a group with zero active tags stays muted and never reveals an empty TagSubmenu (D-36)"
    requirement: "PATR-01"
    verification:
      - kind: unit
        ref: "apps/patron/src/components/TagRail.test.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tapping a tag applies a single active filter — re-tap clears it, tapping a different tag replaces (never combines) it (D-37)"
    requirement: "PATR-01"
    verification:
      - kind: unit
        ref: "apps/patron/src/components/TagRail.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "RecipeBrowse composes TagRail + grid with loading/error(+Retry)/empty states rendering the exact UI-SPEC copy, and not-makeable recipes stay visible/tappable in the grid at all times"
    requirement: "PATR-06"
    verification:
      - kind: unit
        ref: "apps/patron/src/components/RecipeBrowse.test.tsx"
        status: pass
      - kind: unit
        ref: "apps/patron/src/App.test.tsx"
        status: pass
      - kind: other
        ref: "pnpm --filter patron build (exit 0), pnpm -r build && pnpm -r test (monorepo-wide, exit 0)"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-08-12
status: complete
---

# Phase 03 Plan 02: Patron Tag Rail + Browse Container Summary

**Left-side D-34 icon rail with live D-36 tag submenus and D-37 single-filter-replace logic, composed into a RecipeBrowse container that owns all UI-SPEC loading/error/empty states; App.tsx reduced to a one-line mount**

## Performance

- **Duration:** ~20 min
- **Tasks:** 2
- **Files modified:** 7 (6 created, 1 modified)

## Accomplishments
- `TagRail`/`TagSubmenu` render the four fixed D-34 groups (Spirit/Type/Season/Flavor); a group with zero active tags renders muted and never opens an empty submenu (D-36), computed live via the exported `getActiveTagIds` helper
- Single-active-filter model (D-37) fully covered by unit tests: select, re-tap-to-clear, and cross-group replace, all implemented once in `TagRail`'s wrapped callback so `TagSubmenu` stays a dumb list renderer
- `RecipeBrowse` composes the rail + grid, implementing the exact UI-SPEC copy for loading, error+Retry, and empty (both true-zero and filtered-to-zero) states; not-makeable recipes stay visible, dimmed, and tappable at all times
- `App.tsx` reduced to `<RecipeBrowse />`, no longer importing `useRecipes`/`RecipeCard` directly — mirrors Barback's own thin-shell precedent

## Task Commits

1. **Task 1: Active-tag/single-filter logic + TagRail/TagSubmenu UI (D-33/34/36/37)** — `0f51f64` (test, RED), `b57c635` (feat, GREEN)
2. **Task 2: RecipeBrowse container — grid + rail composition, loading/error/empty states** — `e5e3017` (feat, includes tests — non-TDD `type="auto"` task per plan frontmatter)

## Files Created/Modified
- `apps/patron/src/components/TagRail.tsx` — exports `getActiveTagIds`, `filterRecipesByTag`, `TAG_GROUP_META`, and the `TagRail` component
- `apps/patron/src/components/TagRail.test.tsx` — pure-logic + interaction coverage for D-36/D-37
- `apps/patron/src/components/TagSubmenu.tsx` — dumb tag-pill list renderer
- `apps/patron/src/components/RecipeBrowse.tsx` — browse container: rail + grid + all UI-SPEC states
- `apps/patron/src/components/RecipeBrowse.test.tsx` — empty/error+Retry/filter/not-makeable-visible coverage
- `apps/patron/src/App.tsx` — reduced to `<RecipeBrowse />`
- `apps/patron/src/App.test.tsx` — confirms App mounts RecipeBrowse as its entire body

## Decisions Made
- Task 2 has no `tdd="true"` attribute in the plan, so its test file was written as part of the single implementation commit (not split RED/GREEN) — the plan's own acceptance criteria and verify command still required the tests to exist and pass.
- Disambiguated a test-selector collision: the fixture recipe's `RecipeCard` renders "Whiskey" twice (tag pill and ingredient `categoryName`), which collided with the `TagSubmenu` "Whiskey" button text under `getByText`. Switched to `getByRole('button', { name: 'Whiskey' })` to target the submenu button unambiguously.

## Deviations from Plan

None — plan executed as written. No Rule 1-4 auto-fixes were needed; the only adjustments were test-selector precision (not a code-behavior deviation).

## Issues Encountered
- The worktree had no `node_modules` installed at session start (`pnpm install` had not been run against this worktree's own checkout); ran `pnpm install` once at the start of execution before any test/build command. Not a plan deviation — standard worktree setup.

## User Setup Required
None.

## Next Phase Readiness
- `TagRail`/`RecipeBrowse` are ready for 03-04 (detail view — `RecipeCard`'s `onSelect` stub is already wired for real navigation without touching `RecipeBrowse`'s structure) and 03-05 (Socket.IO live sync — `useRecipes`'s `staleTime: Infinity` + TanStack Query invalidation is the integration point, untouched by this plan).
- Full monorepo build (`pnpm -r build`) and test suite (`pnpm -r test`: server 89/89, patron 16/16, barback 70/70) verified green before returning, per the parallel-execution cross-package check.
- No blockers.

---
*Phase: 03-patron-browse-experience*
*Completed: 2026-08-12*
