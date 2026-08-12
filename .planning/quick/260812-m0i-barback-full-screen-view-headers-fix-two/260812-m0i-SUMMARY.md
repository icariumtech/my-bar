---
phase: quick-260812-m0i
plan: 01
subsystem: barback-ui
tags: [react, antd, ui, ant-design-icons]
dependency-graph:
  requires:
    - phase: quick-260812-jz9
      provides: "established type=\"primary\" square icon-button treatment (48x48, accent green) this task's circular back button matches"
  provides: [barback-shared-full-screen-header]
  affects:
    - apps/barback/src/components/views/AddEditIngredientView.tsx
    - apps/barback/src/components/views/AddEditRecipeView.tsx
    - apps/barback/src/components/views/RecipeDetailView.tsx
    - apps/barback/src/components/CategoryManager.tsx
    - apps/barback/src/components/GlasswareManager.tsx
tech-stack:
  added: []
  patterns: ["shared FullScreenHeader component: 3-column fixed-left/flex-center/fixed-right layout for true title centering, circular icon-only accent back button (ArrowLeftOutlined, aria-label=\"Back\", 48x48) replacing plain-text \"← Back\" buttons"]
key-files:
  created:
    - apps/barback/src/components/FullScreenHeader.tsx
    - apps/barback/src/components/FullScreenHeader.test.tsx
  modified:
    - apps/barback/src/components/views/AddEditIngredientView.tsx
    - apps/barback/src/components/views/AddEditRecipeView.tsx
    - apps/barback/src/components/views/RecipeDetailView.tsx
    - apps/barback/src/components/CategoryManager.tsx
    - apps/barback/src/components/GlasswareManager.tsx
    - apps/barback/src/components/views/AddEditRecipeView.test.tsx
    - apps/barback/src/components/CategoryManager.test.tsx
    - apps/barback/src/components/GlasswareManager.test.tsx
decisions:
  - "Extracted a single FullScreenHeader component (fixed 48px left cell / flex:1 centered title / matching 48px empty right spacer) rather than patching each of the 5 views' inline header markup independently, eliminating the duplication and guaranteeing the centering fix applies identically everywhere"
  - "RecipeDetailView's UI-SPEC-documented Display-role (28px/600) title override is preserved via an optional titleStyle prop merged onto the shared component's <h2>, rather than being dropped or silently unified with the other 4 views' default Heading-role (20px/600) styling"
  - "Back button uses ArrowLeftOutlined (plain horizontal arrow) rather than LeftOutlined's chevron glyph, styled type=\"primary\" shape=\"circle\" 48x48 to match SearchFilterBar's established square Add-button accent treatment (260812-jz9)"
metrics:
  duration: 15min
  completed: 2026-08-12
status: complete
actuals:
  tokens: 2000
  tasks: 2
  commits: 3
---

# Quick Task 260812-m0i: Fix the shared full-screen header pattern (centering + icon-only back button) Summary

Extracted a reusable `FullScreenHeader` component and switched all 5 Barback full-screen views (Add/Edit Ingredient, Add/Edit Recipe, Recipe Detail, Manage Categories, Manage Glassware) onto it, fixing two confirmed bugs in the previously-duplicated inline header markup: the title now truly centers across the header's full width (3-column fixed-left/flex-center/fixed-right layout) instead of merely starting after the back button, and the plain-text "← Back" button is now a circular, accent-green, icon-only 48x48 control (`ArrowLeftOutlined`, `aria-label="Back"`).

## What Was Built

- **`FullScreenHeader.tsx`** (new): accepts `onBack`, `title`, and an optional `titleStyle`. Renders a `<header>` with a fixed 48px-wide left cell (circular `type="primary"` `Button`, `ArrowLeftOutlined` icon, `aria-label="Back"`, 48x48), a centered `<h2 className="text-white">` (`flex: 1, textAlign: 'center'`, merging in `titleStyle`), and a matching empty 48px-wide right spacer so the fixed-width button doesn't pull the title off-center. Preserves the exact `padding: 16` / border/flex values every prior inline header already used, so no unrelated visual regression.
- **`FullScreenHeader.test.tsx`** (new): TDD RED/GREEN pair — title renders, back button is icon-only (empty textContent) with 48x48 sizing and accessible name `"Back"`, clicking it calls `onBack`, and `titleStyle` overrides apply (verified against RecipeDetailView's 28px/600 case).
- **`AddEditIngredientView.tsx` / `AddEditRecipeView.tsx`**: inline header block replaced with `<FullScreenHeader onBack={onBack} title={...} />`; kept their `Button` import (still used by the Save submit button).
- **`RecipeDetailView.tsx`**: replaced with `<FullScreenHeader onBack={onBack} title={recipe.name} titleStyle={{ fontSize: 28, fontWeight: 600 }} />`, preserving its Display-role typography; dropped the now-unused `Button` import from `antd` (its only usage was the removed header).
- **`CategoryManager.tsx` / `GlasswareManager.tsx`**: `<header>` block replaced with `<FullScreenHeader onBack={handleClose} title="Manage Categories|Glassware" />`, still passing `handleClose` (resets local state before calling the real `onBack`, unchanged behavior). Kept their `Button` import (used elsewhere for rename/delete/add controls).
- **Test selector updates** (back-button queries that would break once the visible "← Back" text/arrow is gone): `AddEditRecipeView.test.tsx` changed from an exact-string `getByRole('button', { name: '← Back' })` to `{ name: 'Back' }`; `CategoryManager.test.tsx` and `GlasswareManager.test.tsx` changed from `getByText('← Back')` to `getByRole('button', { name: 'Back' })`. `AddEditIngredientView.test.tsx` and `RecipeDetailView.test.tsx` already used a `/Back/` regex against accessible name and needed no changes. No assertion was weakened — each still proves "clicking back calls `onBack`", just via accessible name instead of removed visible text.

Both tasks keep the existing 48px minimum touch-target convention and the same `type="primary"` accent-green (`#22c55e`) treatment already established by `SearchFilterBar`'s square Add button (260812-jz9) — no new color introduced.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- Task 1 TDD gate confirmed: with `FullScreenHeader.tsx` temporarily removed, `pnpm exec vitest run FullScreenHeader` failed (RED — unresolved import) before the component was restored and all 4 tests passed (GREEN).
- `pnpm --filter barback test`: 19 test files, 70 tests, all passed — no regressions elsewhere.
- `pnpm --filter barback build`: `tsc --noEmit` and production `vite build` both completed cleanly, no errors from the new component, the removed `Button` import in `RecipeDetailView.tsx`, or the new `FullScreenHeader` imports across the other 4 views.
- **Human visual check on a real device (iPad Safari / phone browser) is still required** — not performed as part of this automated execution (no working browser in the sandbox). Confirm on all 5 full-screen views: (1) the title is truly centered across the full header width; (2) the back button is a circular, green, icon-only control (no "← Back" text) sized as an obviously-tappable 48x48 target; (3) tapping it still navigates back correctly from every view; (4) RecipeDetailView's title still visually reads larger/bolder than the other 4 views' titles (Display vs. Heading role, unchanged).

## Self-Check: PASSED

- FOUND: apps/barback/src/components/FullScreenHeader.tsx
- FOUND: apps/barback/src/components/FullScreenHeader.test.tsx
- FOUND: apps/barback/src/components/views/AddEditIngredientView.tsx (wired to FullScreenHeader)
- FOUND: apps/barback/src/components/views/AddEditRecipeView.tsx (wired to FullScreenHeader)
- FOUND: apps/barback/src/components/views/RecipeDetailView.tsx (wired to FullScreenHeader, Button import removed)
- FOUND: apps/barback/src/components/CategoryManager.tsx (wired to FullScreenHeader)
- FOUND: apps/barback/src/components/GlasswareManager.tsx (wired to FullScreenHeader)
- FOUND: commit a193d4c (test: FullScreenHeader RED)
- FOUND: commit e6e2a5d (feat: FullScreenHeader GREEN)
- FOUND: commit 25b8f90 (feat: wire all 5 views + update 3 test selectors)
