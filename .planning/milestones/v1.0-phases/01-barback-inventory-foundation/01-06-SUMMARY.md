---
phase: 01-barback-inventory-foundation
plan: 06
subsystem: ui
tags: [react, react-swipeable, vitest, tailwind, ant-design, swipe-gesture]

requires:
  - phase: 01-barback-inventory-foundation (plan 01-03)
    provides: IngredientRow.tsx's swipe-to-toggle interaction (INV-03) with WR-01/WR-02 race-condition fixes
provides:
  - "swipeVisuals.ts: pure, unit-tested getRevealColorClass/getRowSurfaceClasses class derivation"
  - "Redesigned swipe-hold/undo-in-reveal/commit-on-slideback state machine in IngredientRow.tsx"
  - "apps/barback vitest infrastructure (vitest.config.ts + vitest devDependency), mirroring apps/server"
affects: [01-barback-inventory-foundation, future UAT rounds on INV-03]

actuals:
  tokens: 3017
  tasks: 2
  commits: 3

tech-stack:
  added: ["vitest@4.1.10 (apps/barback devDependency)"]
  patterns:
    - "Pure visual-derivation functions extracted out of gesture/timer components for isolated unit testing (swipeVisuals.ts)"
    - "Swipe-hold state machine: swipeOffset snaps to and holds a fixed REVEAL_OFFSET through the undo grace period, resetting to 0 only when the grace period elapses or Undo is tapped"

key-files:
  created:
    - apps/barback/vitest.config.ts
    - apps/barback/src/components/swipeVisuals.ts
    - apps/barback/src/components/swipeVisuals.test.ts
  modified:
    - apps/barback/package.json
    - apps/barback/src/components/IngredientRow.tsx
    - pnpm-lock.yaml

key-decisions:
  - "Reveal-layer neutral-at-rest class is bg-transparent (not bg-bar-surface) — simplest correct fix for G-01-5's regression, avoids the reveal div fighting the row's own surface color during the transform animation"
  - "Out-of-stock surface treatment uses bg-zinc-950 (solid, darker than bar-surface) + text-zinc-500, replacing the previous opacity-60 bleed-through approach entirely"
  - "REVEAL_OFFSET=80 reused from the existing onSwiping clamp magnitude as the single held-position constant, per the plan's explicit instruction to collapse the two clamp literals into one named constant"

patterns-established:
  - "Pattern: swipeVisuals — pure color/surface class derivation lives in a dedicated module, imported by the component that renders it, so visual regression cases (like G-01-5's swipeOffset===0 default) are covered by fast unit tests instead of only being catchable via manual/E2E verification"

requirements-completed: [INV-03]

coverage:
  - id: D1
    description: "getRevealColorClass returns a neutral, non-color class at swipeOffset===0 (G-01-5 regression) and the correct destructive/accent class for negative/positive offsets"
    requirement: INV-03
    verification:
      - kind: unit
        ref: "apps/barback/src/components/swipeVisuals.test.ts#getRevealColorClass"
        status: pass
    human_judgment: false
  - id: D2
    description: "getRowSurfaceClasses returns an independent (non-translucent) background and dimmed name-text for out-of-stock rows, distinct from the standard in-stock surface"
    requirement: INV-03
    verification:
      - kind: unit
        ref: "apps/barback/src/components/swipeVisuals.test.ts#getRowSurfaceClasses"
        status: pass
    human_judgment: false
  - id: D3
    description: "IngredientRow's swipe holds the row at the revealed position (REVEAL_OFFSET, signed by direction) through the grace period, with Undo rendered inside the reveal area; grace-period elapse both commits and slides the row back; Undo also resets swipeOffset to 0; direction mapping (D-08) and no-network-on-undo (D-10) preserved"
    requirement: INV-03
    verification:
      - kind: unit
        ref: "pnpm --filter barback test (swipeVisuals.test.ts, exercised via IngredientRow's use of the same exports)"
        status: pass
      - kind: integration
        ref: "pnpm --filter barback build (tsc --noEmit + vite build)"
        status: pass
    human_judgment: true
    rationale: "The held-reveal position, Undo-inside-reveal placement, commit-on-slideback timing, and absence of at-rest accent green are visual/interaction properties that automated tests do not directly assert on rendered DOM (no component-level test harness exists in apps/barback beyond the pure swipeVisuals unit tests) — the plan's own verify block specifies a scripted human-check on a real phone. Per workflow.human_verify_mode=end-of-phase (.planning/config.json), this is deferred to the phase's end-of-phase UAT round rather than blocking this plan."

duration: 20min
completed: 2026-08-10
status: complete
---

# Phase 1 Plan 06: Swipe Reveal Color and Hold/Undo Redesign Summary

**Extracted `swipeVisuals.ts` (unit-tested reveal-color/out-of-stock-surface derivation) and redesigned `IngredientRow.tsx`'s swipe state machine so a released swipe holds at a fixed revealed position with Undo inside the colored reveal area, committing only when the grace period elapses.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-08-10T16:44:15-05:00 (plan committed)
- **Completed:** 2026-08-10T17:02:09-05:00 (Task 2 commit)
- **Tasks:** 2
- **Files modified:** 6 (2 created, 3 modified + lockfile)

## Accomplishments
- Closed G-01-5: the swipe reveal layer now resolves to a neutral `bg-transparent` class at rest instead of defaulting to the reserved in-stock accent green; out-of-stock rows get an independent solid `bg-zinc-950` background + `text-zinc-500` name text instead of an `opacity-60` layer bleeding the reveal color through.
- Closed G-01-5b: a swipe that crosses the toggle threshold now snaps to and holds a fixed `REVEAL_OFFSET` position (signed by direction) for the duration of the undo grace period, with the Undo control rendered inside that colored reveal area (aligned to whichever side the swipe exposed) rather than as a separate floating button among the row's trailing controls. Letting the grace period elapse both fires the commit and animates the row back to rest at that same moment; tapping Undo also returns the row to rest immediately.
- Added `apps/barback`'s first test infrastructure (`vitest.config.ts` mirroring `apps/server`'s, `vitest@4.1.10` devDependency, `"test": "vitest run"` script) via a proper RED→GREEN TDD cycle for the new `swipeVisuals.ts` module.
- Preserved every existing invariant without touching the WR-01/WR-02 effects: no network request on Undo (D-10), no confirmation dialog (D-10), left=out-of-stock/right=in-stock direction mapping unchanged (D-08).

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): add failing swipeVisuals test** - `6642d57` (test)
2. **Task 1 (GREEN): extract pure swipe-visual class derivation** - `ac5f4fd` (feat)
3. **Task 2: redesign swipe-hold, undo-in-reveal, commit-on-slideback** - `c06e7e3` (feat)

_TDD task (Task 1) produced two commits (RED test → GREEN implementation) per the tdd="true" gate; no REFACTOR commit was needed._

## Files Created/Modified
- `apps/barback/vitest.config.ts` - Node-environment vitest config, mirrors `apps/server/vitest.config.ts`
- `apps/barback/src/components/swipeVisuals.ts` - `getRevealColorClass(swipeOffset)` and `getRowSurfaceClasses(displayedInStock)`, the only place reveal-color/out-of-stock-surface logic lives now
- `apps/barback/src/components/swipeVisuals.test.ts` - Unit tests covering the G-01-5 at-rest regression case and the independent out-of-stock surface treatment
- `apps/barback/src/components/IngredientRow.tsx` - Redesigned swipe/undo/commit state machine: `REVEAL_OFFSET` constant, single `onSwiped` handler dispatching on `event.dir`, held-reveal position through the grace period, Undo moved inside the reveal div, render wired to `swipeVisuals.ts`'s exports
- `apps/barback/package.json` - `vitest` devDependency added, `"test"` script changed from placeholder to `"vitest run"`
- `pnpm-lock.yaml` - Lockfile update from `pnpm --filter barback add -D vitest@4.1.10`

## Decisions Made
- Reveal-layer neutral-at-rest class chosen as `bg-transparent` rather than `bg-bar-surface` — avoids the reveal div's color fighting the row's own surface color visually during the `translateX` slide animation, while still satisfying the G-01-5 requirement that it never resolves to accent green at rest.
- Out-of-stock surface treatment implemented as a solid `bg-zinc-950` (darker than `bg-bar-surface`, distinct from the page's `bg-bar-bg`) plus `text-zinc-500` name text — no translucency-based class, per the plan's explicit "no opacity bleed-through" requirement.
- `REVEAL_OFFSET = 80` reuses the exact magnitude of the previous `onSwiping` clamp literals (`Math.max(-80, Math.min(80, ...))`), now expressed as one named constant shared by the live-drag clamp and the held/revealed position, per the plan's explicit instruction.

## Deviations from Plan

None - plan executed exactly as written, including the RED→GREEN TDD sequence for Task 1 and every specific behavior called out in Task 2's `<action>`.

## Issues Encountered

`node_modules` did not exist in this worktree at the start of execution (fresh worktree checkout). Ran `pnpm install` before Task 1 to restore the workspace's existing dependency tree (no version changes) so `pnpm --filter barback test`/`build` could run — this is standard worktree setup, not a plan deviation, and produced no diff since the lockfile was already up to date at that point.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-01-5 and G-01-5b are closed at the code level; `pnpm --filter barback test` and `pnpm --filter barback build` both pass clean.
- Task 2's scripted human-check (swipe on a real phone: no at-rest green, held reveal with Undo inside it, commit-on-slideback timing, no network request on Undo) is deferred to the phase's end-of-phase UAT round per `workflow.human_verify_mode=end-of-phase` in `.planning/config.json` — flag this specifically when the next UAT pass runs against Phase 1, since it directly re-tests UAT test #5's original failure.
- No blockers for subsequent Phase 1 plans or Phase 2.

---
*Phase: 01-barback-inventory-foundation*
*Completed: 2026-08-10*
