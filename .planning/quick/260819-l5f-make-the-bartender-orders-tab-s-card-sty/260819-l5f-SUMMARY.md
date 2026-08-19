---
phase: quick
plan: 260819-l5f
subsystem: ui
tags: [react, antd, bartender, card, layout]

requires:
  - phase: quick-260818-uz8
    provides: OrdersTab/RecipesTab redesigned onto antd Card rows (the baseline this plan restructures)
provides:
  - OrdersTab card body row layout structurally aligned with RecipesTab (name+badge top row, ingredient-names last row byte-identical)
affects: [bartender-ui, orders-tab, recipes-tab]

actuals:
  tokens: 621
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Orders-only secondary metadata row (patronNames + elapsed time) uses `ml-auto` on the trailing span so it stays right-aligned whether or not the leading optional span is present — avoids `justify-between` collapsing to left-align when only one child renders."

key-files:
  created: []
  modified:
    - apps/bartender/src/components/OrdersTab.tsx

key-decisions:
  - "MakeableStatusBadge moved from its own standalone row onto the top row paired with the recipe name, matching RecipesTab's `flex justify-between items-center` top row exactly."
  - "Elapsed time and optional patronNames consolidated onto one new secondary row between the top row and the ingredient row, rather than each having its own row."
  - "Did not add an inline Done button to the list card — Done remains reachable only via tapping into RecipeOrOrderDetail, per explicit out-of-scope note in the plan."

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "OrdersTab card top row pairs recipe name (with ×N suffix) on the left with MakeableStatusBadge on the right, matching RecipesTab's top row structure/class exactly"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx — 'renders a MakeableStatusBadge reflecting the batch's recipe overallStatus', 'renders a ×N suffix only when a batch has count > 1'"
        status: pass
      - kind: other
        ref: "scratch RTL structural-parity check (not committed): asserted OrdersTab's row-1 div className === RecipesTab's row-1 div className when rendered with equivalent mock data"
        status: pass
    human_judgment: false
  - id: D2
    description: "Elapsed time + optional patronNames consolidated into a single Orders-only secondary row; ingredient-names row remains last and byte-identical to RecipesTab's"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx — 'renders each batch's recipe name, patronName, and formatted elapsed time', 'renders comma-joined ingredient names...'"
        status: pass
      - kind: other
        ref: "scratch RTL structural-parity check (not committed): asserted OrdersTab's last-row div className === RecipesTab's last-row div className, and both render identical ingredient text ('Bourbon')"
        status: pass
    human_judgment: false
  - id: D3
    description: "No functional regression: tap-to-open, auto-advance-on-open for 'new' batches, batching, and Done (via detail view) all still work exactly as before"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx — full suite (18 tests), including tap-to-open/auto-advance/onMarkDone tests, all passing unmodified"
        status: pass
    human_judgment: false
  - id: D4
    description: "Visual side-by-side confirmation that Orders and Recipes tab cards now read as one consistent visual system (the original checkpoint's human-verify intent)"
    verification: []
    human_judgment: true
    rationale: "No headless-browser tooling (chromium-cli, Playwright) was available in this environment to capture and compare live screenshots. Structural DOM parity (className/content equality between corresponding rows) was verified programmatically instead (see D1/D2), which proves the layout is now structurally identical, but a human eyeballing the actual rendered pixels/spacing/colors side-by-side has not occurred. A quick manual spot-check (`pnpm --filter bartender dev`, open Orders + Recipes tabs) is recommended before considering this fully closed."

duration: 12min
completed: 2026-08-19
status: complete
---

# Quick Task 260819-l5f: Bartender Orders Tab Card Restyle Summary

**Restructured OrdersTab's Card body into RecipesTab's three-row layout — name+badge top row, new consolidated Orders-only metadata row (elapsed time + patronNames), ingredient-names row last — resolving the visual inconsistency between the two tabs' cards.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-19T20:09:00Z
- **Completed:** 2026-08-19T20:21:22Z
- **Tasks:** 1 (Task 2 was a checkpoint, self-verified per autonomous-mode instructions — see below)
- **Files modified:** 1

## Accomplishments
- `MakeableStatusBadge` moved onto the top row, paired with the recipe name in a `flex justify-between items-center` div — now structurally identical to RecipesTab's top row.
- Elapsed time and the optional "For: ..." patronNames line consolidated into one new secondary metadata row (`flex items-center gap-sm`), with `ml-auto` on the elapsed-time span keeping it right-aligned regardless of whether patronNames is present.
- Ingredient-names row unchanged in markup/class, now the third (last) row, matching RecipesTab's ingredient row byte-for-byte.
- Outer `Card` props and list-container spacing untouched (already matched RecipesTab per prior quick task 260818-uz8).
- No inline Done button added to the card — Done remains reachable only via `RecipeOrOrderDetail`, as explicitly required by the plan.

## Task Commits

1. **Task 1: Restructure OrdersTab Card body to mirror RecipesTab's row layout** - `7b35303` (style)

**Plan metadata:** (pending — orchestrator commits SUMMARY.md/STATE.md separately)

## Files Created/Modified
- `apps/bartender/src/components/OrdersTab.tsx` - Card body JSX restructured into 3 rows (name+badge, secondary metadata, ingredients) mirroring RecipesTab

## Decisions Made
- Used `ml-auto` on the elapsed-time span in the new secondary row instead of `justify-between`, since `justify-between` would left-align the elapsed-time span when patronNames is absent (only one child in the flex row) — `ml-auto` guarantees right-alignment in both cases.
- No test-file changes were needed: every existing `OrdersTab.test.tsx` assertion queries by text content, not DOM position, so all 18 pre-existing tests passed unmodified against the restructured markup.

## Deviations from Plan

None - plan executed exactly as written for Task 1.

**Task 2 (checkpoint:human-verify) handling:** This session runs in autonomous/yolo mode per project config (`workflow.mode=yolo`), so per the orchestrator's explicit constraint, Task 2 was not left as a blocking interactive prompt. Self-verification performed instead:

- **Automated regression check:** Full `OrdersTab.test.tsx` suite (18 tests, including tap-to-open, auto-advance-on-open for 'new' batches, batch Done-mutation-count, and the D-60 done-exclusion filter) — all passing unmodified. Full `pnpm --filter bartender test` (77 tests across 11 files) and `pnpm --filter bartender build` (tsc --noEmit + vite build) both green.
- **Structural DOM parity check:** No headless-browser tooling (`chromium-cli`, Playwright, or similar) was available in this environment (checked `chromium-cli`, `npx playwright`, project `node_modules` — none installed/available without a fresh package download, which is out of scope for a quick styling task). As the documented fallback, wrote a throwaway RTL test (not committed) that rendered both `OrdersTab` and `RecipesTab` with equivalent mock data and asserted programmatically that the top-row `div` className and the ingredient-row (last row) `div`/`span` className are now identical between the two components, and that both render the same ingredient text. This test passed, confirming the two cards' row structure/classes are now structurally equivalent where the plan requires equivalence. The scratch test file was deleted after verification (not part of the committed change).
- **Not verified:** actual rendered pixels/visual side-by-side (colors, spacing as perceived on screen) — this requires a human or browser-screenshot tool this environment doesn't have. See `## Known Stubs` below.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs

None in the shipped code. One verification gap only: the plan's Task 2 human-verify checkpoint (visual side-by-side comparison of Orders vs. Recipes tab cards in a running browser) was not performed with an actual browser/screenshot due to no headless-browser tooling being available in this environment. Structural DOM-level parity was verified instead (see Deviations section above and coverage `D4`). **Recommended:** run `pnpm --filter bartender dev`, submit a test order from the Patron app, and eyeball the Orders/Recipes tabs side by side to confirm the visual result reads as intended — the structural check strongly suggests it will, but this is the one item a human should still glance at.

## Next Phase Readiness
- No blockers. OrdersTab and RecipesTab card structures are now aligned; future card-style changes to one should mirror the other per this plan's precedent.
- D4 (visual spot-check) is the only open item — low risk given the structural parity confirmed above, but flagged for the user's awareness.

---
*Phase: quick*
*Completed: 2026-08-19*

## Self-Check: PASSED

- FOUND: apps/bartender/src/components/OrdersTab.tsx
- FOUND: commit 7b35303
- FOUND: .planning/quick/260819-l5f-make-the-bartender-orders-tab-s-card-sty/260819-l5f-SUMMARY.md
