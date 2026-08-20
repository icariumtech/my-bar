---
phase: 04-bartender-console-order-workflow
plan: 05
subsystem: ui
tags: [react, fullscreen-api, wake-lock-api, kiosk, vitest, tdd]

# Dependency graph
requires:
  - phase: 03-patron-browse-experience
    provides: RecipeBrowse container (tag/availability filtering, viewingId-driven detail navigation) that this plan hooks into for the inactivity-timeout return-to-grid behavior
provides:
  - useKioskInactivity hook — resets a 90s idle timer on touchstart/mousedown/keydown, fires onTimeout once per idle window, repeats each subsequent idle window with no intervening activity, cleans up on unmount
  - useFullscreen hook — one-shot document.documentElement.requestFullscreen() on mount, graceful rejection handling
  - useWakeLock hook — one-shot navigator.wakeLock.request('screen') on mount, guarded by API presence, graceful rejection handling
  - App.tsx wired to call useFullscreen() + useWakeLock() once at Patron's single mount
  - RecipeBrowse.tsx wired to call useKioskInactivity(() => setViewingId(undefined), 90000), closing any open detail view on timeout without resetting tag/availability filters
affects: [phase-04-bartender-console-order-workflow]

actuals:
  tokens: 4261
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Kiosk lifecycle hooks (useFullscreen/useWakeLock) fire exactly once via an empty-dependency-array useEffect at the app's single root mount, never re-requested per interaction or per child-view render"
    - "Idle-timer hook (useKioskInactivity) self-chains its setTimeout (fires onTimeout, then immediately calls resetTimer() again) so it keeps firing once per subsequent idle window with no intervening activity, rather than being a one-shot timer"

key-files:
  created:
    - apps/patron/src/hooks/useKioskInactivity.ts
    - apps/patron/src/hooks/useKioskInactivity.test.ts
    - apps/patron/src/hooks/useFullscreen.ts
    - apps/patron/src/hooks/useFullscreen.test.ts
    - apps/patron/src/hooks/useWakeLock.ts
    - apps/patron/src/hooks/useWakeLock.test.ts
  modified:
    - apps/patron/src/App.tsx
    - apps/patron/src/components/RecipeBrowse.tsx
    - apps/patron/src/components/RecipeBrowse.test.tsx

key-decisions:
  - "useKioskInactivity's internal setTimeout self-chains (calls resetTimer() again from within the fired callback) rather than firing once — required to satisfy the RED-phase spec that onTimeout keeps firing for every subsequent idle period with no intervening activity; RecipeBrowse's own state update makes any firing after the first a no-op in practice"
  - "useRef<ReturnType<typeof setTimeout>>() fails TypeScript strict mode's argument-required check (no default type includes undefined); changed to useRef<ReturnType<typeof setTimeout> | undefined>(undefined) — caught only by `tsc --noEmit`, not vitest's esbuild transform"

patterns-established:
  - "Kiosk hooks pattern: one-shot browser-capability request hooks (useFullscreen, useWakeLock) live in apps/patron/src/hooks/, called unconditionally at App.tsx's root — the precedent for any future Patron kiosk-lockdown capability"

requirements-completed: [PATR-07, PATR-08]

coverage:
  - id: D1
    description: "useKioskInactivity resets its 90s timer on touchstart/mousedown/keydown activity on window and fires onTimeout exactly once per genuinely idle window, repeating for subsequent idle windows with no intervening activity; clears its timer on unmount"
    requirement: "PATR-08"
    verification:
      - kind: unit
        ref: "apps/patron/src/hooks/useKioskInactivity.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "useFullscreen requests fullscreen exactly once on mount via document.documentElement.requestFullscreen(), never re-requested on re-render; a rejected/unsupported promise is caught and logged, never thrown"
    requirement: "PATR-07"
    verification:
      - kind: unit
        ref: "apps/patron/src/hooks/useFullscreen.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "useWakeLock requests a screen wake-lock exactly once on mount via navigator.wakeLock.request('screen') when the API exists; no throw when absent or when the request rejects"
    requirement: "PATR-07"
    verification:
      - kind: unit
        ref: "apps/patron/src/hooks/useWakeLock.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "App.tsx calls useFullscreen()/useWakeLock() once at Patron's root mount; RecipeBrowse.tsx calls useKioskInactivity(() => setViewingId(undefined), 90000), closing any open detail view on timeout without resetting selectedTagId/showAvailableOnly"
    requirement: "PATR-08"
    verification:
      - kind: unit
        ref: "apps/patron/src/components/RecipeBrowse.test.tsx#closes an open detail view and returns to the grid when the useKioskInactivity timeout fires"
        status: pass
    human_judgment: false
  - id: D5
    description: "Real-iPad Safari confirmation that fullscreen entry and 90s-idle return-to-grid behave correctly on the actual kiosk hardware (jsdom mocks cannot exercise real Safari fullscreen-exit-on-input-focus or wake-lock battery behavior)"
    verification: []
    human_judgment: true
    rationale: "Per the plan's own must_haves backstop entries and 04-VALIDATION.md's Manual-Only Verifications table — Fullscreen/Wake-Lock browser behavior differs between jsdom and real iPad Safari; this needs a real-device pass this executor cannot perform."

duration: 10min
completed: 2026-08-18
status: complete
---

# Phase 4 Plan 05: Patron Kiosk Lockdown Summary

**Patron requests fullscreen and a screen wake-lock once on load and auto-returns to the browse grid after 90 seconds of zero touch/mouse/key activity, via three new hooks (useKioskInactivity, useFullscreen, useWakeLock) unit-tested against fake timers and mocked browser APIs.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-08-18
- **Tasks:** 2
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments
- `useKioskInactivity` hook: 90s idle timer, resets on touchstart/mousedown/keydown on window, self-chains to keep firing every subsequent idle window, cleans up all listeners and the pending timer on unmount
- `useFullscreen` hook: one-shot `document.documentElement.requestFullscreen()` on mount, try/catch turns a denied/unsupported call into a console warning instead of a crash or unhandled rejection
- `useWakeLock` hook: one-shot `navigator.wakeLock.request('screen')` on mount, guarded by `'wakeLock' in navigator`, `.catch` turns a rejection into a console warning
- `App.tsx` calls both `useFullscreen()` and `useWakeLock()` once at Patron's single root mount
- `RecipeBrowse.tsx` calls `useKioskInactivity(() => setViewingId(undefined), 90000)` — on timeout, closes any open recipe detail view and returns to the grid, without touching the active tag filter or availability toggle

## Task Commits

Each task was committed as a RED/GREEN TDD pair:

1. **Task 1: useKioskInactivity — idle timer with event-driven reset**
   - `56b2a23` (test) — failing tests for timer start/boundary/reset/repeat/unmount behavior
   - `1df98cb` (feat) — hook implementation, self-chaining timer
2. **Task 2: useFullscreen + useWakeLock hooks, wired into App.tsx and RecipeBrowse.tsx**
   - `977d00e` (test) — failing tests for both hooks plus a RecipeBrowse wiring test
   - `756cf20` (feat) — hook implementations, App.tsx/RecipeBrowse.tsx wiring, plus two `tsc --noEmit` fixes to Task 1's files (see Deviations)

_Note: TDD tasks each have two commits (test → feat); no refactor commit was needed._

## Files Created/Modified
- `apps/patron/src/hooks/useKioskInactivity.ts` - 90s idle-detection hook, event-driven reset + self-chaining repeat
- `apps/patron/src/hooks/useKioskInactivity.test.ts` - fake-timer tests for the above
- `apps/patron/src/hooks/useFullscreen.ts` - one-shot fullscreen request on mount, graceful rejection handling
- `apps/patron/src/hooks/useFullscreen.test.ts` - mocked-API tests for the above
- `apps/patron/src/hooks/useWakeLock.ts` - one-shot wake-lock request on mount, guarded + graceful rejection handling
- `apps/patron/src/hooks/useWakeLock.test.ts` - mocked-API tests for the above
- `apps/patron/src/App.tsx` - calls `useFullscreen()` + `useWakeLock()` once at root mount
- `apps/patron/src/components/RecipeBrowse.tsx` - calls `useKioskInactivity(() => setViewingId(undefined), 90000)`
- `apps/patron/src/components/RecipeBrowse.test.tsx` - added a test mocking `useKioskInactivity` and asserting its timeout callback closes the detail view

## Decisions Made
- `useKioskInactivity`'s timer self-chains (fires `onTimeout`, then calls `resetTimer()` again) rather than being a one-shot `setTimeout`, so it correctly repeats for every subsequent idle window absent intervening activity — this was required to satisfy the plan's own RED-phase spec, not an addition beyond it.
- No other deviations from the plan's specified hook signatures, wiring points, or file list.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed two TypeScript strict-mode errors caught by `tsc --noEmit` (not by vitest, which transforms via esbuild without type-checking)**
- **Found during:** Task 2 (post-GREEN verification pass — ran `tsc -p tsconfig.json --noEmit` per the plan's own `pnpm --filter patron test -- ...` acceptance criteria plus this project's general "tests green" bar)
- **Issue:** (a) `useRef<ReturnType<typeof setTimeout>>()` with no initial argument fails strict mode's "expected 1 argument" check — the inferred type doesn't include `undefined`. (b) `useKioskInactivity.test.ts` used `global.clearTimeout`, but `global` isn't a recognized identifier under the browser-only `lib: ["ES2022", "DOM", "DOM.Iterable"]` tsconfig (no `@types/node` `global` global).
- **Fix:** (a) Changed to `useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`. (b) Changed the spy target from `global` to `globalThis`.
- **Files modified:** `apps/patron/src/hooks/useKioskInactivity.ts`, `apps/patron/src/hooks/useKioskInactivity.test.ts`
- **Verification:** `npx tsc -p tsconfig.json --noEmit` clean; `pnpm --filter patron test` still 67/67 passing after the fix
- **Committed in:** `756cf20` (Task 2 commit, since the fix was discovered during Task 2's post-implementation verification pass)

---

**Total deviations:** 1 auto-fixed (1 bug fix touching two files from an earlier task's commit)
**Impact on plan:** Type-safety-only fix, no behavior change; both test suites remained 100% green throughout. No scope creep.

## Issues Encountered
- The plan's RED-phase spec for the touchstart/mousedown/keydown reset test case had an off-by-one in its own advance-timer math (advancing `89999ms` after a `10000ms` post-event advance would already be past the reset window's true 90000ms-since-event mark). Recomputed the correct advance schedule (`10000` → `79999` → `1`) before writing the implementation; this is authoring-time test math, not a deviation from the plan's *intended* behavior (which the corrected test still fully verifies).
- The plan's Task 2 `<verify>` block includes a `<human-check>` entry (real-iPad Safari fullscreen/wake-lock/90s-idle pass) that this executor cannot run. Tracked as coverage item D5 (`human_judgment: true`) above — not a blocker for this plan's completion, since PATR-07/PATR-08's own must_haves already classify the underlying assumptions as `backstop`-verification (unit-test-covered, not requiring a dedicated end-to-end iPad test to close this plan).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- PATR-07 and PATR-08 are both closed at the unit-test level; the Patron kiosk now requests fullscreen/wake-lock once on load and returns to the browse grid after 90s of inactivity.
- A real-iPad Safari verification pass (fullscreen behavior, wake-lock battery/permission behavior, and the 90s idle timeout in practice) remains open — recommended before/at physical kiosk deployment, per 04-VALIDATION.md's Manual-Only Verifications table.
- No blockers for other Phase 4 plans — this plan touched only Patron-side files with zero dependency on the order-submission/Bartender work in 04-01/04-02/04-03/04-04.

---
*Phase: 04-bartender-console-order-workflow*
*Completed: 2026-08-18*

## Self-Check: PASSED

All 9 created/modified files confirmed present on disk; all 4 task commit hashes (`56b2a23`, `1df98cb`, `977d00e`, `756cf20`) confirmed in `git log`.
