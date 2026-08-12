---
quick_id: 260812-e8j
slug: fix-barback-top-section-anchoring-on-eac
subsystem: ui
tags: [react, tailwind, css-sticky, flexbox, barback]

requires:
  - phase: 260812-drh
    provides: BottomTabBar converted to position:fixed, removing it from flex-height accounting
provides:
  - App.tsx bounded to h-dvh/overflow-hidden with a genuine flex-1/min-h-0/overflow-y-auto scroll container replacing document/window-level scroll
  - IngredientsTab and RecipesTab each render their title+Add-button row and search/filter controls inside one merged position:sticky wrapper, reliably pinned against the new scroll container
  - IngredientList/RecipeList no longer own search/filter state — they receive query (and categoryId) as props
affects: [barback-ui, barback-layout]

actuals:
  tokens: 5300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "One bounded flex scroll container per app shell (h-dvh overflow-hidden flex flex-col > flex-1 min-h-0 overflow-y-auto), required for position:sticky headers to reliably pin on mobile Safari"
    - "State lift from list component to tab container so title row + filter controls can render as one sticky unit"

key-files:
  created:
    - apps/barback/src/components/IngredientsTab.test.tsx
  modified:
    - apps/barback/src/App.tsx
    - apps/barback/src/components/IngredientsTab.tsx
    - apps/barback/src/components/IngredientList.tsx
    - apps/barback/src/components/SearchFilterBar.tsx
    - apps/barback/src/components/RecipesTab.tsx
    - apps/barback/src/components/RecipeList.tsx
    - apps/barback/src/components/RecipesTab.test.tsx

key-decisions:
  - "Lifted query/categoryId state from IngredientList/RecipeList up to IngredientsTab/RecipesTab rather than introducing a new shared header component — smallest diff since SearchFilterBar was already a pure controlled component"
  - "App.tsx wraps only the tab content area in overflow-y-auto (not the whole shell) so BottomTabBar, already position:fixed, is unaffected by flex-height accounting"

requirements-completed: []

coverage:
  - id: D1
    description: "App.tsx has one genuine CSS scroll container (h-dvh/overflow-hidden shell, flex-1/min-h-0/overflow-y-auto content wrapper) replacing document/window-level scroll"
    verification:
      - kind: unit
        ref: "apps/barback && pnpm run build (tsc --noEmit + vite build)"
        status: pass
    human_judgment: true
    rationale: "position: sticky pinning behavior against mobile Safari's dynamic toolbar can only be confirmed by scrolling the real Ingredients/Recipes tabs on an actual iPad/phone — no browser was available in the execution sandbox (plan's own Verification section calls this out explicitly)."
  - id: D2
    description: "Ingredients tab: title+Add-button row and SearchFilterBar merged into one sticky wrapper; query/categoryId lifted from IngredientList to IngredientsTab"
    requirement: null
    verification:
      - kind: unit
        ref: "apps/barback/src/components/IngredientsTab.test.tsx#IngredientsTab (3 tests: initial render, name-search filtering, category-chip filtering)"
        status: pass
    human_judgment: true
    rationale: "Filtering logic is proven by tests; the visual pinning of the merged sticky header while scrolling can only be confirmed on a real device (same sandbox limitation as D1)."
  - id: D3
    description: "Recipes tab: title+Add-button row and search Input merged into one sticky wrapper; query lifted from RecipeList to RecipesTab"
    requirement: null
    verification:
      - kind: unit
        ref: "apps/barback/src/components/RecipesTab.test.tsx#RecipesTab (3 tests: existing detail-view test, existing back-button test, new name-search filtering test)"
        status: pass
    human_judgment: true
    rationale: "Filtering logic is proven by tests; visual pinning requires a real-device check (same sandbox limitation as D1)."

duration: 3min
completed: 2026-08-12
status: complete
---

# Quick Task 260812-e8j: Fix Barback top-section anchoring on each tab Summary

**Bounded App.tsx to one real CSS scroll container (`h-dvh` + `flex-1 min-h-0 overflow-y-auto`) and merged each tab's title/Add-button row with its search/filter bar into a single `position: sticky` wrapper, fixing headers that scrolled away instead of pinning.**

## Performance

- **Duration:** ~3 min (execution only; excludes prior planning)
- **Tasks:** 3/3 completed
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- `App.tsx`'s outer shell now uses `h-dvh overflow-hidden flex flex-col`, with tab content wrapped in `flex-1 min-h-0 overflow-y-auto` — the one genuine CSS scroll container the whole app scrolls inside, replacing document/window-level scroll. `BottomTabBar` (already `position: fixed`) is unaffected.
- `IngredientsTab` now owns `query`/`categoryId` state (lifted from `IngredientList`) and renders the title+Add-button row together with `SearchFilterBar` inside one `position: sticky` wrapper.
- `RecipesTab` now owns `query` state (lifted from `RecipeList`) and renders the title+Add-button row together with the search `Input` inside one `position: sticky` wrapper.
- `IngredientList`/`RecipeList` no longer own search/filter state — they're pure props-driven filter+render components now, with all four loading/error/true-empty/filtered-empty states unchanged.
- New `IngredientsTab.test.tsx` (3 tests) and one added test in `RecipesTab.test.tsx` prove the state lift didn't break search/filter wiring.

## Task Commits

Each task was committed atomically:

1. **Task 1: App.tsx bounded shell + genuine scroll container** - `b62b744` (feat)
2. **Task 2: Ingredients tab merged sticky header + state lift** - `7616be4` (feat)
3. **Task 3: Recipes tab merged sticky header + state lift** - `92e4087` (feat)

_No separate plan-metadata commit — quick task docs commit is handled by the orchestrator._

## Files Created/Modified

- `apps/barback/src/App.tsx` - Bounded shell (`h-dvh overflow-hidden flex flex-col`) with a new `flex-1 min-h-0 overflow-y-auto` scroll-container wrapper around tab content
- `apps/barback/src/components/IngredientsTab.tsx` - Owns `query`/`categoryId` state; renders merged sticky header (title/Add-button row + `SearchFilterBar`)
- `apps/barback/src/components/IngredientList.tsx` - Receives `query`/`categoryId` as required props instead of owning them; sticky search-bar wrapper removed (now rendered by the tab)
- `apps/barback/src/components/SearchFilterBar.tsx` - Comment-only update (state now held by `IngredientsTab`, not `IngredientList`)
- `apps/barback/src/components/IngredientsTab.test.tsx` - New: initial render, name-search filtering, category-chip filtering regression tests
- `apps/barback/src/components/RecipesTab.tsx` - Owns `query` state; renders merged sticky header (title/Add-button row + search `Input`)
- `apps/barback/src/components/RecipeList.tsx` - Receives `query` as a required prop instead of owning it; sticky search-input wrapper removed (now rendered by the tab)
- `apps/barback/src/components/RecipesTab.test.tsx` - Added name-search filtering regression test (existing two tests untouched)

## Decisions Made

- Lifted state up to the tab containers rather than introducing a new shared header component — `SearchFilterBar` was already a pure controlled component, so this was the smallest-diff option (matches the plan's stated rationale).
- Kept `BottomTabBar` outside the new `overflow-y-auto` wrapper, as a sibling after it — no functional difference since it's `position: fixed`, but keeps DOM order matching the pre-existing structure.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Ingredients and Recipes tabs both have a single pinned header (title/Add-button + search/filter) sitting inside one real scroll container.
- Settings tab automatically inherits the new bounded scroll container with no changes needed (no search/filter bar, no scrolling list).
- **Human visual verification still required on a real device** (iPad Safari and/or phone browser) — this was planned and executed without a working browser in the sandbox, per the plan's own Verification section. Specifically confirm: (1) title+Add-button row and search bar/filter chips stay pinned together while the list scrolls beneath them on both tabs; (2) full-screen Add/Edit/Detail/Categories/Glassware sub-views still scroll correctly, now nested one level deeper inside the new scroll container; (3) BottomTabBar remains visible and tappable on every screen.

---
*Quick task: 260812-e8j*
*Completed: 2026-08-12*

## Self-Check: PASSED

All 8 created/modified files verified present on disk. All 3 task commits (`b62b744`, `7616be4`, `92e4087`) verified present in git log.
