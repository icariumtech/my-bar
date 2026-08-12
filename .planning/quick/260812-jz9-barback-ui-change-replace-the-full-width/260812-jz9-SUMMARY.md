---
phase: quick-260812-jz9
plan: 01
subsystem: barback-ui
tags: [react, antd, ui, tailwind]
dependency-graph:
  requires: []
  provides: [barback-inline-square-add-button]
  affects: [apps/barback/src/components/SearchFilterBar.tsx, apps/barback/src/components/IngredientsTab.tsx, apps/barback/src/components/RecipesTab.tsx]
tech-stack:
  added: []
  patterns: ["inline square icon-only add button (48x48, type=\"primary\", aria-label as accessible name) beside a search Input, replacing a separate full-width text button row"]
key-files:
  created:
    - apps/barback/src/components/SearchFilterBar.test.tsx
  modified:
    - apps/barback/src/components/SearchFilterBar.tsx
    - apps/barback/src/components/IngredientsTab.tsx
    - apps/barback/src/components/RecipesTab.tsx
decisions:
  - "SearchFilterBar gained required onAdd/addLabel props and owns the square button (used by IngredientsTab); RecipesTab replicates the identical button markup directly in its own JSX instead of routing through SearchFilterBar, since Recipes has no category-chip row to justify sharing that component"
  - "RecipesTab's search Input bumped to size=\"large\" + style={{ minHeight: 48 }} (previously unset/default ~32px) so its row resolves to the same 48px height as the new button, matching SearchFilterBar's Input sizing"
metrics:
  duration: 12min
  completed: 2026-08-12
status: complete
actuals:
  tokens: 2400
  tasks: 2
  commits: 3
---

# Quick Task 260812-jz9: Replace full-width "Add {Item}" button with an inline square "+" icon button Summary

Replaced the full-width "Add Ingredient"/"Add Recipe" text button row on both Barback tabs with a 48x48 square, icon-only "+" button placed inline beside each tab's search input.

## What Was Built

- **`SearchFilterBar.tsx`**: added required `onAdd: () => void` and `addLabel: string` props. The Input (unchanged props, now `className="flex-1"`) and a new square `Button` (`type="primary"`, `icon={<PlusOutlined />}`, no text, `aria-label={addLabel}`, `style={{ width: 48, height: 48, minWidth: 48, padding: 0 }}`) sit together in a new `flex gap-sm items-center` row. The category-chip row below is unchanged.
- **`SearchFilterBar.test.tsx`** (new file): TDD RED/GREEN pair covering (1) the square button renders with the correct accessible name and resolves to 48x48 via `toHaveStyle`, and (2) clicking it calls `onAdd` while the search Input remains intact.
- **`IngredientsTab.tsx`**: removed the standalone `<div className="flex justify-end pb-md">` "Add Ingredient" button row; now passes `onAdd={openAdd}` and `addLabel="Add Ingredient"` into `SearchFilterBar`. Dropped the now-unused `Button`/`PlusOutlined` imports.
- **`RecipesTab.tsx`**: removed the standalone "Add Recipe" button row. Replaced the lone `Input` with a `flex gap-sm items-center` row containing the `Input` (now `size="large"`, `style={{ minHeight: 48 }}`, `className="flex-1"`) and an identically-styled square `Button` (`aria-label="Add Recipe"`, `onClick={openAdd}`).
- Both tabs' leading comment blocks updated to document the 260812-jz9 change and its rationale.

Both tabs keep the existing 48px minimum touch-target convention and `type="primary"` accent-green styling — no new color introduced.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `pnpm exec vitest run SearchFilterBar` (TDD RED confirmed failing before implementation, then GREEN): 2/2 tests pass.
- `pnpm exec vitest run IngredientsTab RecipesTab SearchFilterBar`: 8/8 tests pass, `IngredientsTab.test.tsx`/`RecipesTab.test.tsx` unmodified (their `getByRole('button', { name: /Add Recipe/ })` queries still match via the new `aria-label`).
- `pnpm --filter barback test`: 18 test files, 66 tests, all passed — no regressions elsewhere.
- `pnpm --filter barback build`: `tsc --noEmit` and production `vite build` both completed cleanly, no errors from the changed/removed imports.
- **Human visual check on a real device (iPad Safari / phone browser) is still required** — not performed as part of this automated execution (no working browser in the sandbox). Confirm: neither tab shows a full-width text button anymore; a square green "+" sits beside each search input at the same height as the input; tapping it opens the correct Add view; the button remains an easy 48x48 touch target.

## Self-Check: PASSED

- FOUND: apps/barback/src/components/SearchFilterBar.tsx (onAdd/addLabel props + square button)
- FOUND: apps/barback/src/components/SearchFilterBar.test.tsx
- FOUND: apps/barback/src/components/IngredientsTab.tsx (button row removed, wired to SearchFilterBar)
- FOUND: apps/barback/src/components/RecipesTab.tsx (button row removed, inline square button added)
- FOUND: commit 5ded93e (test)
- FOUND: commit de2f7ee (feat: SearchFilterBar)
- FOUND: commit 98b4b58 (feat: IngredientsTab/RecipesTab wiring)
