---
phase: quick/260810-g1w-fix-wr-01-wr-02-swipe-toggle-race-condit
plan: 1
subsystem: ui
tags: [react, tanstack-query, race-condition, code-review-fix]

requires:
  - phase: 01-barback-inventory-foundation
    provides: IngredientRow swipe-to-toggle component with deferred-commit undo grace period (D-08, D-10)
provides:
  - Flicker-free optimistic display across the toggle's async commit round-trip (WR-01 closed)
  - Unmount flush of a still-undoable pending toggle instead of silent discard (WR-02 closed)
affects: [barback, ingredient-inventory]

actuals:
  tokens: 1198
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Ref-mirrored state for effect cleanups with empty deps arrays (avoids stale closures in unmount handlers)"
    - "Separate 'display value' state (pending) from 'is still reversible' state (canUndo) instead of overloading one flag for both concerns"

key-files:
  created: []
  modified:
    - apps/barback/src/components/IngredientRow.tsx

key-decisions:
  - "Kept pending as the sole display-value source of truth; canUndo only gates Undo-button visibility and whether unmount should flush — this avoids introducing a third state variable for what is really two independent booleans (what to show vs. can it still be reversed)"
  - "Used refs updated via a deps-less useEffect (runs every render) rather than adding pending/canUndo/ingredient.id/onCommitToggle to the unmount effect's own deps array, since re-running that effect on every change would re-attach/detach the cleanup itself"

requirements-completed: []

coverage:
  - id: D1
    description: "WR-01: pending display value survives the async commit round-trip (no flicker back to stale ingredient.inStock)"
    requirement: null
    verification:
      - kind: unit
        ref: "No test suite exists for this component (IN-02, tracked separately) — verified via tsc --noEmit and vite build only"
        status: pass
    human_judgment: true
    rationale: "Visual flicker timing during an async round-trip is a UX property that automated typecheck/build cannot observe; needs a manual swipe-and-watch pass per the plan's <verification> section."
  - id: D2
    description: "WR-02: a pending toggle that unmounts mid-grace-period is committed via onCommitToggle, not discarded"
    requirement: null
    verification:
      - kind: unit
        ref: "No test suite exists for this component (IN-02, tracked separately) — verified via tsc --noEmit and vite build only"
        status: pass
    human_judgment: true
    rationale: "Confirming the server value actually changed after unmount requires manually filtering a swiped row out of view and re-checking/refreshing, per the plan's <verification> section."

duration: 8min
completed: 2026-08-10
status: complete
---

# Quick Task 260810-g1w: Fix WR-01/WR-02 swipe-toggle race conditions Summary

**Reworked `IngredientRow`'s optimistic-update state so `pending` survives the async commit round-trip (no stale-value flicker) and unmount flushes a still-undoable toggle via `onCommitToggle` instead of discarding it, by splitting "what to display" from "is it still reversible" into two separate state variables.**

## Performance

- **Duration:** 8 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- WR-01 closed: added a `canUndo` state separate from `pending`; the toggle's grace-period timer callback now flips `canUndo` to `false` instead of clearing `pending`, so the optimistic value keeps rendering through the mutation's async round-trip. A new effect watching `[canUndo, pending, ingredient.inStock]` clears `pending` only once the server-sourced prop actually catches up.
- WR-02 closed: added four refs (`pendingRef`, `canUndoRef`, `ingredientIdRef`, `onCommitToggleRef`) kept current via a deps-less `useEffect`, so the unmount cleanup effect (frozen closure, empty deps array) can read the latest pending toggle and flush it through `onCommitToggle` on unmount instead of silently dropping it.
- Undo button visibility switched from `pending !== null` to `canUndo`, so it now disappears exactly when the grace period elapses rather than when the display value eventually clears.
- Updated the stale comments the code review flagged (unmount effect's block comment, `startToggle`'s timeout-callback comment) to describe the new flush-on-unmount and keep-pending-through-commit behavior.

## Task Commits

1. **Task: Fix WR-01 (commit-window flicker) and WR-02 (silent-discard-on-unmount) in IngredientRow** - `ec01784` (fix)

**Plan metadata:** committed separately by the orchestrator (docs commit, not part of this SUMMARY's task commits).

## Files Created/Modified
- `apps/barback/src/components/IngredientRow.tsx` - Added `canUndo` state, ref-backed unmount flush, and `ingredient.inStock` catch-up effect; changed Undo button guard from `pending !== null` to `canUndo`

## Decisions Made
- Kept `pending` as the sole display-value source of truth and added `canUndo` purely as a "still reversible" flag, rather than trying to derive both properties from one variable — this matches the plan's explicit design and keeps the render logic (`displayedInStock = pending ?? ingredient.inStock`) unchanged.
- Used a deps-less `useEffect` (runs after every render) to keep four refs current, rather than adding those values to the unmount effect's dependency array — an empty dependency array is required so the cleanup only fires on actual unmount, not on every state change.

## Deviations from Plan

None - plan executed exactly as written. One pre-existing, out-of-scope build-order issue was encountered and worked around without modifying any file (see Issues Encountered below).

## Issues Encountered
- `pnpm --filter barback exec tsc --noEmit` initially failed with `Cannot find module '@my-bar/shared'` across multiple files (not just the one touched here) — this is a pre-existing monorepo build-order issue: `packages/shared` has no `dist/` output because it had not yet been built in this workspace checkout, unrelated to this task's change. Ran `pnpm --filter @my-bar/shared build` first (a read-only build step, no source files modified) and both `tsc --noEmit` and `pnpm --filter barback build` then passed clean. No files were changed to work around this.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both WR-01 and WR-02 review findings from `01-REVIEW.md` are closed; no blockers introduced for phase 01 continuation.
- Manual UAT swipe-test (per this plan's `<verification>` section) is still recommended before considering the interaction fully verified, since no component test suite exists yet (tracked as review finding IN-02).

## Self-Check: PASSED
- FOUND: apps/barback/src/components/IngredientRow.tsx (canUndo state, ref-backed unmount flush, catch-up effect present)
- FOUND: ec01784 (commit exists in git log)
- FOUND: `pnpm --filter barback exec tsc --noEmit` exits 0
- FOUND: `pnpm --filter barback build` exits 0

---
*Quick task: 260810-g1w-fix-wr-01-wr-02-swipe-toggle-race-condit*
*Completed: 2026-08-10*
