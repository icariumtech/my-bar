---
phase: 01-barback-inventory-foundation
plan: 05
subsystem: inventory-search-and-layout
tags: [react, antd, tailwindcss-v4, tanstack-query]

# Dependency graph
requires:
  - "Ingredient shape { id, name, categoryId, categoryName, note, inStock } (plan 01-01)"
  - "useIngredients()/useCategories() TanStack Query hooks (plans 01-01, 01-02)"
  - "IngredientRow, swipeable stock toggle (plan 01-03)"
provides:
  - "SearchFilterBar component: controlled name-search Input + category filter chips"
  - "IngredientList now owns query/categoryId state and filters the cached ingredients array in memory (useMemo)"
  - "IngredientList renders all four non-populated states: loading (Spin), error (Alert + Retry), true-empty, filtered-empty"
  - "safe-area-inset-top/-bottom CSS utilities and body/heading typography tokens in index.css"
  - "theme-color meta in index.html"
affects: [phase-2-recipes-makeable-engine]

# Actuals (#2632)
actuals:
  tokens: 2409
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side in-memory filtering over a TanStack Query cache: useMemo keyed on [source data, query, categoryId], no query parameter ever added to the fetch — at the project's 50-100 bottle scale, a round-trip per keystroke would visibly lag the one interaction that most needs to feel instant"
    - "Non-populated states distinguished by the UNFILTERED list's length, not the filtered result's length — prevents a mistyped search from reading as data loss (true-empty vs filtered-empty)"
    - "antd v6 API: Spin's label prop is `description` (not `tip`), Alert's text prop is `title` (not `message`) — both deprecated-but-still-typed aliases exist in v6, this plan uses the non-deprecated prop"

key-files:
  created:
    - apps/barback/src/components/SearchFilterBar.tsx
  modified:
    - apps/barback/src/components/IngredientList.tsx
    - apps/barback/src/index.css
    - apps/barback/index.html

key-decisions:
  - "Search matches both bottle name and category name from one input, case-insensitively, substring (not prefix) — INV-04 asks for search 'by name or category' without specifying, and one input covering both removes a decision the owner shouldn't have to make at the bar"
  - "No debounce on the filter — it's a synchronous in-memory scan over ~50-100 rows, so debouncing would only add latency to the interaction that most needs to feel instant"
  - "Active category chip uses antd's built-in accent token (bg-bar-accent) with dark text for contrast; unselected chips use the secondary surface token, never a tint of accent — matches the UI-SPEC's accent-reserved-for-three-uses rule"
  - "Clear affordance is antd Input's built-in allowClear rather than a hand-built clear button — same one-handed reset behavior with less custom code"

patterns-established:
  - "SearchFilterBar is a pure controlled component (query/categoryId/handlers as props) — no internal state — so the parent (IngredientList) can memoize the filtered array against the same values it drives the controls with"

requirements-completed: [INV-04, INV-05]

coverage:
  - id: D1
    description: "The owner can type part of a bottle name and the list narrows as they type, with no perceptible delay"
    requirement: INV-04
    verification:
      - kind: unit
        ref: "grep-verified: IngredientList.tsx filters via useMemo with toLowerCase().includes() against name and categoryName, no ?q=/search= parameter added to useIngredients.ts or IngredientList.tsx"
        status: pass
    human_judgment: true
    rationale: "The filter logic is provably synchronous and client-side (grep-verified, no network round-trip per keystroke), but confirming the list actually narrows with 'no perceptible delay' on a real phone requires human eyes/hands — deferred to end-of-phase UAT per config.json's human_verify_mode: end-of-phase, per this plan's own scripted human-check in Task 1's <verify>."
  - id: D2
    description: "The owner can filter to a single category by tapping a chip, and combine that with a typed query"
    requirement: INV-04
    verification:
      - kind: unit
        ref: "grep-verified: IngredientList.tsx's filter predicate ANDs matchesCategory and matchesQuery; SearchFilterBar renders an 'All' chip plus one chip per useCategories() result"
        status: pass
    human_judgment: true
    rationale: "Source inspection confirms the AND logic exists; confirming the chip visibly shows as active and the combination behaves correctly on a touchscreen is a human-verify item, deferred to end-of-phase UAT."
  - id: D3
    description: "Every interactive target (search input, chips, rows, Add button) is at least 48px, and the search bar stays within thumb reach via sticky positioning"
    requirement: INV-05
    verification:
      - kind: unit
        ref: "grep-verified: SearchFilterBar's Input and CategoryChip both set style={{ minHeight: 48 }}; IngredientList wraps SearchFilterBar in a sticky top-0 container"
        status: pass
    human_judgment: true
    rationale: "Tap-target sizing is grep-verified in source, but confirming the screen is actually comfortable one-handed on a real phone in dim light is the scripted human-check in Task 2's <verify>, deferred to end-of-phase UAT."
  - id: D4
    description: "With zero ingredients ever added, the list shows 'No ingredients yet' / 'Add your first bottle to start tracking inventory.'; a filtered-zero-results state shows the visually distinct 'No matches for {query}'"
    verification:
      - kind: unit
        ref: "grep-verified: both copy strings present in IngredientList.tsx; hasAnyIngredients vs hasFilteredResults are two independent booleans (unfiltered length vs filtered length), not one derived from the other"
        status: pass
    human_judgment: false
  - id: D5
    description: "Loading and error states render distinctly: an antd Spin with 'Loading inventory…' while the first fetch is pending, and an antd Alert 'Couldn't load inventory — check your connection and try again.' with a working Retry button on failure"
    verification:
      - kind: unit
        ref: "grep-verified: both copy strings present, Retry button's onClick calls refetch() from useIngredients()"
        status: pass
      - kind: other
        ref: "production bundle scan: grep -o 'Loading inventory'/'No matches for'/'No ingredients yet' apps/barback/dist/assets/*.js all found post-build, confirming the strings survive minification"
        status: pass
    human_judgment: false
  - id: D6
    description: "The screen stays in the dark utilitarian palette (D-11/D-12): body/heading typography and safe-area padding added to index.css do not introduce new colors or the Patron dark-neon aesthetic"
    verification:
      - kind: unit
        ref: "grep-verified: only #18181b (dominant) referenced in the new CSS/HTML additions; no new hex colors introduced; test ! -f apps/barback/tailwind.config.js confirms CSS-first Tailwind v4 configuration is unchanged"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-10
status: complete
---

# Phase 1 Plan 5: Search, Filter, and One-Handed Layout Summary

**In-memory name/category search with useMemo, antd category filter chips, and the full loading/error/empty/filtered-empty state set — closing INV-04 and INV-05 with zero additional network requests and 48px tap targets throughout.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-10T14:32:00Z (approx)
- **Completed:** 2026-08-10T14:52:39Z
- **Tasks:** 2
- **Files modified:** 4 (1 new, 3 extended)

## Accomplishments

- New `SearchFilterBar.tsx`: a controlled component (query, categoryId, and their change handlers as props, no internal state) rendering an antd `Input` with `allowClear` and a `SearchOutlined` prefix, plus a horizontally scrollable row of category chips built from `useCategories()` with an "All" chip first — the active chip uses the UI-SPEC's reserved accent color, unselected chips use the secondary surface token
- `IngredientList.tsx` now owns `query`/`categoryId` state and filters the already-cached `useIngredients()` array in memory via `useMemo`, matching case-insensitively on both `ingredient.name` and `ingredient.categoryName` as substrings — no query parameter was added to the ingredients fetch and no server-side search endpoint exists, verified by a `grep -Eq '\?q=|[?&]search='` negative check across both files
- `IngredientList.tsx` renders all four non-populated states, each visually distinct: an antd `Spin description="Loading inventory…"` while `isPending`; an antd `Alert type="error" title="Couldn't load inventory — check your connection and try again."` with a Retry button calling `refetch()` while `isError`; the true-empty state when the unfiltered list has zero rows; and the filtered-empty state ("No matches for '{query}'", query rendered as an escaped JSX text child per T-01-20) when the unfiltered list has rows but the filtered result doesn't — the two empty states are driven by two independent booleans derived from different array lengths, so a mistyped search can never look like the never-added-anything state
- `index.css` gained the D-13 typography scale (body 16px/1.5/400, headings 20px/600) applied globally via tag selectors, plus `.safe-area-inset-top`/`.safe-area-inset-bottom` utilities using `env(safe-area-inset-*)`, applied to the sticky search bar wrapper and the bottom of the ingredient list so neither sits under a notch or the home indicator on `viewport-fit=cover`
- `index.html` gained a `theme-color` meta of `#18181b` so the browser chrome matches the dark surface instead of flashing white; the existing `viewport-fit=cover` meta (already present from plan 01-01) was left as-is
- Confirmed all new copy strings survive production minification by grepping the built `dist/assets/*.js` bundle directly after `pnpm --filter barback build`

## Task Commits

Each task was committed atomically:

1. **Task 1: Add name search and category filtering over the cached list** — `81ab38c` (feat)
2. **Task 2: Complete the interface states and the one-handed mobile layout** — `c990e49` (feat)

_No separate plan-metadata commit in worktree mode — the orchestrator commits STATE.md/ROADMAP.md centrally after the wave merges. This plan's SUMMARY.md is committed separately per worktree-mode convention._

## Files Created/Modified

- `apps/barback/src/components/SearchFilterBar.tsx` (new) — controlled name-search input + category filter chips
- `apps/barback/src/components/IngredientList.tsx` — owns query/categoryId state, in-memory filtering, all four non-populated states
- `apps/barback/src/index.css` — typography scale, safe-area-inset utilities
- `apps/barback/index.html` — `theme-color` meta

## Decisions Made

- **Search covers both name and category name from one input, not two separate controls:** INV-04 says "by name or category" without specifying whether that's one field or two; one field is the fewest decisions for the owner mid-shift.
- **No debounce:** the filter is a synchronous in-memory scan, so a debounce would only add latency to the one interaction most needing to feel instant, per the plan's explicit instruction.
- **Active chip styling:** `bg-bar-accent` (the UI-SPEC's reserved accent token) with dark text for contrast, rather than introducing a new color — keeps the palette to the four documented roles.
- **`allowClear` (antd's built-in) instead of a hand-rolled clear button:** meets the "clear affordance ... without selecting text" requirement with less custom code and antd's own accessible implementation.

## Deviations from Plan

None — plan executed exactly as written. Both antd v6 API details the plan called out explicitly (`Spin`'s `description` prop instead of the deprecated `tip`, `Alert`'s `title` prop instead of the deprecated `message`) were verified directly against the installed `antd@6.5.4` package's `.d.ts` files before writing the code, so no build-time correction was needed.

## Issues Encountered

None. `pnpm install` had to be run at the start of this plan's execution because this worktree was created without `node_modules` — a one-time setup step, not a deviation from the plan's own scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- INV-04 and INV-05 are both satisfied by this plan; combined with plans 01-01 through 01-04, every Active requirement scoped to Phase 1's Barback screen is now implemented.
- The scripted human-checks in both tasks' `<verify>` blocks (search feels instant, chips combine correctly, the screen is comfortably one-handed in dim light, all four states render distinctly on a real device) are deferred to end-of-phase UAT per `config.json`'s `human_verify_mode: "end-of-phase"` — flagging here so they aren't lost before that gate.
- The one `⚠ unresolved` UI-SPEC consideration (zero-categories-exist state) was already resolved by plan 01-02's inline category creation — nothing outstanding from this plan's scope.
- No blockers for Phase 2 (Recipes / Makeable Engine): this plan touched only Barback presentation-layer files and added no new server surface, so the FK-enforced schema and write paths from plans 01-01/01-02/01-03 are unaffected.

## Self-Check: PASSED

All created/modified files confirmed on disk: `apps/barback/src/components/SearchFilterBar.tsx`, `apps/barback/src/components/IngredientList.tsx`, `apps/barback/src/index.css`, `apps/barback/index.html`. Both task commit hashes (`81ab38c`, `c990e49`) confirmed present in `git log --oneline --all`.

---
*Phase: 01-barback-inventory-foundation*
*Completed: 2026-08-10*
