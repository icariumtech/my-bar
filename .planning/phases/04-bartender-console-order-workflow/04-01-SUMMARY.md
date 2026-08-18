---
phase: 04-bartender-console-order-workflow
plan: 01
subsystem: api
tags: [fastify, drizzle, sqlite, socket.io, zod, react, tanstack-query, antd, vite]

requires:
  - phase: 03-patron-browse-experience
    provides: Patron RecipeDetail screen, Socket.IO push -> TanStack Query invalidation pattern (D-46/D-47), 2-state makeable collapse (D-42)
  - phase: 02.1-recipe-ui-cleanup
    provides: tri-state makeable model (green/yellow/red), computeMakeable()/loadRecipe() as the single source of truth for recipe status
provides:
  - orders table (id, recipeId FK restrict, patronName nullable, status enum, timestamps)
  - packages/shared/src/order.ts (orderInput, orderStatus, order/Order contracts)
  - POST/GET /api/orders with server-side makeable re-validation and orders:created Socket.IO broadcast
  - apps/bartender — new Vite/React/antd app scaffold with a live-updating OrdersTab
  - Patron RecipeDetail Order button + OrderPrompt "who's this for" flow
affects: [04-02-bartender-recipes-tab, 04-03-order-lifecycle, 04-04-orders-batching-done, 04-05-patron-kiosk-lockdown]

actuals:
  tokens: 15361
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Server-side makeable re-validation at the order write boundary (never trust client-cached status)"
    - "New Vite/React/antd workspace app scaffolded by mirroring an existing sibling app's file structure exactly"

key-files:
  created:
    - apps/server/src/routes/orders.ts
    - apps/server/src/routes/orders.test.ts
    - packages/shared/src/order.ts
    - apps/patron/src/components/OrderPrompt.tsx
    - apps/patron/src/components/OrderPrompt.test.tsx
    - apps/patron/src/api/useSubmitOrder.ts
    - apps/patron/src/api/useSubmitOrder.test.tsx
    - apps/bartender/package.json
    - apps/bartender/src/App.tsx
    - apps/bartender/src/main.tsx
    - apps/bartender/src/api/client.ts
    - apps/bartender/src/api/socket.ts
    - apps/bartender/src/api/socket.test.ts
    - apps/bartender/src/api/useOrders.ts
    - apps/bartender/src/components/OrdersTab.tsx
    - apps/bartender/src/components/OrdersTab.test.tsx
  modified:
    - apps/server/src/db/schema.ts
    - apps/server/src/db/test-helpers.ts
    - apps/server/src/routes/recipes.ts
    - apps/server/src/index.ts
    - packages/shared/src/index.ts
    - apps/patron/src/components/RecipeDetail.tsx
    - apps/patron/src/components/RecipeDetail.test.tsx
    - package.json

key-decisions:
  - "useSubmitOrder.test.tsx uses a .tsx extension (plan file list said .test.ts) — JSX (QueryClientProvider wrapper) requires .tsx under this project's esbuild config, matching the existing apps/barback/src/api/useIngredients.test.tsx precedent."

requirements-completed: [PATR-05, BART-02]

coverage:
  - id: D1
    description: "POST/GET /api/orders with server-side makeable re-validation (never trusts client state) and orders:created Socket.IO broadcast"
    requirement: PATR-05
    verification:
      - kind: integration
        ref: "apps/server/src/routes/orders.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "orders table pushed to the live dev database (data/my-bar.db), additive-only, existing tables/rows intact"
    verification:
      - kind: other
        ref: "pnpm -F @my-bar/server db:push + node better-sqlite3 verification script"
        status: pass
    human_judgment: false
  - id: D3
    description: "Patron RecipeDetail Order button (green-only), OrderPrompt 'who's this for' overlay, success confirmation + 3s auto-return, inline error + retry"
    requirement: PATR-05
    verification:
      - kind: unit
        ref: "apps/patron/src/components/OrderPrompt.test.tsx"
        status: pass
      - kind: unit
        ref: "apps/patron/src/api/useSubmitOrder.test.tsx"
        status: pass
      - kind: unit
        ref: "apps/patron/src/components/RecipeDetail.test.tsx"
        status: pass
    human_judgment: false
  - id: D4
    description: "apps/bartender new Vite/React/antd app scaffold with a live-updating OrdersTab (loading/error+retry/empty/populated states, formatElapsed) and Socket.IO orders:created/orders:updated/connect -> ['orders'] invalidation; served at /bartender/"
    requirement: BART-02
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/OrdersTab.test.tsx"
        status: pass
      - kind: unit
        ref: "apps/bartender/src/api/socket.test.ts"
        status: pass
      - kind: other
        ref: "pnpm --filter bartender build && pnpm --filter patron build && pnpm --filter server build"
        status: pass
    human_judgment: false
  - id: D5
    description: "A real order submitted from a Patron device appears live on a second Bartender device (/bartender/) without a manual refresh — the phase's core cross-device 'flows live' guarantee"
    requirement: BART-02
    verification: []
    human_judgment: true
    rationale: "Cross-device live Socket.IO delivery over the real LAN cannot be proven by an automated jsdom/Vitest run — requires a real-device pass per this plan's own <human-check> (04-VALIDATION.md Manual-Only Verifications table). human_verify_mode is end-of-phase for this project, so this is surfaced to the phase-level UAT rather than a mid-flight checkpoint."

duration: 25min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 1: Order Tracer Summary

**New `orders` table + POST/GET /api/orders with server-side makeable re-validation, a Socket.IO `orders:created` broadcast, a new `apps/bartender` Vite/React/antd app with a live-updating Orders queue, and Patron's Order button + "who's this for" prompt — the phase's riskiest cross-app integration proven end-to-end before any further Bartender UI is built.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-08-18T12:43:00Z
- **Completed:** 2026-08-18T13:08:00Z
- **Tasks:** 3
- **Files modified:** 31

## Accomplishments
- `orders` table (id, recipeId FK restrict, patronName nullable, status enum new/in_progress/done, timestamps) added to schema.ts and pushed to the live dev database — additive-only, all existing recipes/ingredients/categories/tags rows intact
- `packages/shared/src/order.ts`: `orderInput`/`OrderInput`, `orderStatus`/`OrderStatus`, `order`/`Order` (embeds the full joined `Recipe`) — single source of truth for the order shape across server/patron/bartender
- `POST /api/orders` recomputes `overallStatus` server-side via the exported `loadRecipe()`/`computeMakeable()` and rejects 400 when not green — the server never trusts a client-cached makeable state, closing the "item went out of stock between tap and submit" race
- `GET /api/orders` returns only non-`done` orders, sorted ascending by `createdAt` with `id` as a stable secondary tiebreaker
- Real-listening-server integration test (mirrors `hub.test.ts`) proves a real connected Socket.IO client receives `orders:created` with `{ orderId }` after a successful POST
- New `apps/bartender` app (Vite + React 19 + antd `darkAlgorithm`, D-64) scaffolded structurally identical to `apps/barback`, served at `/bartender/` by the Fastify server; its `OrdersTab` fetches `/api/orders` and live-refreshes via `orders:created`/`orders:updated`/`connect` Socket.IO handlers invalidating `['orders']`
- Patron's `RecipeDetail` gained a working Order button (green-only, D-49), an `OrderPrompt` "who's this for" overlay (D-50), a success confirmation that auto-returns to the browse grid after ~3s (D-51), and an inline retry-able error alert on failure (D-52)

## Task Commits

Each task was committed atomically (TDD RED/GREEN pairs):

1. **Task 1: orders schema + shared contract + POST/GET /api/orders**
   - `e963c7d` test(04-01): add failing test for POST/GET /api/orders
   - `49eed42` feat(04-01): orders schema, shared contract, POST/GET /api/orders
2. **Task 2: [BLOCKING] Push the orders table to the live dev database**
   - No code changes — `pnpm -F @my-bar/server db:push` applied against `apps/server/data/my-bar.db` (gitignored, no commit produced)
3. **Task 3: Patron order submission UI + Bartender app scaffold with a live Orders view**
   - `7c45248` test(04-01): add failing tests for Patron order UI + Bartender scaffold
   - `0f6b43e` feat(04-01): Patron order submission UI + Bartender app scaffold

**Plan metadata:** (this commit)

## Files Created/Modified
- `apps/server/src/db/schema.ts` - adds the `orders` table
- `apps/server/src/db/test-helpers.ts` - matching `CREATE TABLE orders` in the isolated test harness
- `packages/shared/src/order.ts` - orderInput/orderStatus/order Zod contracts
- `apps/server/src/routes/recipes.ts` - exports `loadRecipe` for reuse by orders.ts
- `apps/server/src/routes/orders.ts` - POST/GET /api/orders, server-side makeable re-validation, Socket.IO emit
- `apps/server/src/routes/orders.test.ts` - unit + real-listening-server integration tests
- `apps/server/src/index.ts` - registers ordersRoutes, serves apps/bartender/dist under /bartender/
- `apps/patron/src/components/OrderPrompt.tsx` - "who's this for" overlay
- `apps/patron/src/api/useSubmitOrder.ts` - POST /api/orders mutation hook
- `apps/patron/src/components/RecipeDetail.tsx` - Order button, prompt trigger, confirmation, error alert
- `apps/bartender/*` - new Vite/React/antd app scaffold (package.json, tsconfig, vite/vitest config, index.html, index.css, test setup, App.tsx, main.tsx, api/client.ts, api/socket.ts, api/useOrders.ts, components/OrdersTab.tsx)
- `package.json` - root dev script now also runs `pnpm --filter bartender dev`

## Decisions Made
- `useSubmitOrder.test.tsx` uses a `.tsx` extension instead of the plan's stated `.test.ts` — JSX in the QueryClientProvider test wrapper requires `.tsx` under this project's esbuild/Vite config, matching the existing `apps/barback/src/api/useIngredients.test.tsx` precedent (Rule 3 — blocking, trivial, no behavior change).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `useSubmitOrder.test.tsx` file extension**
- **Found during:** Task 3 (writing the RED test for `useSubmitOrder`)
- **Issue:** Plan's file list specified `useSubmitOrder.test.ts`, but the test wraps the hook in a `QueryClientProvider` JSX element — plain `.ts` files fail to transform JSX under this project's Vite/esbuild config
- **Fix:** Used `.test.tsx` instead, matching the codebase's own existing precedent for hook tests that need a JSX wrapper (`apps/barback/src/api/useIngredients.test.tsx`)
- **Files modified:** apps/patron/src/api/useSubmitOrder.test.tsx (created with .tsx extension)
- **Verification:** `pnpm --filter patron test` passes
- **Committed in:** 7c45248 (Task 3 RED commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Cosmetic file-extension fix only, matching existing project convention. No scope creep, no behavior change.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `orders` table, shared `Order` contract, and `POST`/`GET /api/orders` are stable interfaces Plans 04-02 through 04-05 build against without further schema/contract changes
- `apps/bartender` scaffold (package.json, App.tsx shell, Socket.IO wiring, antd dark theme) is ready for Plan 04-02 to replace `App.tsx`'s single-tab body with the full Recipes/Orders two-tab shell
- **Outstanding human-check (BART-02 tracer proof, D5 above):** a real order submitted from a Patron device must be confirmed live on a second Bartender device (`/bartender/`) without a manual refresh. Per this project's `human_verify_mode: end-of-phase` config, this is deferred to the phase-level UAT rather than blocking here — automated coverage (unit tests + builds) is otherwise complete.

---
*Phase: 04-bartender-console-order-workflow*
*Completed: 2026-08-18*

## Self-Check: PASSED

All key files created (16/16) verified present on disk. All task commits (e963c7d, 49eed42, 7c45248, 0f6b43e) verified present in git log.
