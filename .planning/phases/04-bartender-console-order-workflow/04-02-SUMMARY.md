---
phase: 04-bartender-console-order-workflow
plan: 02
subsystem: ui
tags: [react, antd, tanstack-query, vite, bartender]

requires:
  - phase: 04-bartender-console-order-workflow (plan 01)
    provides: apps/bartender scaffold (Vite/React 19/antd darkAlgorithm), OrdersTab, useOrders.ts, formatElapsed
  - phase: 03-patron-browse-experience
    provides: tag taxonomy (TAG_GROUP_ORDER, TagGroup), TagRail's pure-function-ahead-of-component convention
  - phase: 02.1-recipe-ui-cleanup
    provides: tri-state makeable model (green/yellow/red), Barback's RecipeDetailView/MakeableStatusBadge as the direct template
provides:
  - BottomTabBar — Recipes/Orders two-tab navigation with a live open-order-count Badge (D-55)
  - RecipesTab — full recipe catalog list/filter/detail view state machine, read-only lookup surface
  - RecipeSearchFilter — full-screen name+tag AND/OR filter overlay (D-62), exported filterRecipes pure function
  - MakeableStatusBadge — full tri-state badge (green/yellow/red, D-63)
  - RecipeOrOrderDetail — shared recipe/order detail view with conditional Done button (D-56/D-57)
  - useRecipes.ts/useTags.ts — Bartender's read-only recipe/tag data hooks
affects: [04-03-order-lifecycle, 04-04-orders-batching-done]

actuals:
  tokens: 11187
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Per-app component duplication over cross-app import — Bartender's MakeableStatusBadge is an independent copy of Barback's, not a shared import, matching this monorepo's existing convention that small UI components are duplicated per-app rather than extracted into a shared React library"
    - "Placeholder-then-TDD component sequencing within a single plan — when Task N's production code must import a component Task N+1 owns, create a minimal real placeholder file in Task N (Rule 3 blocking-fix) rather than mocking a non-existent path, since this project's Vite/Vitest setup requires vi.mock targets to physically resolve on disk"

key-files:
  created:
    - apps/bartender/src/api/useRecipes.ts
    - apps/bartender/src/api/useTags.ts
    - apps/bartender/src/components/BottomTabBar.tsx
    - apps/bartender/src/components/BottomTabBar.test.tsx
    - apps/bartender/src/components/RecipesTab.tsx
    - apps/bartender/src/components/RecipesTab.test.tsx
    - apps/bartender/src/components/RecipeSearchFilter.tsx
    - apps/bartender/src/components/RecipeSearchFilter.test.tsx
    - apps/bartender/src/components/MakeableStatusBadge.tsx
    - apps/bartender/src/components/MakeableStatusBadge.test.tsx
    - apps/bartender/src/components/RecipeOrOrderDetail.tsx
    - apps/bartender/src/components/RecipeOrOrderDetail.test.tsx
  modified:
    - apps/bartender/src/App.tsx

key-decisions:
  - "Created minimal real placeholder implementations of MakeableStatusBadge/RecipeSearchFilter/RecipeOrOrderDetail during Task 1 (Rule 3 — blocking, missing referenced file), since Task 1's RecipesTab.tsx imports all three but Task 2 owns their full implementation; verified empirically that this project's Vite/Vitest setup cannot vi.mock an import path that doesn't resolve to a file on disk, so mocking alone (the plan's stated alternative) was insufficient without the placeholders existing first"
  - "Fixed a self-authored double-'ago' bug in RecipeOrOrderDetail's order caption (formatElapsed already returns '1m ago'; the template literal was appending a second ' ago') — caught immediately by the RED test before the feat commit"

requirements-completed: [BART-01, BART-05, BART-06]

coverage:
  - id: D1
    description: "BottomTabBar: two-tab (Recipes/Orders) navigation with a live open-order-count badge counting 'new'+'in_progress' only, never 'done' (D-55)"
    requirement: BART-01
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/BottomTabBar.test.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "RecipesTab: fetch/loading/error+retry/empty/populated states, tap-to-detail and tap-to-filter navigation, read-only (no add/edit/delete affordance anywhere)"
    requirement: BART-01
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/RecipesTab.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "MakeableStatusBadge: full tri-state (green 'Ready to make' / yellow 'Substitution needed' / red 'Missing ingredients') — all three reachable, unlike Patron's 2-state collapse (D-63)"
    requirement: BART-06
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/MakeableStatusBadge.test.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "RecipeSearchFilter: filterRecipes name-substring + per-group-OR/cross-group-AND tag combination logic, full-screen name+tag picker overlay with Clear/Apply/Back (D-62)"
    requirement: BART-05
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/RecipeSearchFilter.test.tsx"
        status: pass
    human_judgment: false
  - id: D5
    description: "RecipeOrOrderDetail: full recipe field rendering (ingredients using ingredientName when locked else categoryName, method, glassware/garnish asymmetric fallback) plus tri-state badge, red/yellow hint sentences, and order-only elapsed-time caption + conditional Done button (D-56/D-57)"
    requirement: BART-06
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/RecipeOrOrderDetail.test.tsx"
        status: pass
    human_judgment: false
  - id: D6
    description: "Recipe list rendering at >100 items on the Echo Show 8's ~8-inch screen relies on antd List's own scroll behavior — no automated test proves smooth scroll at that scale"
    verification: []
    human_judgment: true
    rationale: "UI-SPEC's own flagged backstop item — antd List virtualization/scroll performance at real device scale cannot be proven by jsdom/Vitest; requires a real Echo Show 8 device pass, deferred to phase-level UAT per this project's human_verify_mode: end-of-phase config."

duration: 16min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 2: Bartender Recipes Tab Summary

**Real two-tab Bartender shell (BottomTabBar + RecipesTab) with full tri-state MakeableStatusBadge, a name+tag AND/OR RecipeSearchFilter, and the shared RecipeOrOrderDetail view with a conditional Done button — BART-01/BART-05/BART-06's complete lookup surface.**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-18T18:00:00Z
- **Completed:** 2026-08-18T18:16:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- `apps/bartender/src/api/useRecipes.ts`/`useTags.ts`: read-only hooks mirroring Patron's/Barback's existing shape (`staleTime: Infinity` for recipes, plain fetch for tags)
- `BottomTabBar`: two tabs (Recipes/Orders) with a live antd `Badge` on the Orders tab counting only `'new'`+`'in_progress'` orders (never `'done'`), no-op-on-active-tap guard matching Barback's convention
- `RecipesTab`: `'list' | 'filter' | 'detail'` view state machine, sticky search/filter button, loading spinner, "Failed to load recipes. Check your connection." + Retry error state, "No recipes match your search" empty state (reused for both true-zero and filtered-to-zero), per-row `MakeableStatusBadge`
- `App.tsx` rewired from 04-01's tracer-minimal single view to the full two-tab shell (`RecipesTab`/`OrdersTab` + `BottomTabBar`, `openOrderCount` derived from `useOrders()`)
- `MakeableStatusBadge`: full tri-state (green/yellow/red all reachable) — a second, independent copy of Barback's own component, per this monorepo's per-app-duplication convention
- `RecipeSearchFilter`: exported `filterRecipes(recipes, nameQuery, selectedTagIdsByGroup)` pure function (case-insensitive trimmed name substring AND, tags OR-within-group/AND-across-groups) plus a full-screen overlay with a name input, one expandable `antd Collapse` section per `TAG_GROUP_ORDER` group, and Clear/Apply/Back controls
- `RecipeOrOrderDetail`: full recipe rendering (tri-state badge, red missing-categories sentence, yellow per-line substitution sentences, ingredient lines showing the locked `ingredientName` when present else `categoryName`, ordered method steps, glassware "None specified" fallback, garnish omitted when null) plus the order-only elapsed-time caption ("Ordered {N}m ago" / "... for {patronName}") and conditional Done button (hidden when no `order` prop or `order.status === 'done'`)

## Task Commits

Each task was committed atomically (TDD RED/GREEN pairs):

1. **Task 1: BottomTabBar + RecipesTab + App.tsx rewire**
   - `a34d5da` test(04-02): add failing tests for BottomTabBar + RecipesTab two-tab shell
   - `1307ccf` feat(04-02): real two-tab shell — BottomTabBar, RecipesTab, App.tsx rewire
2. **Task 2: MakeableStatusBadge + RecipeSearchFilter + RecipeOrOrderDetail**
   - `00fe86a` test(04-02): add failing tests for MakeableStatusBadge, RecipeSearchFilter, RecipeOrOrderDetail
   - `b5d815d` feat(04-02): full MakeableStatusBadge, RecipeSearchFilter, RecipeOrOrderDetail

**Plan metadata:** (this commit)

## Files Created/Modified
- `apps/bartender/src/api/useRecipes.ts` - GET /api/recipes, cache key `['recipes']`, `staleTime: Infinity`
- `apps/bartender/src/api/useTags.ts` - GET /api/tags, read-only
- `apps/bartender/src/components/BottomTabBar.tsx` - Recipes/Orders tabs, live open-order-count Badge
- `apps/bartender/src/components/RecipesTab.tsx` - list/filter/detail view state machine, read-only lookup
- `apps/bartender/src/components/RecipeSearchFilter.tsx` - `filterRecipes` pure function + full-screen name+tag overlay
- `apps/bartender/src/components/MakeableStatusBadge.tsx` - full tri-state badge
- `apps/bartender/src/components/RecipeOrOrderDetail.tsx` - shared recipe/order detail view
- `apps/bartender/src/App.tsx` - full two-tab shell replacing 04-01's tracer-minimal body
- Five `.test.tsx` files pairing 1:1 with the components above

## Decisions Made
- Created minimal real placeholder implementations of `MakeableStatusBadge`/`RecipeSearchFilter`/`RecipeOrOrderDetail` as part of Task 1's GREEN commit (Rule 3 — blocking, missing referenced file), since Task 1's `RecipesTab.tsx` imports all three but Task 2 owns their full implementation. Verified empirically (a throwaway experiment file, since discarded) that this project's Vite/Vitest setup cannot `vi.mock` an import path that doesn't resolve to a real file on disk — the plan's own stated alternative ("mock RecipeOrOrderDetail and assert it received the tapped recipe as a prop") requires the mocked file to exist first. Task 2 then fully overwrote each placeholder with a real TDD-driven implementation, so the final state matches the plan's interfaces exactly.
- Fixed a self-authored bug during Task 2's RED phase: `RecipeOrOrderDetail`'s order caption template appended a second literal `" ago"` after `formatElapsed()`'s output, which already ends in `"ago"` (e.g. `formatElapsed(90)` returns `"1m ago"`), producing `"Ordered 1m ago ago"`. Caught by the RED test before the feat commit; fixed inline (Rule 1 — bug, own code, same task, no separate commit needed since it was pre-GREEN).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Placeholder stub components required for Task 1's build/tests**
- **Found during:** Task 1 (writing RecipesTab.tsx, which imports MakeableStatusBadge/RecipeSearchFilter/RecipeOrOrderDetail — all three owned by Task 2)
- **Issue:** The plan sequences RecipesTab (Task 1) importing three components Task 2 hasn't created yet, suggesting `vi.mock` in the test as the isolation mechanism. Empirically verified this Vite/Vitest setup throws "Failed to resolve import" for a mocked path that doesn't exist on disk, regardless of the mock factory — so Task 1's own acceptance criterion (`pnpm --filter bartender test -- BottomTabBar RecipesTab` passes) was unachievable without the imported files existing.
- **Fix:** Created minimal, real placeholder files for `MakeableStatusBadge.tsx`, `RecipeSearchFilter.tsx`, `RecipeOrOrderDetail.tsx` satisfying the exact prop interfaces already defined in the plan's `<interfaces>` section, committed as part of Task 1's `feat(04-02)` commit. Task 2 then fully replaced each with a real TDD-driven implementation.
- **Files modified:** apps/bartender/src/components/{MakeableStatusBadge,RecipeSearchFilter,RecipeOrOrderDetail}.tsx (placeholder in Task 1, fully implemented in Task 2)
- **Verification:** `pnpm --filter bartender test` passes at both Task 1 and Task 2 commit points; `pnpm --filter bartender build` passes at final state
- **Committed in:** 1307ccf (Task 1 feat commit, placeholders); b5d815d (Task 2 feat commit, full implementations)

**2. [Rule 1 - Bug] Double-"ago" typo in RecipeOrOrderDetail's order caption**
- **Found during:** Task 2 RED phase (writing the order-caption test before implementation)
- **Issue:** First implementation attempt appended `" ago"` after `formatElapsed(order.elapsedSeconds)`, which already returns a string ending in `"ago"` (e.g. `"1m ago"`), producing `"Ordered 1m ago ago"` instead of `"Ordered 1m ago"`.
- **Fix:** Removed the redundant literal `" ago"` from the template string.
- **Files modified:** apps/bartender/src/components/RecipeOrOrderDetail.tsx
- **Verification:** `pnpm --filter bartender test -- RecipeOrOrderDetail` passes both the no-patronName and with-patronName caption cases
- **Committed in:** b5d815d (Task 2 feat commit — caught and fixed before this commit, never landed broken)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were necessary for the plan's own tasks to build/pass as specified; no scope creep beyond the plan's own interface contracts.

## Issues Encountered
- Acceptance criterion `grep -c "'Substitution needed'" apps/bartender/src/components/MakeableStatusBadge.tsx` (quoted-string grep) returns 0, because the text renders as plain JSX children (`<Tag ...>Substitution needed</Tag>`), never wrapped in single quotes in source — the same is true of the plan's own explicit template, `apps/barback/src/components/MakeableStatusBadge.tsx` (also 0 against the same literal grep). The unquoted text is genuinely present (`grep -c "Substitution needed"` = 1) and is asserted directly by `MakeableStatusBadge.test.tsx`. Treated as a harmless grep-pattern imprecision in the plan's acceptance criteria, not a functional gap — code matches the plan's stated template exactly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `RecipeOrOrderDetail`'s `order`/`onMarkDone` props are fully wired and tested but have no real caller yet — Plan 04-04's `OrdersTab` is the first caller to pass a real `order` object and Done handler; RecipesTab's own call site correctly never passes those props (a recipe-only lookup has no order context).
- `filterRecipes` and `RecipeSearchFilter` are complete and self-contained; no further plan needs to touch them.
- **Outstanding backstop (D6 above, UI-SPEC's own flagged item):** recipe list rendering at >100 items on the real Echo Show 8's ~8" screen has no automated proof of smooth scroll/no-cutoff — deferred to phase-level UAT per `human_verify_mode: end-of-phase`.

---
*Phase: 04-bartender-console-order-workflow*
*Completed: 2026-08-18*

## Self-Check: PASSED

All 14 key files/tests verified present on disk. All 4 task commits (a34d5da, 1307ccf, 00fe86a, b5d815d) verified present in git log.
