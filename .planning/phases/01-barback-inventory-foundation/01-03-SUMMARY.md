---
phase: 01-barback-inventory-foundation
plan: 03
subsystem: inventory-stock-toggle
tags: [fastify, drizzle, zod, react, antd, tanstack-query, react-swipeable]

# Dependency graph
requires:
  - "@my-bar/shared Zod contracts (ingredientInput/ingredient, plan 01-01)"
  - "Drizzle schema: ingredients.in_stock boolean default true (plan 01-01)"
  - "createTestDb() Vitest fixture (plan 01-01)"
  - "ingredientsRoutes plugin, GET/POST /api/ingredients (plans 01-01, 01-02)"
  - "useIngredients() TanStack Query hook, IngredientList component (plans 01-01, 01-02)"
provides:
  - "PATCH /api/ingredients/:id/stock — writes only in_stock, 404s on unknown id"
  - "stockPatch/StockPatch Zod contract (packages/shared/src/ingredient.ts)"
  - "useToggleStock() TanStack Query mutation (apps/barback/src/api/useIngredients.ts)"
  - "IngredientRow component — swipeable, deferred-commit, undo-grace-period stock toggle"
  - "IngredientList now renders IngredientRow per ingredient with an optional onEdit passthrough"
affects: [01-04, 01-05, phase-2-recipes-makeable-engine]

# Actuals (#2632)
actuals:
  tokens: 4213
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added:
    - "react-swipeable 7.0.2 (apps/barback) — swipe-left/swipe-right gesture detection for the stock toggle"
  patterns:
    - "Deferred-commit toggle: swipe sets local `pending` state + a named 3000ms setTimeout; only the timer's callback invokes the mutation. Undo clears the timer and never fires a request. Timer is also cleared in a useEffect unmount cleanup."
    - "PATCH route pattern extended: schema.params constrains :id to a uuid string in addition to schema.body's narrow contract, and every status the handler sends (200 + 404) is declared in schema.response"
    - "Mutation hooks that never hand-roll rollback: useToggleStock's onError only surfaces a toast; the pre-existing onSettled invalidation (not onSuccess) is what reconciles the row to server truth either way"

key-files:
  created:
    - apps/barback/src/components/IngredientRow.tsx
  modified:
    - packages/shared/src/ingredient.ts
    - apps/server/src/routes/ingredients.ts
    - apps/server/src/routes/ingredients.test.ts
    - apps/barback/src/api/useIngredients.ts
    - apps/barback/src/components/IngredientList.tsx
    - apps/barback/package.json
    - pnpm-lock.yaml

key-decisions:
  - "stockPatch is its own Zod schema, not a partial() of ingredientInput — a toggle request can only ever carry a single boolean, so a compromised or buggy client can't use the stock-toggle endpoint to rename a bottle or reassign its category (T-01-12, matches the plan's explicit instruction)"
  - "Swipe handlers are attached only to the row's name/category content div, not to the outer row or the Edit button — an isolated DOM subtree, not just an event.stopPropagation() guard, so tapping Edit structurally cannot register as a swipe"
  - "Destructive-color reveal only for the leftward (out-of-stock) drag; the rightward (in-stock) drag reveals the accent color instead of also using destructive — 01-UI-SPEC.md's Color contract only defines the out-of-stock case explicitly, so this is a planner-level extension applying the same contract's accent role symmetrically, not a new color introduced"

patterns-established:
  - "IngredientRow's onEdit? prop pattern: a component built ahead of its consumer (plan 01-04's edit form) that safely no-ops (doesn't render the control) when the prop is undefined, so it can be threaded through IngredientList now without forcing App.tsx to wire an edit flow this plan doesn't own"

requirements-completed: [INV-03]

coverage:
  - id: D1
    description: "The owner can swipe an ingredient row left to mark it out of stock and right to mark it in stock, and the change takes effect after the grace window"
    requirement: INV-03
    verification:
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#toggles a seeded in-stock ingredient to false and persists it; #toggles it back to true and persists it"
        status: pass
      - kind: integration
        ref: "live smoke test against a running server instance: PATCH /api/ingredients/<id>/stock {inStock:false} -> 200 inStock:false, GET /api/ingredients reflects it; PATCH back to true -> 200 inStock:true"
        status: pass
    human_judgment: true
    rationale: "The server-side toggle, persistence, and 404 behavior are proven by tests and a live curl round-trip. The swipe gesture itself, the undo grace-period feel, and the visual reveal require a real touchscreen device to confirm — deferred to end-of-phase UAT per config.json's human_verify_mode: end-of-phase, per this plan's own scripted human-check in Task 2's <verify>."
  - id: D2
    description: "Swipe direction is fixed: left is out-of-stock, right is in-stock (D-08)"
    verification:
      - kind: unit
        ref: "source assertion: IngredientRow.tsx onSwipedLeft calls startToggle(false), onSwipedRight calls startToggle(true) — grep-verified in acceptance criteria"
        status: pass
    human_judgment: false
  - id: D3
    description: "The commit is deferred behind an undo grace period; an undone swipe sends no request (D-08, D-10)"
    verification:
      - kind: unit
        ref: "source assertion: onCommitToggle is only invoked from the setTimeout callback (3000ms), never from onSwipedLeft/onSwipedRight directly; undo() calls clearTimeout before onCommitToggle can fire"
        status: pass
    human_judgment: true
    rationale: "The deferred-timer wiring is provably correct by reading the code path (no request-sending call exists outside the timer callback), but confirming the undo control actually appears, is tappable, and the server value never changes when undone requires a human tapping it in a real browser — deferred to end-of-phase UAT."
  - id: D4
    description: "No blocking confirmation dialog interrupts a stock toggle (D-10)"
    verification:
      - kind: unit
        ref: "source assertion: no Modal.confirm and no <Switch in IngredientRow.tsx — grep-verified in acceptance criteria"
        status: pass
    human_judgment: false
  - id: D5
    description: "Stock state survives a page refresh because the server holds the authoritative in_stock value"
    verification:
      - kind: integration
        ref: "live smoke test: PATCH the value, GET /api/ingredients (a fresh request, equivalent to a refetch after refresh) reflects the new value"
        status: pass
    human_judgment: false
  - id: D6
    description: "A malformed stock-toggle request cannot rename a bottle or move it between categories (T-01-12); an unmatched id 404s rather than silently succeeding (T-01-14)"
    verification:
      - kind: unit
        ref: "apps/server/src/routes/ingredients.test.ts#leaves name, categoryId and note unchanged by a stock toggle; #returns 400 when the body omits inStock; #returns 400 when inStock is a string rather than a boolean; #returns 404 when the id does not match any ingredient"
        status: pass
    human_judgment: false

duration: 28min
completed: 2026-08-10
status: complete
---

# Phase 1 Plan 3: Stock-Toggle Summary

**PATCH /api/ingredients/:id/stock under a narrow stockPatch Zod contract, plus the swipeable IngredientRow — swipe left/right flips the row instantly with a 3000ms deferred commit and a no-network-request Undo, closing INV-03 with the exact gesture and safety model D-08/D-10 specify.**

## Performance

- **Duration:** ~28 min
- **Tasks:** 2
- **Files modified:** 7 (1 new, 6 extended)

## Accomplishments

- `packages/shared/src/ingredient.ts` gained `stockPatch`/`StockPatch` — a single-boolean contract kept deliberately separate from `ingredientInput` so a toggle request is structurally incapable of renaming a bottle or reassigning its category (T-01-12)
- `PATCH /api/ingredients/:id/stock` validates the path param as a uuid (T-01-13), writes only the `in_stock` column via Drizzle, re-reads the full joined row, and 404s on an unknown id instead of silently no-op-ing (T-01-14) — 6 new Vitest tests lock toggle-to-false, toggle-back-to-true, field-immutability, missing/non-boolean `inStock` (400), and unknown id (404); 17/17 server tests green
- `useToggleStock()` (TanStack Query mutation) PATCHes the new endpoint; `onError` shows the Copywriting Contract's exact toast ("Couldn't update stock — try again."), `onSettled` invalidates `['ingredients']` so the list always reconciles to server truth — no hand-rolled rollback
- `IngredientRow.tsx`: `useSwipeable` maps swipe-left to a pending out-of-stock target and swipe-right to a pending in-stock target (D-08, fixed direction — not configurable); starting a toggle sets local `pending` state and a named 3000ms grace timer; only the timer's callback invokes `onCommitToggle`; tapping Undo clears the timer with zero network calls; the timer is also cleared on unmount so a row scrolled out of the list mid-window can't fire against an unmounted component
- No switch control, no whole-row tap target, and no `Modal.confirm` exist anywhere in the row — the three shapes D-08/D-10 explicitly rule out
- A CSS-transform reveal (clamped to ±80px) shows the destructive color behind the row while swiping left and the accent color while swiping right — the visual half of the gesture `react-swipeable` doesn't provide on its own
- Row, Undo control, and Edit control are each at least a 48px tap target (D-13); the bottle name truncates to one line via Tailwind's `truncate` utility
- `IngredientList.tsx` now renders `IngredientRow` per ingredient, wired to `useToggleStock()`, and threads an optional `onEdit` prop down to each row — left unsupplied by `App.tsx` in this plan (plan 01-04's scope), so no edit control renders yet, exactly as the plan specifies
- Verified live: started the built server against a real SQLite file, curled `PATCH /api/ingredients/<id>/stock` with `{"inStock":false}` (200, `inStock:false`), confirmed `GET /api/ingredients` reflects it, toggled back to `true`, and confirmed an unknown id returns 404

## Task Commits

Each task was committed atomically:

1. **Task 1: Add the stock-toggle endpoint and its contract** — `35e918e` (feat)
2. **Task 2: Build the swipeable row with a deferred commit and undo window** — `7d63ca4` (feat)

_No separate plan-metadata commit in worktree mode — the orchestrator commits STATE.md/ROADMAP.md centrally after the wave merges. This plan's SUMMARY.md is committed separately per worktree-mode convention._

## Files Created/Modified

- `packages/shared/src/ingredient.ts` — added `stockPatch`/`StockPatch`
- `apps/server/src/routes/ingredients.ts` — added `PATCH /:id/stock`
- `apps/server/src/routes/ingredients.test.ts` — 6 new tests for the toggle path
- `apps/barback/src/api/useIngredients.ts` — added `useToggleStock()`
- `apps/barback/src/components/IngredientRow.tsx` (new) — the swipeable row
- `apps/barback/src/components/IngredientList.tsx` — maps to `IngredientRow`, threads `onEdit`
- `apps/barback/package.json`, `pnpm-lock.yaml` — added `react-swipeable@7.0.2`

## Decisions Made

- **`stockPatch` as its own schema, not `ingredientInput.partial()`:** the plan's action text is explicit about this, and it's the load-bearing part of T-01-12's mitigation — a partial of the full input type would still structurally accept `name`/`categoryId` fields that a compromised client could smuggle in even if the handler ignores them; a wholly separate single-field schema makes that impossible at the validation layer, not just the handler layer.
- **Swipe handlers scoped to the name/category div only, not the whole row:** rather than relying solely on `event.stopPropagation()` in the Edit button's click handler (kept as defense-in-depth), the swipe gesture listeners are structurally absent from the DOM subtree containing the Edit button — the plan's "Keep the swipe handlers off that button" instruction is satisfied at the JSX-structure level, not just the event-handling level.
- **Accent-colored reveal for the rightward swipe:** `01-UI-SPEC.md`'s Color contract states the destructive color is for the "out-of-stock swipe-reveal background" specifically; it does not define what the rightward (in-stock) reveal should look like. Using the accent color symmetrically (rather than reusing destructive for both directions, or using no reveal at all for the rightward case) applies the same Color contract's existing accent role rather than introducing a new one — a minor completion of an underspecified visual detail, not a new design decision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `useRef<ReturnType<typeof setTimeout>>()` fails `tsc` under React 19's stricter types**
- **Found during:** Task 2, first `pnpm --filter barback build`
- **Issue:** `useRef` called with zero arguments now requires the generic type to include `undefined`, or the call itself needs an explicit initial value — React 19's updated type definitions reject the zero-arg call that was valid under React 18-era typings (the exact shape the plan's own Code Example in `01-RESEARCH.md`'s Pattern 2 uses).
- **Fix:** `useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`.
- **Files modified:** `apps/barback/src/components/IngredientRow.tsx`
- **Verification:** `pnpm --filter barback build` and `tsc --noEmit` both exit 0.
- **Committed in:** `7d63ca4` (Task 2 commit)

**2. [Out-of-scope, logged not fixed] Flaky `pnpm --filter server test` under parallel Vitest workers**
- **Found during:** Task 1, running the plan's own automated verify command
- **Issue:** `pnpm --filter server test` intermittently throws `SqliteError: database is locked` from the production `db/client.ts`'s `journal_mode = WAL` pragma, when Vitest runs `ingredients.test.ts` and `categories.test.ts` in parallel workers that both eagerly import route files, which both eagerly open the same production `data/my-bar.db` file at module scope (established in plan 01-01, exacerbated by plan 01-02 adding a second test file).
- **Why not auto-fixed:** Root cause lives in files/import-structure this plan doesn't own or touch, and predates this plan's changes (confirmed via `npx vitest run src/routes/ingredients.test.ts` alone: 17/17 deterministic pass every time vs. the full-suite command's intermittent failure). Per the SCOPE BOUNDARY rule, out-of-scope pre-existing issues are logged, not fixed.
- **Logged to:** `.planning/phases/01-barback-inventory-foundation/deferred-items.md` (new file), including a suggested fix (make the production `db` connection lazy) for whoever picks this up.
- **Verification:** `pnpm --filter server test` re-run 3 times during this plan's execution — 2 passes, 1 flake — consistent with an intermittent race rather than a real regression.

---

**Total deviations:** 2 (1 auto-fixed bug, 1 out-of-scope issue logged not fixed)
**Impact on plan:** The React 19 `useRef` typing fix was required for the plan's own `<verify>` commands to pass and doesn't change the deferred-commit architecture. The logged test flakiness doesn't block this plan (it self-resolves on retry) but is worth fixing before the phase's final gate if CI ever pins Vitest to run test files in parallel by default.

## Issues Encountered

None beyond the two items above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `PATCH /api/ingredients/:id/stock` and `useToggleStock()` are ready for reuse as-is; no further schema or hook changes are anticipated for plan 01-04 (edit) or 01-05 (search/filter).
- `IngredientRow`'s `onEdit?` prop is already threaded through `IngredientList` — plan 01-04 only needs to open an edit form from `App.tsx` and pass a real `onEdit` handler down; no changes to `IngredientRow.tsx` or `IngredientList.tsx` are required for that wiring.
- The scripted human-check in Task 2's `<verify>` (swipe gesture feel, undo timing, visual reveal, long-name truncation on a real device) is deferred to end-of-phase UAT per `config.json`'s `human_verify_mode: "end-of-phase"` — flagging here so it isn't lost before that gate.
- `.planning/phases/01-barback-inventory-foundation/deferred-items.md` (new) carries one open item (test flakiness, see Deviations above) forward for whichever plan or phase-close activity next touches `apps/server/src/db/client.ts`.
- No blockers for 01-04/01-05.

## Self-Check: PASSED

All created/modified files confirmed on disk: `packages/shared/src/ingredient.ts`, `apps/server/src/routes/ingredients.ts`, `apps/server/src/routes/ingredients.test.ts`, `apps/barback/src/api/useIngredients.ts`, `apps/barback/src/components/IngredientRow.tsx`, `apps/barback/src/components/IngredientList.tsx`. Both task commit hashes (`35e918e`, `7d63ca4`) confirmed present in `git log --oneline --all`.

---
*Phase: 01-barback-inventory-foundation*
*Completed: 2026-08-10*
