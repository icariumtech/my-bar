---
phase: quick
plan: 260818-uz8
subsystem: ui
tags: [react, antd, bartender, orders, tanstack-query]

# Dependency graph
requires:
  - phase: 04-bartender-console-order-workflow
    provides: OrdersTab.tsx, RecipesTab.tsx, MakeableStatusBadge.tsx, batchOrders/formatElapsed, D-60 done-order retention window
provides:
  - "OrdersTab visibleBatches filter that excludes status==='done' batches from the rendered Orders list (fixes the 'Done doesn't clear it' bug)"
  - "OrdersTab and RecipesTab redesigned onto antd Card list items matching apps/barback's dark bar-surface row convention"
  - "Ingredient-names line (ingredientName-preferred-over-categoryName, comma-joined) on every Orders card and every Recipes card"
  - "MakeableStatusBadge now shown on every Orders card (previously only shown in RecipeOrOrderDetail)"
affects: [bartender-console-order-workflow, ui-polish]

# Actuals (#2632)
actuals:
  tokens: 2900
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "antd Card (hoverable, styles={{ body: { padding: 16 } }}) as the dark-theme row convention for tappable list items, replacing List/List.Item in Bartender's Orders and Recipes tabs"
    - "Client-side status filtering (visibleBatches) applied on top of a server response that intentionally retains 'done' records for a bounded window — the filter, not the retention window, decides what's shown"

key-files:
  created: []
  modified:
    - apps/bartender/src/components/OrdersTab.tsx
    - apps/bartender/src/components/OrdersTab.test.tsx
    - apps/bartender/src/components/RecipesTab.tsx
    - apps/bartender/src/components/RecipesTab.test.tsx

key-decisions:
  - "Root-caused the Done-clearing bug to a missing client-side status filter, not a server/invalidation defect — server's D-60 5-minute retention window in GET /api/orders is correct and unchanged; OrdersTab now applies the same new/in_progress-only exclusion App.tsx's openOrderCount badge already used"
  - "Reused Bartender's existing ing.ingredientName ?? ing.categoryName fallback convention (from RecipeOrOrderDetail.tsx) for the new ingredient-names lines, not Patron's category-only convention"

patterns-established:
  - "Card-based tappable rows (hoverable, cursor:pointer, body padding 16) as Bartender's row convention going forward, matching apps/barback's dark bar-surface look with zero extra theme token overrides needed"

requirements-completed: []

coverage:
  - id: D1
    description: "Marking an order Done in the Bartender Orders tab removes it from the rendered Orders list immediately, even though the server's D-60 retention window still returns it for up to 5 minutes"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx#excludes a 'done' batch from the rendered list even though useOrders still returns it (D-60 retention window)"
        status: pass
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx#renders the empty state when every returned order is status \"done\""
        status: pass
    human_judgment: false
  - id: D2
    description: "Both OrdersTab and RecipesTab render as antd Card list items matching apps/barback's dark bar-surface row convention"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx (full suite, Card-based render assertions)"
        status: pass
      - kind: unit
        ref: "apps/bartender/src/components/RecipesTab.test.tsx (full suite, Card-based render assertions)"
        status: pass
    human_judgment: true
    rationale: "Visual match to apps/barback's row convention (rounded corners, bg-bar-surface-equivalent background, touch target) is a design-fidelity judgment call that unit tests can't fully prove — worth a quick eyeball in the running app."
  - id: D3
    description: "Every card on both tabs shows the recipe's ingredient names (ingredientName preferred over categoryName, comma-joined, no quantities)"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx#renders comma-joined ingredient names on each card, preferring ingredientName over categoryName"
        status: pass
      - kind: unit
        ref: "apps/bartender/src/components/RecipesTab.test.tsx#renders comma-joined ingredient names on each card, preferring ingredientName over categoryName"
        status: pass
    human_judgment: false
  - id: D4
    description: "No functional regression: tap-to-navigate, order batching/×N/elapsed-time, auto-advance-on-open, RecipesTab's badge/Search & Filter, and all list/detail/filter view-state transitions still work"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx (full suite — 25 tests)"
        status: pass
      - kind: unit
        ref: "apps/bartender/src/components/RecipesTab.test.tsx (full suite — 6 tests)"
        status: pass
      - kind: other
        ref: "pnpm --filter bartender build (tsc --noEmit + vite build)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-19
status: complete
---

# Quick Task 260818-uz8: Fix Bartender Order Done-Clearing Bug + Card Redesign Summary

**Fixed the root-cause client-side status filter that made "Done" orders keep rendering in Bartender's Orders list, and redesigned both Orders and Recipes tabs onto antd Card rows with ingredient names.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- `OrdersTab.tsx` now computes `visibleBatches` (batches filtered to exclude `status === 'done'`), so a just-completed order stops rendering as an active row the instant the mutation settles — even though the server's D-60 5-minute retention window legitimately still returns it from `GET /api/orders`.
- `OrdersTab.tsx` redesigned from antd `List`/`List.Item` onto `Card` items matching `apps/barback`'s dark bar-surface row convention; each card now also shows a `MakeableStatusBadge` (not previously shown in the Orders list) and a comma-joined ingredient-names line.
- `RecipesTab.tsx` redesigned the same way — `Card` items with recipe name, `MakeableStatusBadge`, and ingredient names; Search & Filter, sticky header, and both empty states untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix root cause — OrdersTab must not render 'done' batches as active orders** - `0e6bfc0` (fix)
2. **Task 2: Redesign OrdersTab onto antd Card list items with ingredient names** - `9988609` (feat)
3. **Task 3: Redesign RecipesTab onto antd Card list items with ingredient names** - `7899298` (feat)

**Plan metadata:** committed separately by the orchestrator (docs commit)

## Files Created/Modified
- `apps/bartender/src/components/OrdersTab.tsx` - `visibleBatches` status filter (bug fix); Card-based rendering with MakeableStatusBadge and ingredient names
- `apps/bartender/src/components/OrdersTab.test.tsx` - new tests for done-batch exclusion, all-done empty state, new/in_progress-same-recipe regression guard, ingredient names, badge
- `apps/bartender/src/components/RecipesTab.tsx` - Card-based rendering with ingredient names
- `apps/bartender/src/components/RecipesTab.test.tsx` - new test for ingredient names; extended fixtures with non-empty `ingredients`

## Decisions Made
- Root cause confirmed by reading `apps/server/src/routes/orders.ts`, its test file, `useMarkOrderDone.ts`, and `socket.ts` — all already correct. The defect was purely `OrdersTab.tsx` rendering every batch `useOrders()` returned with no status filter, so the server's D-60 retention window (a deliberate 5-minute grace period) looked like a bug to bartenders. Fixed by mirroring `App.tsx`'s `openOrderCount` new/in_progress-only exclusion at the list level.
- Kept `batchOrders()`'s pure grouping/sorting contract unchanged — the filter was applied on top of its output (`batchOrders(rawOrders).filter(...)`), not inside it, so `batchOrders`'s own test block needed zero changes.
- Reused `RecipeOrOrderDetail.tsx`'s existing `ing.ingredientName ?? ing.categoryName` fallback convention for the new ingredient-names lines (Bartender-specific — Patron only shows category names since it doesn't expose specific-bottle detail).

## Deviations from Plan

None - plan executed exactly as written. To keep task commits atomic and each independently green, Task 1's and Task 2's edits (which the plan describes together) were staged and committed separately: Task 1's commit contains only the `visibleBatches` filter fix; Task 2's commit contains only the Card/MakeableStatusBadge/ingredient-names redesign on top of it — matching the plan's own task boundaries.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Bartender's Orders tab now correctly clears Done orders on the very next render; both Orders and Recipes tabs share a consistent Card-based visual language with `apps/barback`.
- Manual sanity check (per plan's verification step 5, optional/non-blocking) not performed in this session — recommended before next UI-facing change to Bartender: run `pnpm dev`, mark an order Done from a second Patron tab, confirm it disappears immediately, and eyeball both tabs' Card styling against `apps/barback`.

---
*Phase: quick*
*Completed: 2026-08-19*

## Self-Check: PASSED

All 5 files (4 modified source/test files + this SUMMARY.md) and all 3 task commit hashes (`0e6bfc0`, `9988609`, `7899298`) verified present.
