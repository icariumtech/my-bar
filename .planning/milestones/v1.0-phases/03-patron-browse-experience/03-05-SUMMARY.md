---
phase: 03-patron-browse-experience
plan: 05
subsystem: api
tags: [socket.io, fastify, tanstack-query, vitest, real-time]

requires:
  - phase: 03-patron-browse-experience (plan 01)
    provides: extended /api/recipes and /api/ingredients routes, apps/patron workspace with useRecipes() staleTime:Infinity trusting this plan's future invalidation signal
provides:
  - "Socket.IO hub (apps/server/src/ws/hub.ts) attached to the Fastify HTTP server, decorating app.io"
  - "inventory:changed emission after every ingredient POST/PATCH/PATCH-stock write"
  - "recipe:updated { recipeId } emission after every recipe POST/PATCH/DELETE write"
  - "Patron socket client (apps/patron/src/api/socket.ts) — initSocket()/registerSocketHandlers() invalidating TanStack Query cache on both events plus an explicit resync on every connect/reconnect"
  - "/socket.io dev-proxy entry (ws: true) in apps/patron/vite.config.ts"
affects: [03-06, bartender-phase, barback-live-sync]

actuals:
  tokens: 4693
  tasks: 2
  commits: 4

tech-stack:
  added: ["socket.io@4.8.3 (server dep)", "socket.io-client@4.8.3 (server devDep for integration testing, patron dep)"]
  patterns:
    - "app.io?.emit(...) optional-chaining at every route write site — makes emission a no-op when no hub is registered, so bare-Fastify() route test suites (ingredients.test.ts, recipes.test.ts) need zero changes"
    - "Real-listening-server integration test for Socket.IO (app.listen({port:0}) + a real socket.io-client, plain fetch() against the listener) rather than a mocked io.emit() call — .inject() bypasses the TCP listener entirely and would let hub wiring regress silently"
    - "SocketLike narrow custom interface (not Pick<Socket,'on'>) for testability — Socket.IO's real .on is a heavily overloaded generic tied to its reserved-event map that a plain fake object can never structurally satisfy under tsc --noEmit"
    - "Socket.IO's connect event (fires on initial connection AND every reconnect) is the sole resync trigger — no separate reconnect-specific handler needed"

key-files:
  created:
    - apps/server/src/ws/hub.ts
    - apps/server/src/ws/hub.test.ts
    - apps/patron/src/api/socket.ts
    - apps/patron/src/api/socket.test.ts
  modified:
    - apps/server/src/index.ts
    - apps/server/src/routes/ingredients.ts
    - apps/server/src/routes/recipes.ts
    - apps/patron/src/main.tsx
    - apps/patron/vite.config.ts
    - apps/server/package.json
    - apps/patron/package.json

key-decisions:
  - "registerSocketHub(app) is called before the four route plugin registrations in buildApp() — Fastify decorators set on the parent before a child plugin registers are visible inside that child via parent-to-child encapsulation; registering after the routes would leave app.io undefined inside them."
  - "SocketLike defined as a narrow custom interface { on(event, listener): unknown } rather than Pick<Socket, 'on'> — the plan's literal spec named Pick<Socket, 'on'>, but that type's overload signature (tied to Socket.IO's SocketReservedEvents map) rejected the test's plain fake object under tsc --noEmit, breaking `pnpm --filter patron build`. Fixed inline (Rule 1 — blocking bug) before committing GREEN; unit test behavior is unchanged, only the type declaration."
  - "Fixed an authoring bug in hub.test.ts's own recipe:updated test during RED->GREEN: it called seedIngredient() after already inserting a 'Dry Gin' category, tripping categories.name's UNIQUE constraint. Removed the unneeded seedIngredient() call — recipeInput only requires categoryId, not a seeded ingredient."

requirements-completed: [SYNC-01]

coverage:
  - id: D1
    description: "Server-side Socket.IO hub emits inventory:changed and recipe:updated to real connected clients after ingredient/recipe writes, proven against a real listening server (not mocked)"
    requirement: "SYNC-01"
    verification:
      - kind: integration
        ref: "apps/server/src/ws/hub.test.ts — both tests (inventory:changed after stock PATCH, recipe:updated after recipe POST)"
        status: pass
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts, apps/server/src/routes/recipes.test.ts (unmodified, zero regressions with hub emission wired in)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Patron client invalidates ['recipes'] on inventory:changed, invalidates ['recipes', recipeId] + ['recipes'] on recipe:updated, and re-invalidates ['recipes']/['tags'] on every connect (initial + reconnect)"
    requirement: "SYNC-01"
    verification:
      - kind: unit
        ref: "apps/patron/src/api/socket.test.ts — all three registerSocketHandlers tests"
        status: pass
    human_judgment: false
  - id: D3
    description: "Toggling an ingredient's stock in Barback while the Patron browse grid is open flips the affected card's makeable badge live, without a page refresh (the plan's stated manual verification)"
    requirement: "SYNC-01"
    verification: []
    human_judgment: true
    rationale: "Requires two simultaneous browser sessions (Barback + Patron) against a running dev server to observe a live visual update — genuinely a human-in-the-loop UAT step, not something the automated hub/client unit and integration tests alone can confirm end-to-end across two separate frontend apps."

duration: ~15min
completed: 2026-08-13
status: complete
---

# Phase 03 Plan 05: Socket.IO Live Sync Summary

**Socket.IO hub on Fastify broadcasting inventory:changed/recipe:updated after ingredient/recipe writes, and a Patron client that invalidates its TanStack Query cache on those events plus an explicit resync on every connect/reconnect — closes SYNC-01**

## Performance

- **Duration:** ~15 min
- **Tasks:** 2
- **Files modified:** 11 (4 created, 7 modified)

## Accomplishments
- `apps/server/src/ws/hub.ts`: `registerSocketHub(app)` attaches Socket.IO to the Fastify HTTP server, decorates `app.io` via a module-augmented optional property
- `inventory:changed` emitted after every ingredient POST/PATCH/PATCH-stock write; `recipe:updated { recipeId }` emitted after every recipe POST/PATCH/DELETE write — every call site guarded with `app.io?.emit(...)` so the pre-existing bare-`Fastify()` route test suites need zero changes
- `apps/server/src/ws/hub.test.ts`: real-listening-server integration test — an actual connected `socket.io-client`, plain `fetch()` against `app.listen({port:0})`, not `.inject()` — proves both events end-to-end
- `apps/patron/src/api/socket.ts`: `registerSocketHandlers()` wires `inventory:changed`/`recipe:updated`/`connect` to TanStack Query invalidation; `initSocket()` connects on app boot (before render) and is called from `main.tsx`
- `apps/patron/vite.config.ts`: added `/socket.io` dev-proxy entry with `ws: true` so the Socket.IO WebSocket upgrade proxies correctly in dev
- Full monorepo build (`pnpm -r build`) and test (`pnpm -r test`) both pass with zero regressions: server 91/91, patron 6/6, barback 70/70

## Task Commits

Each task followed the TDD RED → GREEN cycle, committed atomically:

1. **Task 1: Server-side Socket.IO hub** — `394c999` (test, RED), `3616a46` (feat, GREEN)
2. **Task 2: Patron socket client** — `662f114` (test, RED), `ed9a069` (feat, GREEN)

_No REFACTOR commits needed — both GREEN implementations were already clean on first pass (one inline type fix and one inline test-fixture fix were folded into the respective GREEN commits, not split out separately)._

## Files Created/Modified
- `apps/server/src/ws/hub.ts` — `registerSocketHub(app)`, `FastifyInstance.io` module augmentation
- `apps/server/src/ws/hub.test.ts` — real-listening-server integration test (socket.io-client + fetch, not `.inject()`)
- `apps/server/src/index.ts` — registers the hub before the four route plugins
- `apps/server/src/routes/ingredients.ts` — `app.io?.emit('inventory:changed')` on POST/PATCH/PATCH-stock
- `apps/server/src/routes/recipes.ts` — `app.io?.emit('recipe:updated', { recipeId })` on POST/PATCH/DELETE
- `apps/patron/src/api/socket.ts` — `registerSocketHandlers()`, `initSocket()`
- `apps/patron/src/api/socket.test.ts` — fake-socket unit tests for all three event handlers
- `apps/patron/src/main.tsx` — calls `initSocket(queryClient)` before render
- `apps/patron/vite.config.ts` — `/socket.io` proxy entry, `ws: true`
- `apps/server/package.json` — `socket.io` dep, `socket.io-client` devDep (both `4.8.3`)
- `apps/patron/package.json` — `socket.io-client` dep (`4.8.3`)

## Decisions Made
- `registerSocketHub(app)` called before the route plugin registrations in `buildApp()` — decorator visibility requires this ordering under Fastify's encapsulation model.
- `SocketLike` uses a narrow custom interface rather than the plan's literal `Pick<Socket, 'on'>` spec — see Deviations below.
- No separate `reconnect`-specific handler — Socket.IO's client re-fires `connect` on every successful reconnection by design, so one handler covers both the initial-load and post-reconnect resync cases.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `Pick<Socket, 'on'>` rejected the test's fake socket under `tsc --noEmit`**
- **Found during:** Task 2 GREEN, running `pnpm --filter patron build` (the cross-package build check this worktree's instructions specifically call out)
- **Issue:** The plan's `<action>` spec named `Pick<Socket, 'on'>` as `registerSocketHandlers`'s parameter type. `Socket.IO`'s real `.on` is a heavily overloaded generic keyed to its `SocketReservedEvents` map (`connect`/`disconnect`/`connect_error` get special signatures); a plain `{ on: vi.fn(...) }` fake object can satisfy it at runtime (vitest doesn't type-check) but not structurally under `tsc`, so `vitest run` passed while `tsc --noEmit` failed with a three-way overload mismatch.
- **Fix:** Replaced `Pick<Socket, 'on'>` with a narrow custom `interface SocketLike { on(event: string, listener: (...args: unknown[]) => void): unknown }` — exactly the shape `registerSocketHandlers` actually uses, and one the fake object structurally satisfies. `initSocket`'s real `Socket` instance remains assignable to it (a more-specific overloaded function is assignable to a less-specific general one).
- **Files modified:** `apps/patron/src/api/socket.ts`
- **Verification:** `pnpm --filter patron build` (tsc + vite build) and `pnpm --filter patron test -- socket` both pass.
- **Committed in:** `ed9a069` (Task 2 GREEN commit)

**2. [Rule 1 - Bug] `hub.test.ts`'s own recipe:updated test tripped a UNIQUE constraint**
- **Found during:** Task 1, first GREEN test run
- **Issue:** The `recipe:updated` test inserted a `categories` row named `'Dry Gin'`, then called the shared `seedIngredient()` helper, which independently inserts *another* `'Dry Gin'` category — `categories.name` is `UNIQUE`, so the second insert threw `SqliteError: UNIQUE constraint failed: categories.name`.
- **Fix:** Removed the unneeded `seedIngredient()` call — `recipeInput` only requires a `categoryId` on its ingredient lines, not a seeded ingredient row.
- **Files modified:** `apps/server/src/ws/hub.test.ts`
- **Verification:** `pnpm -F @my-bar/server test -- hub.test.ts ingredients.test.ts recipes.test.ts` — 91/91 pass.
- **Committed in:** `3616a46` (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1 — blocking bugs discovered during the plan's own TDD cycle, not scope creep)
**Impact on plan:** Both fixes were necessary to reach a genuinely green, buildable state; neither changed the plan's behavioral contract (event names, payloads, invalidation targets are exactly as specified).

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None — no external service configuration required. `socket.io`/`socket.io-client` are both pinned to `4.8.3`, the live-verified npm registry version matching `03-RESEARCH.md`'s Package Legitimacy Audit.

## Next Phase Readiness
- SYNC-01 is fully closed: the Patron screen's makeable status is now live, not load-time-static — Barback inventory/recipe writes propagate via Socket.IO, with an explicit reconnect resync closing the kiosk-device-sleep gap.
- `apps/server/src/ws/hub.ts`'s `registerSocketHub`/`app.io` pattern is ready for the Bartender interface (a future phase) to reuse identically — no server-side changes needed, just a second client wiring `registerSocketHandlers`-equivalent logic against its own query keys.
- The manual/visual verification (toggling stock in Barback while Patron is open) was not run in this automated worktree session — flagged as `D3`/`human_judgment: true` above for end-of-phase UAT, per this project's `human_verify_mode: end-of-phase` config setting.
- No blockers.

---
*Phase: 03-patron-browse-experience*
*Completed: 2026-08-13*
