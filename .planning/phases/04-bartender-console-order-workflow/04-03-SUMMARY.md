---
phase: 04-bartender-console-order-workflow
plan: 03
subsystem: api
tags: [fastify, drizzle, sqlite, socket.io, zod, vitest]

requires:
  - phase: 04-bartender-console-order-workflow
    provides: "Plan 04-01's orders table, shared Order contract, POST/GET /api/orders, and the registered orders:created Socket.IO handler this plan's PATCH routes reuse (loadOrder helper, app.io?.emit pattern)"
provides:
  - "PATCH /api/orders/:id/start — idempotent new -> in_progress transition"
  - "PATCH /api/orders/:id/done — idempotent any-non-done -> done transition, never touches inventory"
  - "orders:updated Socket.IO broadcast, real-fired for the first time (Plan 04-01's handler had nothing to emit it until now)"
  - "GET /api/orders 5-minute done-order retention window (DONE_RETENTION_MS)"
affects: [04-04-orders-batching-done]

actuals:
  tokens: 4598
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Conditional-write idempotency: a PATCH handler only writes when the existing row's status differs from the target, making a repeat call a true no-op (no updatedAt bump) rather than an early-return-before-emit — the Socket.IO emit still fires unconditionally so a re-fetch is always harmless"
    - "Inclusive time-window filtering via drizzle's gte() against a Date computed once per request (Date.now() - WINDOW_MS), combined with or()/and() to extend an existing status filter without altering its original unconditional branch"

key-files:
  created: []
  modified:
    - apps/server/src/routes/orders.ts
    - apps/server/src/routes/orders.test.ts

key-decisions:
  - "Updated Plan 04-01's pre-existing 'GET /api/orders excludes done orders' test to use a stale (>5min) done order instead of a done-order-created-now — this plan's own D-60 must-have makes a freshly-done order correctly INCLUDED, so the original test's premise (done orders are unconditionally excluded) no longer holds after this plan lands (Rule 1 fix, not a plan deviation in scope, just an inherited assertion that needed updating for the new intentional behavior)."

patterns-established:
  - "Conditional-write idempotency for status-transition PATCH endpoints (see tech-stack.patterns)"

requirements-completed: [BART-03, BART-04, SYNC-02]

coverage:
  - id: D1
    description: "PATCH /api/orders/:id/start transitions new -> in_progress, is idempotent (no-op, no regression) on already-in_progress or already-done orders, and emits orders:updated"
    requirement: BART-03
    verification:
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#PATCH /api/orders/:id/start transitions new -> in_progress and is idempotent on a repeat call"
        status: pass
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#PATCH /api/orders/:id/done transitions to done; a later /start call never regresses it back to in_progress"
        status: pass
    human_judgment: false
  - id: D2
    description: "PATCH /api/orders/:id/done transitions any non-done status to done, is idempotent (updatedAt untouched on repeat), never writes to the ingredients table, and emits orders:updated"
    requirement: BART-03
    verification:
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#PATCH /api/orders/:id/done a second time on an already-done order leaves updatedAt unchanged"
        status: pass
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#PATCH /api/orders/:id/done never modifies ingredient stock"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both PATCH endpoints return 404 { error } for an unknown order id and accept no request body"
    requirement: BART-03
    verification:
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#PATCH /:id/start and /:id/done both return 404 { error } for an unknown order id"
        status: pass
    human_judgment: false
  - id: D4
    description: "Both PATCH endpoints broadcast a real Socket.IO orders:updated event with { orderId } to connected clients (SYNC-02) — the handler registered in Plan 04-01 fires for real for the first time"
    requirement: SYNC-02
    verification:
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#emits orders:updated with { orderId } after a successful PATCH /api/orders/:id/start"
        status: pass
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#emits orders:updated with { orderId } after a successful PATCH /api/orders/:id/done"
        status: pass
    human_judgment: false
  - id: D5
    description: "GET /api/orders extends the ne(status,'done') filter with a 5-minute inclusive retention window for done orders (4:59 included, 5:00 included, 5:01 excluded), non-done orders unconditionally included"
    requirement: BART-04
    verification:
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#GET /api/orders includes a done order updated 4 minutes ago (within the retention window)"
        status: pass
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#GET /api/orders includes a done order updated exactly 5 minutes ago (inclusive boundary)"
        status: pass
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#GET /api/orders excludes a done order updated 5 minutes and 1 second ago (past the boundary)"
        status: pass
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts#GET /api/orders returns new/in_progress/recently-done orders but excludes a stale-done order"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 3: Order Lifecycle Summary

**Two idempotent PATCH routes (`/api/orders/:id/start`, `/api/orders/:id/done`) close BART-03's new -> in_progress -> done lifecycle, both broadcasting a real `orders:updated` Socket.IO event for the first time, plus a D-60 5-minute inclusive retention window on `GET /api/orders` so a just-completed order briefly stays visible instead of vanishing instantly or accumulating forever.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-18T22:00:04Z
- **Completed:** 2026-08-18T22:01:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `PATCH /api/orders/:id/start` — transitions `new` -> `in_progress` via a conditional write (`existing.status === 'new'`); a repeat call on an already-`in_progress` or already-`done` order is a true no-op (no `updatedAt` bump, no regression of a `done` order back to `in_progress`)
- `PATCH /api/orders/:id/done` — transitions any non-`done` status to `done` via a conditional write (`existing.status !== 'done'`); a repeat call on an already-`done` order leaves `updatedAt` untouched, so the D-60 retention clock never restarts; directly verified to never write to the `ingredients` table (T-04-10)
- Both endpoints emit `app.io?.emit('orders:updated', { orderId })` unconditionally (even on a no-op call) and return `404 { error: 'Order not found' }` for an unknown id — proven with real-listening-server Socket.IO integration tests (mirrors the existing `orders:created` pattern), not `.inject()`
- `GET /api/orders` extended with `DONE_RETENTION_MS = 5 * 60 * 1000`: a `done` order stays visible while `now - updatedAt <= 5 minutes` (inclusive `gte`), then is excluded — proven at the exact boundary (4:59 included, 5:00 included, 5:01 excluded) using directly-inserted rows with controlled timestamps, not real-time sleeps

## Task Commits

Each task was committed atomically (TDD RED/GREEN pairs):

1. **Task 1: PATCH /:id/start + PATCH /:id/done — idempotent status transitions**
   - `8a70afa` test(04-03): add failing tests for PATCH /:id/start, /:id/done, and retention window
   - `afb0e2d` feat(04-03): PATCH /:id/start and /:id/done idempotent status transitions
2. **Task 2: GET /api/orders — bounded 5-minute done-order retention window**
   - (RED tests were combined into the single `8a70afa` commit above along with Task 1's RED tests, since both tasks share one test file and were written together for efficiency)
   - `bc59a69` feat(04-03): 5-minute done-order retention window on GET /api/orders

**Plan metadata:** (this commit)

_Note: Both tasks are `type="tdd"`; a single combined RED commit precedes both GREEN commits in git log, still satisfying the "test commit precedes feat commit" gate for each task's changes._

## Files Created/Modified
- `apps/server/src/routes/orders.ts` — added `DONE_RETENTION_MS` constant, `PATCH /:id/start`, `PATCH /:id/done`, extended `GET /`'s filter with the retention window
- `apps/server/src/routes/orders.test.ts` — 9 new test cases (idempotency x2, repeat-Done updatedAt-unchanged, 404 x1 covering both endpoints, stock-untouched, 2 real-socket `orders:updated` tests, retention boundary x3) plus one pre-existing test updated (see Decisions)

## Decisions Made
- Updated Plan 04-01's pre-existing "GET /api/orders excludes done orders" test to seed a stale (>5min old) done order instead of a done order created "now" — this plan's own D-60 must-have makes a freshly-done order correctly appear in `GET /api/orders`, so the original assertion (done orders are unconditionally excluded) is no longer true after this plan lands. This is an intentional, plan-specified behavior change, not a regression.

## Deviations from Plan

None beyond the test-update decision documented above (which is expected fallout of the plan's own intentional GET / behavior change, not an unplanned deviation).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `PATCH /:id/start`, `PATCH /:id/done`, and the `orders:updated` broadcast are stable interfaces Plan 04-04 builds against (Done button, order-batching, auto-advance-on-open UI) without further server-side changes
- Full server test suite (117 tests, 8 files) and `tsc --noEmit` both pass clean — zero regressions across Plan 04-01's original order routes and every other route file
- `pnpm -F @my-bar/server build` passes

---
*Phase: 04-bartender-console-order-workflow*
*Completed: 2026-08-18*

## Self-Check: PASSED
