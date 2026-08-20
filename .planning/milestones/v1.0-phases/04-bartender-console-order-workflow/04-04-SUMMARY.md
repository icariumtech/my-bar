---
phase: 04-bartender-console-order-workflow
plan: 04
subsystem: ui
tags: [react, antd, tanstack-query, vite, bartender]

requires:
  - phase: 04-bartender-console-order-workflow
    provides: "Plan 04-02's RecipeOrOrderDetail shared detail view (order/onMarkDone prop contract, previously untested with a real caller); Plan 04-03's PATCH /:id/start and /:id/done endpoints"
provides:
  - "batchOrders() — groups the flat GET /api/orders response by (recipe.id, status) into count/patronNames/max-elapsedSeconds/orderIds batches, sorted oldest-first"
  - "useOpenOrder — PATCH /orders/:id/start mutation, invalidates ['orders'] onSettled"
  - "useMarkOrderDone — PATCH /orders/:id/done mutation, invalidates ['orders'] onSettled"
  - "OrdersTab fully wired: tap-to-open auto-advances a 'new' batch, tap-to-detail navigates into RecipeOrOrderDetail with a real order/onMarkDone pair, one Done tap clears every order in the batch"
affects: []

actuals:
  tokens: 5723
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Client-side order batching: reduce a flat array into a Record keyed by a composite (entityId:status) string, then Object.values().sort() with a stable secondary tiebreak — mirrors the server's own asc(id) secondary sort convention at equal primary-sort values"

key-files:
  created:
    - apps/bartender/src/api/useOpenOrder.ts
    - apps/bartender/src/api/useOpenOrder.test.tsx
    - apps/bartender/src/api/useMarkOrderDone.ts
    - apps/bartender/src/api/useMarkOrderDone.test.tsx
  modified:
    - apps/bartender/src/components/OrdersTab.tsx
    - apps/bartender/src/components/OrdersTab.test.tsx

key-decisions:
  - "useOpenOrder.test.tsx and useMarkOrderDone.test.tsx use a .tsx extension (plan's file list said .test.ts) — the QueryClientProvider JSX wrapper requires .tsx under this project's esbuild/Vite config, matching Plan 04-01's own established precedent (useSubmitOrder.test.tsx) and apps/barback/src/api/useIngredients.test.tsx."

requirements-completed: [BART-02, BART-03, BART-04]

coverage:
  - id: D1
    description: "batchOrders() groups identical pending orders by (recipe.id, status) into count/patronNames/max-elapsedSeconds/orderIds batches; never merges across statuses; empty input returns []; sorted descending by elapsedSeconds with a stable orderId tiebreak"
    requirement: BART-04
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx#batchOrders"
        status: pass
    human_judgment: false
  - id: D2
    description: "useOpenOrder: PATCH /orders/:id/start, invalidates ['orders'] onSettled on both success and failure"
    requirement: BART-03
    verification:
      - kind: unit
        ref: "apps/bartender/src/api/useOpenOrder.test.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Tapping a 'new'-status batch row auto-advances every order in it to 'in_progress' (D-57) before navigating to RecipeOrOrderDetail; tapping an already-'in_progress' batch skips the mutation entirely"
    requirement: BART-03
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx#OrdersTab"
        status: pass
    human_judgment: false
  - id: D4
    description: "useMarkOrderDone: PATCH /orders/:id/done, invalidates ['orders'] onSettled"
    requirement: BART-03
    verification:
      - kind: unit
        ref: "apps/bartender/src/api/useMarkOrderDone.test.tsx"
        status: pass
    human_judgment: false
  - id: D5
    description: "One Done tap on a batched order entry calls useMarkOrderDone.mutate once per orderId in that batch (D-58 — clears all of them at once), not once for the whole batch"
    requirement: BART-02
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx#OrdersTab opening a batch of 3 orders and invoking onMarkDone calls useMarkOrderDone.mutate once per orderId"
        status: pass
    human_judgment: false
  - id: D6
    description: "A very long patronNames join is truncated via CSS (max-width + text-overflow) with the full untruncated list available via a native title attribute — the visual truncation itself is not provable by an automated test, only that the full string is present in the DOM/title"
    verification: []
    human_judgment: true
    rationale: "UI-SPEC long-text backstop item — CSS truncation rendering cannot be proven by jsdom/Vitest; deferred to phase-level UAT per this project's human_verify_mode: end-of-phase config. Automated tests confirm the full comma-joined string is present in the title attribute."

duration: 15min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 4: Orders Batching & Done Wiring Summary

**Orders tab batching (`batchOrders()` groups identical pending orders by recipe+status), tap-to-open auto-advance to `in_progress`, and a batch-clearing Done button — the phase's final "receive, fulfill, clear" bartender workflow, closing BART-02/03/04's remaining UI surface.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-18T22:04:00Z
- **Completed:** 2026-08-18T22:19:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- `batchOrders(orders: Order[]): BatchedOrder[]` — reduces the flat `/api/orders` response into a `Record` keyed by `${recipe.id}:${status}`, aggregating `count`, `patronNames` (nulls excluded), the maximum `elapsedSeconds` across the group, and every member `orderId`; never merges across statuses (a `new` and an `in_progress` order for the same recipe stay two separate batches); sorted descending by `elapsedSeconds` with a stable `orderIds[0]` tiebreak mirroring `GET /api/orders`'s own `asc(id)` secondary sort
- `useOpenOrder` — `PATCH /orders/:id/start` mutation, `onSettled` invalidates `['orders']`
- `useMarkOrderDone` — `PATCH /orders/:id/done` mutation, `onSettled` invalidates `['orders']`
- `OrdersTab` rewritten: batch rows render a recipe name, a `×N` suffix only when `count > 1`, a title-truncated comma-joined `patronNames` list, and `formatElapsed(elapsedSeconds)`; tapping a `'new'`-status batch auto-advances every order in it (D-57) before navigating into `RecipeOrOrderDetail` with a real `order`/`onMarkDone` pair — the first real caller of that Plan 04-02 contract; tapping an `'in_progress'` batch skips the auto-advance mutation entirely
- The Done button inside `RecipeOrOrderDetail`, reached via an Orders-tab batch, now calls `useMarkOrderDone.mutate` once per individual `orderId` in the batch (D-58: "one Done button... clears all of them at once"), then returns to the list immediately without waiting for all N mutations to settle

## Task Commits

Each task was committed atomically (TDD RED/GREEN pairs):

1. **Task 1: batchOrders() + Orders tab batching UI + auto-advance-on-open**
   - `dc85ea1` test(04-04): add failing tests for batchOrders, useOpenOrder, and OrdersTab batching UI
   - `36e6553` feat(04-04): batchOrders() + Orders tab batching UI + auto-advance-on-open
2. **Task 2: useMarkOrderDone + wire the batch-clearing Done button**
   - `6ed1dca` test(04-04): add failing tests for useMarkOrderDone and batch-clearing Done wiring
   - `902d8b3` feat(04-04): useMarkOrderDone + wire the batch-clearing Done button

**Plan metadata:** (this commit)

## Files Created/Modified
- `apps/bartender/src/api/useOpenOrder.ts` - PATCH /orders/:id/start mutation
- `apps/bartender/src/api/useMarkOrderDone.ts` - PATCH /orders/:id/done mutation
- `apps/bartender/src/components/OrdersTab.tsx` - full rewrite: batchOrders(), tap-to-detail, auto-advance, Done wiring
- Corresponding `.test.tsx` files for all of the above

## Decisions Made
- `useOpenOrder.test.tsx` / `useMarkOrderDone.test.tsx` use `.test.tsx` (plan's file list said `.test.ts`) — the `QueryClientProvider` JSX wrapper requires `.tsx` under this project's Vite/esbuild config, matching the established precedent from Plan 04-01 (`useSubmitOrder.test.tsx`) and `apps/barback/src/api/useIngredients.test.tsx` (Rule 3 — blocking, trivial, no behavior change).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test file extension for mutation hook tests**
- **Found during:** Task 1 (writing `useOpenOrder.test.tsx`)
- **Issue:** Plan's file list specified `.test.ts`, but the `QueryClientProvider` wrapper needed for `renderHook` requires JSX, which plain `.ts` files fail to transform under this project's Vite/esbuild config.
- **Fix:** Used `.test.tsx` for both `useOpenOrder.test.tsx` and `useMarkOrderDone.test.tsx`, matching this codebase's own precedent.
- **Files modified:** apps/bartender/src/api/useOpenOrder.test.tsx, apps/bartender/src/api/useMarkOrderDone.test.tsx
- **Verification:** `pnpm --filter bartender test` passes
- **Committed in:** dc85ea1 (Task 1 test commit), 6ed1dca (Task 2 test commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Cosmetic file-extension fix only, matching existing project convention. No scope creep, no behavior change.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- This is the final plan in Phase 4. BART-02, BART-03, and BART-04 are now fully closed on the Bartender UI side: the Orders tab batches identical pending orders, opening one auto-advances it, and one Done action clears an entire batch.
- Full monorepo test suite verified green together after this plan: server 117/117, patron 67/67, bartender 65/65, barback 84/84 (`pnpm -r test`). All four apps' production builds pass (`pnpm --filter {server,patron,bartender,barback} build`).
- **Outstanding backstop (D6 above, UI-SPEC's own flagged item):** the visual CSS truncation of a long `patronNames` join has no automated proof of its rendered appearance — only that the full untruncated string is present via the `title` attribute. Deferred to phase-level UAT per `human_verify_mode: end-of-phase`.
- **Outstanding human-check inherited from Plan 04-01 (D5 there):** a real order submitted from a Patron device appearing live on a second Bartender device without a manual refresh still requires a real-device pass — this plan's automated coverage (unit tests + builds) does not re-prove that cross-device path, only the batching/Done UI built on top of it.

---
*Phase: 04-bartender-console-order-workflow*
*Completed: 2026-08-18*

## Self-Check: PASSED

All 6 key files verified present on disk. All 5 commits (dc85ea1, 36e6553, 6ed1dca, 902d8b3, 4f752ea) verified present in git log.
