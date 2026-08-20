---
phase: 03-patron-browse-experience
plan: 04
subsystem: ui
tags: [react, tanstack-query, tailwind, vitest, lucide-react]

requires:
  - phase: 03-patron-browse-experience (plan 01)
    provides: GET /api/recipes/:id, apps/patron workspace, useRecipes()/RecipeCard/MakeableIndicator
  - phase: 03-patron-browse-experience (plan 02)
    provides: RecipeBrowse container with the onSelect={() => {}} stub this plan replaces
  - phase: 03-patron-browse-experience (plan 05)
    provides: Socket.IO recipe:updated/inventory:changed invalidation of ['recipes'] — this plan's queryKey design is what lets that invalidation reach an open detail screen
provides:
  - "useRecipeDetail(recipeId) — TanStack Query hook under queryKey ['recipes', recipeId], the detail view's sole data source"
  - "RecipeDetail full-screen view: back control, placeholder hero, full tag list, category-only ingredient list, makeable badge, conditional missing-ingredients and description sections"
  - "RecipeBrowse real tap-to-detail navigation (viewingId state), replacing 03-02's no-op onSelect stub"
affects: [phase-3-uat, bartender-phase]

actuals:
  tokens: 3891
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Detail view fetches independently by id via its own useRecipeDetail(recipeId) query — never a snapshot object passed at tap-time — so TanStack Query's key-prefix invalidation of ['recipes'] also refreshes ['recipes', recipeId] (D-47)"
    - "List/detail two-state view ownership inside the container component (RecipeBrowse), mirroring Barback RecipesTab's view-state early-return pattern"
    - "Child-component mocking in container tests (vi.mock('./RecipeDetail.js', ...)) to decouple navigation assertions from the child's own independent data fetch"

key-files:
  created:
    - apps/patron/src/api/useRecipeDetail.ts
    - apps/patron/src/components/RecipeDetail.tsx
    - apps/patron/src/components/RecipeDetail.test.tsx
  modified:
    - apps/patron/src/components/RecipeBrowse.tsx
    - apps/patron/src/components/RecipeBrowse.test.tsx

key-decisions:
  - "Disambiguated RecipeDetail.test.tsx's missing-ingredients assertion by its distinguishing 'missing.' suffix (getByText(/Dry Vermouth missing\\./)) rather than the shared 'Not Available' string, since both the MakeableIndicator badge and the missing-ingredients line render that phrase on a red recipe."
  - "Used a tag fixture ('Classic') distinct from the ingredient fixture's categoryName ('Whiskey') to avoid the same getByText collision 03-02's SUMMARY documented for its own TagSubmenu/RecipeCard fixtures."

requirements-completed: [PATR-02, PATR-04, PATR-03]

coverage:
  - id: D1
    description: "useRecipeDetail(recipeId) fetches a single recipe under its own ['recipes', recipeId] query key, independent of the list query — the architectural basis for D-47 live-sync reaching an open detail screen"
    requirement: "PATR-04"
    verification:
      - kind: unit
        ref: "apps/patron/src/components/RecipeDetail.test.tsx (all 8 tests, mocking useRecipeDetail's return value)"
        status: pass
    human_judgment: false
  - id: D2
    description: "RecipeDetail renders D-39's full element set: placeholder hero, full (unsliced) tag list, category-only ingredient list, makeable badge, and the two conditional sections — missing-ingredients only on genuinely red recipes with non-empty missingCategoryNames, description only when non-empty"
    requirement: "PATR-02"
    verification:
      - kind: unit
        ref: "apps/patron/src/components/RecipeDetail.test.tsx"
        status: pass
      - kind: other
        ref: "grep -qi 'substitution|alternative' RecipeDetail.tsx (no match) and grep -q 'quantity|\\.unit' RecipeDetail.tsx (no match)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Tapping any RecipeBrowse card opens that drink's real detail view by id; tapping back returns to the grid"
    requirement: "PATR-03"
    verification:
      - kind: unit
        ref: "apps/patron/src/components/RecipeBrowse.test.tsx — 'shows RecipeDetail for the tapped card's id, then returns to the grid via its back control'"
        status: pass
      - kind: other
        ref: "pnpm --filter patron build (exit 0), pnpm -r build && pnpm -r test (monorepo-wide, exit 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Manual visual verification: tapping a red card shows its missing-ingredients line; tapping a yellow-collapsed card shows no false missing-ingredients callout; tapping back returns to the grid with the tag filter intact"
    verification: []
    human_judgment: true
    rationale: "Requires a running dev server and visual/interaction confirmation in a browser — this project's human_verify_mode is end-of-phase, matching 03-05's identical deferral of its own live-sync visual check."

duration: ~12min
completed: 2026-08-13
status: complete
---

# Phase 03 Plan 04: Patron Recipe Detail View Summary

**Full-screen RecipeDetail view (placeholder hero, full tags, category-only ingredients, conditional missing-ingredients/description sections) reachable by tapping any RecipeBrowse card, backed by an independent useRecipeDetail(recipeId) query so 03-05's live-sync invalidation reaches it — closes PATR-02/PATR-04 and the phase's guest-facing browse loop**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `useRecipeDetail(recipeId)`: `GET /recipes/:id` under its own `['recipes', recipeId]` query key — a genuinely separate cache entry from `useRecipes()`'s `['recipes']` list key, matched by TanStack Query's key-prefix invalidation so a Socket.IO `recipe:updated`/`inventory:changed` refresh (03-05) reaches an open detail screen without any extra wiring
- `RecipeDetail`: back control (Lucide `ChevronLeft`, circular button), decorative placeholder hero, full (unsliced) tag list, makeable badge, category-only ingredient list, a missing-ingredients line rendered only when `overallStatus === 'red'` AND `missingCategoryNames` is non-empty, and a description section rendered only when `description` is a non-empty/non-whitespace string
- `RecipeBrowse` now owns `viewingId` state and early-returns to `RecipeDetail` when set, replacing 03-02's `onSelect={() => {}}` stub — only the tapped card's `id` is ever passed on, never the fetched-list `Recipe` object
- Full monorepo build (`pnpm -r build`) and test suite (`pnpm -r test`) both pass with zero regressions: server 91/91, patron 28/28, barback 76/76

## Task Commits

Task 1 followed the TDD RED → GREEN cycle; Task 2 is a non-TDD `type="auto"` task per the plan's own frontmatter, committed as a single implementation-plus-tests commit:

1. **Task 1: useRecipeDetail hook + RecipeDetail component** — `9c7eaa6` (test, RED), `2272e2f` (feat, GREEN)
2. **Task 2: Wire real tap-to-detail navigation into RecipeBrowse** — `f617bda` (feat, includes RecipeBrowse.test.tsx additions)

## Files Created/Modified
- `apps/patron/src/api/useRecipeDetail.ts` — `useRecipeDetail(recipeId)`, `['recipes', recipeId]` query key
- `apps/patron/src/components/RecipeDetail.tsx` — full-screen detail view
- `apps/patron/src/components/RecipeDetail.test.tsx` — 8 tests covering every D-39 element and both conditional sections' exact render/no-render rules
- `apps/patron/src/components/RecipeBrowse.tsx` — `viewingId` state, real `onSelect` wiring, early-return to `RecipeDetail`
- `apps/patron/src/components/RecipeBrowse.test.tsx` — mocks `RecipeDetail` (its own fetch is out of scope here) and asserts tap-to-detail + back-to-grid navigation

## Decisions Made
- Disambiguated a test-selector collision in `RecipeDetail.test.tsx`: both the `MakeableIndicator` badge and the missing-ingredients line render "Not Available" text on a red recipe, so the missing-ingredients assertion targets the line's distinguishing `"missing."` suffix (`/Dry Vermouth missing\./`) instead.
- Chose a tag fixture name ("Classic") distinct from the ingredient fixture's `categoryName` ("Whiskey") to avoid the identical `getByText` ambiguity 03-02's SUMMARY documented for its own `TagSubmenu`/`RecipeCard` fixture collision.
- `RecipeBrowse`'s `if (viewingId)` early return is placed before the `isLoading`/`isError` checks (both hooks — `useState` and `useRecipes()` — are still called unconditionally first), matching the plan's specified ordering exactly.

## Deviations from Plan

None — plan executed as written. No Rule 1-4 auto-fixes were needed; the only adjustments were test-selector precision (not a code-behavior deviation), documented above.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- PATR-02 and PATR-04 are fully satisfied: the detail screen shows the placeholder hero, name, full tags, description (when present), ingredients, and — for genuinely red recipes — exactly which categories are missing, all sourced from a query architecture that already supports 03-05's live updates.
- This is the last plan in Phase 3 — after merge, the phase goal ("patron can browse the full drink menu and trust what they see, live") is code-complete. The manual/visual UAT items (D4 above, plus 03-05's own deferred D3) remain for end-of-phase verification per this project's `human_verify_mode: end-of-phase` config setting.
- No blockers.

---
*Phase: 03-patron-browse-experience*
*Completed: 2026-08-13*
