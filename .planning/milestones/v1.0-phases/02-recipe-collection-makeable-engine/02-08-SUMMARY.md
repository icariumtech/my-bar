---
phase: 02-recipe-collection-makeable-engine
plan: 08
subsystem: api
tags: [tanstack-query, react-query, cache-invalidation, barback, gap-closure]

# Dependency graph
requires:
  - phase: 02-recipe-collection-makeable-engine
    provides: "['recipes'] query key (useRecipes) and the recipes list/detail's makeable badge, plus the useUpdateGlassware/useRenameCategory cross-entity-invalidation precedent this plan mirrors"
provides:
  - "useToggleStock invalidates ['recipes'] in onSettled, alongside the existing ['ingredients'] invalidation"
  - "useUpdateIngredient invalidates ['recipes'] in onSettled, alongside the existing ['ingredients']/['categories'] invalidation"
  - "Regression test (useIngredients.test.tsx) guarding both invalidation contracts"
affects: [03-patron-browse-experience]

# Actuals (#2632)
actuals:
  tokens: 1515
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cross-entity invalidation: any client mutation whose effect is read by a different query key's derived/joined data must invalidate both keys in onSettled (established by useUpdateGlassware/useRenameCategory, now applied consistently to useToggleStock/useUpdateIngredient)"
    - "Hook-level regression test pattern: renderHook + a fresh per-test QueryClient wrapped in QueryClientProvider, with vi.spyOn(queryClient, 'invalidateQueries') to assert exact queryKey arrays invalidated in onSettled"

key-files:
  created:
    - apps/barback/src/api/useIngredients.test.tsx
  modified:
    - apps/barback/src/api/useIngredients.ts

key-decisions:
  - "Fixed both useToggleStock (the actual repro path) and useUpdateIngredient (a latent gap flagged by the debug session but not reachable through the current edit form, which structurally cannot change stock per D-08) in the same plan, per the debug session's explicit recommendation to audit both while in the file"

patterns-established: []

requirements-completed: [MATCH-01]

coverage:
  - id: D1
    description: "useToggleStock invalidates ['recipes'] in onSettled, closing the stale-makeable-badge gap (G-02-9) after a swipe-toggle stock change"
    requirement: MATCH-01
    verification:
      - kind: unit
        ref: "apps/barback/src/api/useIngredients.test.tsx#useToggleStock invalidates both ['ingredients'] and ['recipes'] on settle"
        status: pass
    human_judgment: false
  - id: D2
    description: "useUpdateIngredient invalidates ['recipes'] in onSettled, alongside its existing ['ingredients']/['categories'] invalidation"
    requirement: MATCH-01
    verification:
      - kind: unit
        ref: "apps/barback/src/api/useIngredients.test.tsx#useUpdateIngredient invalidates ['ingredients'], ['categories'], AND ['recipes'] on settle"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-08-11
status: complete
---

# Phase 2 Plan 08: Recipes Cache Invalidation on Stock Change Summary

**Fixed the one outlier against the codebase's own established cross-entity-invalidation pattern: `useToggleStock`/`useUpdateIngredient` now invalidate `['recipes']` in `onSettled`, so the Recipes list/detail's makeable badge updates live after a Barback stock change instead of requiring a manual page reload.**

## Performance

- **Duration:** 8min
- **Completed:** 2026-08-11
- **Tasks:** 2/2 completed
- **Files modified:** 2

## Accomplishments
- `useToggleStock`'s `onSettled` now invalidates both `['ingredients']` and `['recipes']`, closing UAT gap G-02-9 (root cause: it was written in Phase 1 before `['recipes']` existed as a query key, and never revisited when Phase 2 added the recipes list's dependency on live ingredient stock)
- `useUpdateIngredient`'s `onSettled` now invalidates `['recipes']` too, alongside its existing `['ingredients']`/`['categories']` invalidation, closing the same latent gap flagged by the debug session
- Added `apps/barback/src/api/useIngredients.test.tsx` — a RED/GREEN regression guard (`renderHook` + spied `invalidateQueries`) that would have caught G-02-9 before it shipped, and now prevents recurrence

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): failing regression test for cross-entity invalidation** - `2ef205f` (test)
2. **Task 2 (GREEN): useToggleStock and useUpdateIngredient invalidate ['recipes']** - `67e6754` (feat)

_TDD cycle: RED confirmed both new assertions failed for exactly the missing-`['recipes']` reason (sibling `['ingredients']`/`['categories']` assertions passed) before GREEN was applied._

## Files Created/Modified
- `apps/barback/src/api/useIngredients.test.tsx` - New regression test file: two tests using `renderHook` + `QueryClientProvider` + a spied `invalidateQueries`, asserting the full set of query keys each mutation invalidates on settle
- `apps/barback/src/api/useIngredients.ts` - Added `queryClient.invalidateQueries({ queryKey: ['recipes'] })` to both `useToggleStock` and `useUpdateIngredient`'s `onSettled` callbacks, with updated comments explaining why (mirroring `useUpdateGlassware`'s comment style)

## Decisions Made
Fixed both `useToggleStock` (the mutation that actually reproduces the reported symptom — the swipe-toggle is the sole UI path that can change `inStock`) and `useUpdateIngredient` (a latent gap the debug session flagged as worth auditing while in the file, even though the current edit form structurally cannot change stock per D-08). Both are now consistent with the codebase's established `useUpdateGlassware`/`useRenameCategory` cross-entity-invalidation pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Implicit-any TypeScript error in the new test's spy callback**
- **Found during:** Task 2 (`pnpm -F @my-bar/barback build` verification step)
- **Issue:** `invalidatedQueryKeys`'s `.map((call) => ...)` callback parameter had no type annotation, triggering `TS7006: Parameter 'call' implicitly has an 'any' type` under the production typecheck (`tsc -p tsconfig.json --noEmit`, run as part of `vite build`) — vitest's test runner is more permissive than the strict production build config, so this didn't surface during Task 1's RED test run.
- **Fix:** Annotated the callback parameter as `call: unknown[]` (matching the actual shape of `vi.fn().mock.calls`, an array of argument-tuples).
- **Files modified:** `apps/barback/src/api/useIngredients.test.tsx`
- **Verification:** `pnpm -F @my-bar/barback build` now succeeds (typecheck + production bundle); `pnpm --filter @my-bar/barback test` still green (12/12)
- **Committed in:** `67e6754` (part of Task 2's commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1)
**Impact on plan:** Minor type-strictness fix required by the production build gate the plan's own `<verify>` step specifies; no scope creep, no behavior change to the mutations under test.

## Issues Encountered
None beyond the deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Phase 2 (Recipe Collection & Makeable Engine) is now fully closed — all UAT gaps (G-02-6, G-02-9) resolved. `pnpm --filter @my-bar/barback test` (12/12) and `pnpm -F @my-bar/server test` (67/67) both pass; `pnpm -F @my-bar/barback build` succeeds. Ready to resume UAT test 6's end-of-phase human-verify per `workflow.human_verify_mode: end-of-phase`, then proceed to Phase 3 (Patron Browse Experience).

---
*Phase: 02-recipe-collection-makeable-engine*
*Completed: 2026-08-11*

## Self-Check: PASSED

- FOUND: apps/barback/src/api/useIngredients.test.tsx
- FOUND: apps/barback/src/api/useIngredients.ts
- FOUND: commit 2ef205f (test)
- FOUND: commit 67e6754 (feat)
