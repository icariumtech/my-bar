---
phase: quick
plan: 260818-q7y
subsystem: ui
tags: [react, bartender, layout, css]

# Dependency graph
requires:
  - phase: 04-bartender-console-order-workflow
    provides: RecipeSearchFilter and RecipeOrOrderDetail full-screen sub-views
provides:
  - Bartender-local FullScreenScrollArea shared layout component (header + scrollable clearance)
  - RecipeSearchFilter Clear/Apply buttons now reachable above the fixed BottomTabBar
affects: [bartender full-screen views, future bartender full-screen sub-views]

actuals:
  tokens: 3503
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "FullScreenScrollArea: single shared header+scrollable-clearance wrapper for Bartender full-screen sub-views — all screen content, including bottom action buttons, must be passed as children so it renders inside the paddingBottom clearance reserved for the fixed BottomTabBar"

key-files:
  created:
    - apps/bartender/src/components/FullScreenScrollArea.tsx
    - apps/bartender/src/components/FullScreenScrollArea.test.tsx
  modified:
    - apps/bartender/src/components/RecipeSearchFilter.tsx
    - apps/bartender/src/components/RecipeOrOrderDetail.tsx

key-decisions:
  - "FullScreenScrollArea is Bartender-local (not imported from apps/barback) since the two apps are separate bundles, mirroring the existing note in RecipeOrOrderDetail.tsx about not cross-importing"
  - "RecipeSearchFilter's Clear/Apply button row relocated from a standalone footer <div> after <main> to the last item inside the scrollable, padded content — same convention already used by RecipeOrOrderDetail's Done button and Barback's AddEditIngredientView Save button"

patterns-established:
  - "Pattern: any Bartender full-screen sub-view must render ALL of its content (including bottom action buttons) as FullScreenScrollArea's children — never as a sibling — or it will render underneath the fixed BottomTabBar"

requirements-completed: []

coverage:
  - id: D1
    description: "FullScreenScrollArea shared layout component (header + one scrollable, clearance-padded <main>) extracted for Bartender's full-screen sub-views"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/FullScreenScrollArea.test.tsx#renders the title and calls onBack when the Back button is clicked"
        status: pass
      - kind: unit
        ref: "apps/bartender/src/components/FullScreenScrollArea.test.tsx#renders children reachably inside the scrollable content"
        status: pass
    human_judgment: false
  - id: D2
    description: "RecipeSearchFilter's Clear/Apply buttons moved inside the scrollable clearance so they are never hidden underneath the fixed BottomTabBar"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/RecipeSearchFilter.test.tsx (full suite, unmodified, still passing against new structure)"
        status: pass
      - kind: integration
        ref: "pnpm --filter bartender build (typecheck + production build)"
        status: pass
    human_judgment: true
    rationale: "The bug was a visual/physical reachability issue (buttons rendered underneath a fixed-position tab bar) — automated tests confirm the DOM structure and behavior are correct, but confirming the buttons are visually clear of the tab bar on-device is a judgment call outside jsdom's rendering model."
  - id: D3
    description: "RecipeOrOrderDetail refactored onto the same shared FullScreenScrollArea component with no behavioral/visual regression"
    verification:
      - kind: unit
        ref: "apps/bartender/src/components/RecipeOrOrderDetail.test.tsx (full suite, unmodified, still passing against new structure)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-08-19
status: complete
---

# Quick Task 260818-q7y: Fix Bartender Search & Filter clearance bug Summary

**Extracted a shared `FullScreenScrollArea` layout component and moved RecipeSearchFilter's Clear/Apply buttons from a standalone footer div into the scrollable, tab-bar-clearance-padded content region.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-08-18T23:49:00Z
- **Completed:** 2026-08-19T00:01:11Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created `FullScreenScrollArea`, a Bartender-local shared component providing the header + single scrollable `<main>` (with `paddingBottom` clearance for the fixed `BottomTabBar`) layout shape, with an inline comment explicitly warning against repeating the sibling-footer mistake
- Fixed RecipeSearchFilter's Clear/Apply buttons: relocated from a standalone `<div>` footer rendered after `<main>` (unreachable, hidden underneath the fixed `BottomTabBar`) to the last row inside the scrollable, padded content
- Refactored RecipeOrOrderDetail onto the same shared component, eliminating duplicated header/main scaffolding between the two full-screen sub-views

## Task Commits

Each task was committed atomically:

1. **Task 1: Create shared FullScreenScrollArea layout component** - `725c95e` (feat)
2. **Task 2: Wire RecipeSearchFilter and RecipeOrOrderDetail onto the shared wrapper, fixing the Clear/Apply clearance bug** - `664882c` (fix)

_Note: docs/state commit made separately by the orchestrator._

## Files Created/Modified
- `apps/bartender/src/components/FullScreenScrollArea.tsx` - New shared header+scrollable-clearance layout component
- `apps/bartender/src/components/FullScreenScrollArea.test.tsx` - Two tests: title/onBack, and children rendering reachably
- `apps/bartender/src/components/RecipeSearchFilter.tsx` - Now uses FullScreenScrollArea; Clear/Apply row moved inside children
- `apps/bartender/src/components/RecipeOrOrderDetail.tsx` - Now uses FullScreenScrollArea via `titleStyle` for its Display-role typography

## Decisions Made
- Kept `FullScreenScrollArea` Bartender-local (not shared cross-app with `apps/barback/src/components/FullScreenHeader.tsx`) since the two apps are separate bundles — matches the plan's explicit instruction and the existing pattern already noted in `RecipeOrOrderDetail.tsx`'s prior comments.
- Removed the redundant `padding`/`borderTop` styling from RecipeSearchFilter's Clear/Apply row since it's no longer a separate footer bar — it's simply the final row inside the scrollable content, consistent with `AddEditIngredientView.tsx`'s Save button placement.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `RecipeSearchFilter.test.tsx` and `RecipeOrOrderDetail.test.tsx` both passed unmodified against the new structure, as the plan anticipated (they query by role/text, not DOM position).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Bartender's two full-screen sub-views now share one layout wrapper; a future full-screen view (e.g. any new Bartender modal-replacement screen) should use `FullScreenScrollArea` from the start to avoid reintroducing this bug class.
- No blockers.

---
*Phase: quick*
*Completed: 2026-08-19*
