---
phase: 02-recipe-collection-makeable-engine
plan: 07
subsystem: ui
tags: [react, antd, vitest, testing-library, jsdom, tdd, gap-closure]

# Dependency graph
requires:
  - phase: 02-recipe-collection-makeable-engine
    provides: RecipeForm, IngredientListForm, UnitDropdown, GlasswareSelector, apiFetch (all from 02-05/02-06)
provides:
  - "UnitDropdown/GlasswareSelector fixed to forward Form.Item's value/onChange (root cause of G-02-6)"
  - "apiFetch surfaces the server's real {error} body instead of a generic message"
  - "RecipeForm's save-failure Alert renders the mutation's real error message"
  - "First RTL/jsdom test infrastructure in apps/barback (vitest environment: jsdom, setup.ts, testing-library deps)"
affects: [phase-3-patron-browse, phase-4-bartender-ordering]

# Actuals (#2632)
actuals:
  tokens: 4445
  tasks: 3
  commits: 4

tech-stack:
  added: ["@testing-library/react@16.3.2", "@testing-library/jest-dom@7.0.1", "@testing-library/user-event@14.6.3", "jsdom@30.0.1"]
  patterns:
    - "vitest environment: jsdom with setupFiles for jest-dom matchers + browser API stubs (matchMedia/ResizeObserver/scrollTo/scrollIntoView)"
    - "antd 6 Select test interaction: screen.getAllByRole('combobox') to find select triggers in DOM order, fireEvent.mouseDown to open, screen.findByTitle(optionLabel) to click the real (non-virtualized-mirror) option item"

key-files:
  created:
    - apps/barback/src/test/setup.ts
    - apps/barback/src/components/RecipeForm.test.tsx
    - apps/barback/src/api/client.test.ts
  modified:
    - apps/barback/src/components/UnitDropdown.tsx
    - apps/barback/src/components/GlasswareSelector.tsx
    - apps/barback/src/api/client.ts
    - apps/barback/src/components/RecipeForm.tsx
    - apps/barback/vitest.config.ts
    - apps/barback/package.json
    - .planning/phases/02-recipe-collection-makeable-engine/02-RESEARCH.md

key-decisions:
  - "Click antd 6 dropdown options via their title attribute, not role='option' — antd 6's virtualized Select (rc-virtual-list) renders role='option' only on a hidden 0x0 accessibility mirror with no click handler; the real clickable item is a plain .ant-select-item-option div carrying a title attribute matching the option label"
  - "Wired RecipeForm's save-failure Alert to the mutation's real error message (Rule 2 deviation, beyond Task 3's stated file scope) — the plan's must-have truth required the Alert to show the server's real validation message, but Task 3 only fixed apiFetch's thrown Error; RecipeForm's Alert was still static text disconnected from any mutation error until this fix"

patterns-established:
  - "Barback's first component test (RecipeForm.test.tsx) establishes the RTL+jsdom+antd interaction pattern other 02/03/04-phase form tests should reuse rather than rediscovering the role='option' pitfall"

requirements-completed: [RECIPE-01, RECIPE-02]

coverage:
  - id: D1
    description: "Selecting a unit for an ingredient line and saving the recipe submits that real unit value to POST /api/recipes, not undefined"
    requirement: "RECIPE-01"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/RecipeForm.test.tsx#RecipeForm > submits the selected unit as its real value, not undefined (G-02-6)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Selecting a glassware option and saving the recipe submits that real glasswareId value to POST /api/recipes, not undefined"
    requirement: "RECIPE-01"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/RecipeForm.test.tsx#RecipeForm > submits the selected glasswareId as its real value, not undefined (G-02-6)"
        status: pass
    human_judgment: false
  - id: D3
    description: "apiFetch surfaces the server's real {error} message on non-2xx responses instead of a generic message, with a safe fallback when no structured body is present"
    verification:
      - kind: unit
        ref: "apps/barback/src/api/client.test.ts#apiFetch > surfaces the server real error message from a structured error body (G-02-6)"
        status: pass
      - kind: unit
        ref: "apps/barback/src/api/client.test.ts#apiFetch > falls back to the generic message when the error body is not parseable JSON"
        status: pass
    human_judgment: false
  - id: D4
    description: "RecipeForm's save-failure Alert renders the server's real validation message instead of the generic 'check your connection' copy"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/RecipeForm.test.tsx#RecipeForm > shows the server's real validation message in the save-failure Alert, not the generic connection copy (G-02-6)"
        status: pass
    human_judgment: false
  - id: D5
    description: "End-to-end recipe create/edit through the real Barback UI in a browser (final human confirmation that G-02-6 is closed)"
    verification: []
    human_judgment: true
    rationale: "Automated tests cover the data-binding fix and error-surfacing fix at the component/unit level (jsdom), but this plan's own success_criteria calls for an end-of-phase browser UAT resumption (workflow.human_verify_mode: end-of-phase) to confirm the fix holds in the real Barback UI, not just under jsdom simulation."

duration: 35min
completed: 2026-08-11
status: complete
---

# Phase 02 Plan 07: Recipe Save Failure Fix (G-02-6) Summary

**Fixed UnitDropdown/GlasswareSelector's broken Form.Item value/onChange forwarding (100% recipe-save failure) and wired apiFetch's real server error message through to RecipeForm's Alert, backed by Barback's first RTL/jsdom regression tests.**

## Performance

- **Duration:** 35 min (this session; Task 0 checkpoint was resolved in a prior session)
- **Started:** 2026-08-11T16:04:00Z (approx, first file read this session)
- **Completed:** 2026-08-11T16:39:19Z
- **Tasks:** 3 (Task 0 checkpoint approval carried over from prior session)
- **Files modified:** 10

## Accomplishments
- Root-caused-and-fixed: `UnitDropdown` and `GlasswareSelector` now accept and forward `value`/`onChange` to their wrapped antd `<Select>`, so ingredient `unit` and recipe `glasswareId` reach `POST`/`PATCH /api/recipes` as their real chosen values instead of always being `undefined` — this was the 100%-reproducible cause of every recipe save failing (recipeInput requires `unit`, and every ingredient submission failed the shared Zod contract's `z.enum(...)`)
- `apiFetch` now reads and surfaces the server's real `{error}` message on non-2xx responses (with a safe fallback to the existing generic message when no structured body is present)
- `RecipeForm`'s save-failure `Alert` now renders that real message instead of a static, misleadingly network-sounding string (Rule 2 deviation — see below)
- Established Barback's first component-level test infrastructure: vitest `environment: jsdom`, `@testing-library/react`/`jest-dom`/`user-event`, and a `setup.ts` stubbing `matchMedia`/`ResizeObserver`/`scrollTo`/`scrollIntoView` for antd's internals
- Discovered and documented antd 6's Select testing pitfall: the dropdown's `role="option"` element is a virtualization-only accessibility mirror with no click handler; the real clickable item must be targeted via its `title` attribute

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): test infra + failing regression tests** - `2aa4d76` (test)
2. **Task 2 (GREEN): fix UnitDropdown/GlasswareSelector forwarding** - `46f4cbf` (feat) — includes a necessary in-flight correction to Task 1's test (click-by-title instead of click-by-role, discovered while turning RED green)
3. **Task 3 (GREEN): apiFetch surfaces real error message** - `a585933` (fix)
4. **Deviation (Rule 2): wire real error message into RecipeForm's Alert** - `acce131` (fix)

_Task 0 (checkpoint:human-verify, package-legitimacy gate) was resolved in the prior session — user approved all 4 dev dependencies before this session began._

## Files Created/Modified
- `apps/barback/src/components/UnitDropdown.tsx` - Now accepts/forwards `value`/`onChange` to the wrapped `Select`
- `apps/barback/src/components/GlasswareSelector.tsx` - Same fix, same pattern
- `apps/barback/src/api/client.ts` - `apiFetch` parses the error body and throws the server's real message when present
- `apps/barback/src/components/RecipeForm.tsx` - Save-failure `Alert` now renders the mutation's real error message
- `apps/barback/src/components/RecipeForm.test.tsx` - Regression guard: unit/glasswareId reach the POST payload; Alert shows the real validation message
- `apps/barback/src/api/client.test.ts` - Regression guard: `apiFetch` surfaces real error / falls back to generic message
- `apps/barback/src/test/setup.ts` - jest-dom matchers + antd-required jsdom stubs
- `apps/barback/vitest.config.ts` - `environment: 'jsdom'`, `setupFiles`
- `apps/barback/package.json` - Four new dev-only test dependencies (approved in Task 0 checkpoint)
- `.planning/phases/02-recipe-collection-makeable-engine/02-RESEARCH.md` - Package Legitimacy Audit table extended with the four new dev deps

## Decisions Made
- **antd 6 dropdown option targeting:** click by `title` attribute, not `role="option"` — traced via `@rc-component/select`'s `OptionList.js`: when `virtual` (default true), a hidden 0×0 `div[role=listbox]` renders `role="option"` items purely for screen-reader announcement (no click handler); the real, clickable item is rendered separately by `rc-virtual-list` as a plain `.ant-select-item-option` div carrying a `title` attribute equal to the option's label. This is now documented inline in `RecipeForm.test.tsx` for future form tests in this codebase.
- **RecipeForm Alert wiring (Rule 2):** Task 3 as literally scoped (files: `apps/barback/src/api/client.ts` only) fixed `apiFetch` to *carry* the real error message, but nothing in `RecipeForm.tsx` ever read `createRecipe.error`/`updateRecipe.error` — the Alert was hardcoded static text. This meant the plan's own must-have truth ("shows the server's real validation message in RecipeForm's Alert, not a generic 'check your connection' message") was not actually satisfied by Task 3 alone. Fixed as a Rule 2 deviation (missing critical functionality) and covered by a new regression test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected RecipeForm.test.tsx's own option-click targeting**
- **Found during:** Task 2 (GREEN) — RED test failures persisted after the UnitDropdown/GlasswareSelector fix, isolating that the test itself, not the fix, was wrong
- **Issue:** The RED-phase test clicked dropdown options via `screen.findByRole('option', { name })`, which matches antd 6's virtualized accessibility-mirror element (no click handler) rather than the real clickable `.ant-select-item-option` item
- **Fix:** Changed to `screen.findByTitle(optionLabel)`, which matches the real item's `title` attribute
- **Files modified:** `apps/barback/src/components/RecipeForm.test.tsx`
- **Verification:** `RecipeForm.test.tsx` passes after the fix, confirmed via direct debugging of the rendered DOM (`rc-virtual-list-holder` inspection)
- **Committed in:** `46f4cbf` (Task 2 commit)

**2. [Rule 2 - Missing Critical Functionality] Wired apiFetch's real error message into RecipeForm's Alert**
- **Found during:** Post-Task 3 review against the plan's must-have truths
- **Issue:** Plan's Task 3 only listed `apps/barback/src/api/client.ts` in scope, but the corresponding must-have truth ("A recipe save failure ... shows the server's real validation message in RecipeForm's Alert, not a generic 'check your connection' message") required `RecipeForm.tsx`'s Alert to actually render that message — it was still hardcoded static text
- **Fix:** Added `saveError`/`saveErrorMessage` derived from `createRecipe.error`/`updateRecipe.error`, rendered in the Alert with a safe fallback
- **Files modified:** `apps/barback/src/components/RecipeForm.tsx`, `apps/barback/src/components/RecipeForm.test.tsx` (new test)
- **Verification:** New test asserts the real message renders and the generic copy does not; full barback suite (10/10) and production build both green
- **Committed in:** `acce131`

---

**Total deviations:** 2 auto-fixed (1 test-infra bug, 1 missing critical functionality)
**Impact on plan:** Both necessary to make the plan's own stated must-haves true. No scope creep beyond closing G-02-6 as specified.

## Issues Encountered
- antd 6 replaced rc-select's `.ant-select-selector` DOM class with its own inline markup (`.ant-select-content`) — the plan's Task 1 action text assumed the older rc-select markup pattern. Resolved by targeting the stable `role="combobox"` input instead, and (per Deviation 1 above) targeting real dropdown items by `title` rather than `role="option"`.
- `getComputedStyle`/pseudo-element warnings from jsdom during antd Modal animation classes appear in test stderr — cosmetic noise, does not affect test correctness or pass/fail status.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- G-02-6 is closed at the automated-test level: full barback suite (`swipeVisuals.test.ts` + `RecipeForm.test.tsx` + `client.test.ts`, 10/10), production build/typecheck, and full server suite (67/67) all green.
- Per `workflow.human_verify_mode: end-of-phase`, an end-of-phase human-verify step should resume Phase 02's UAT from test 6 onward in the real browser to confirm the fix holds outside jsdom simulation (tracked as coverage item D5 above).
- No blockers for Phase 3 (Patron Browse Experience).

---
*Phase: 02-recipe-collection-makeable-engine*
*Completed: 2026-08-11*

## Self-Check: PASSED

All 9 created/modified files verified present on disk; all 4 task commit hashes (`2aa4d76`, `46f4cbf`, `a585933`, `acce131`) verified present in git log.
