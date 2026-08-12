---
quick_id: 260812-drh
slug: fix-barback-layout-1-bottomtabbar-isn-t-
status: complete
subsystem: barback
tags: [layout, css, bugfix]
key-files:
  created: []
  modified:
    - apps/barback/src/components/BottomTabBar.tsx
    - apps/barback/src/components/views/AddEditIngredientView.tsx
    - apps/barback/src/components/views/AddEditRecipeView.tsx
    - apps/barback/src/components/views/RecipeDetailView.tsx
    - apps/barback/src/components/CategoryManager.tsx
    - apps/barback/src/components/GlasswareManager.tsx
decisions:
  - "260812-drh: BottomTabBar switched from position:sticky to position:fixed — sticky never pulls an already-offscreen element into view, and every full-screen sub-view (Add/Edit/Detail/Manager) is its own min-height:100vh flex column that pushes the bar's static-flow position past the fold before scroll even happens."
  - "260812-drh: fixed positioning makes the bar visible over ALL screens (not just the 3 list tabs), so the 5 full-screen sub-views needed new bottom padding on their scrollable <main> to keep their last field/action button from being obscured."
actuals:
  tokens: 4200
  tasks: 2
  commits: 2
completed: 2026-08-12
---

# Quick Task 260812-drh: Fix Barback layout — BottomTabBar isn't visible on full-screen sub-views Summary

BottomTabBar was `position: sticky`, which only pins an element while scrolling past its natural document-flow position — it never pulls an element back into view if that position already starts below the fold. Every Barback full-screen sub-view (Add/Edit Ingredient, Add/Edit Recipe, Recipe Detail, Categories, Glassware) renders as a `min-height: 100vh` flex column that exactly (or more than) fills the viewport, so the tab bar — rendered as its sibling right after in `App.tsx` — started its natural position at or past the viewport bottom on every one of those five screens. `sticky` never engaged, and the bar was invisible without an extra scroll.

## What Changed

**Task 1 — `apps/barback/src/components/BottomTabBar.tsx`:** Switched the wrapper from `position: sticky; bottom: 0; width: 100%` to `position: fixed; bottom: 0; left: 0; right: 0; width: 100%; zIndex: 10`, with `paddingBottom: env(safe-area-inset-bottom)` and a solid `backgroundColor` (`#18181b`, matching `--color-bar-bg`) so the safe-area strip isn't transparent over scrolled content. `fixed` guarantees the bar stays anchored to the true viewport bottom regardless of preceding sibling height.

**Task 2 — five full-screen views:** Because the bar is now a fixed overlay visible on every screen (previously it only "worked" — sort of — on the three list tabs, which already reserve `pb-3xl` bottom padding), each full-screen sub-view's scrollable `<main style={{ flex: 1, padding: 16, overflow: 'auto' }}>` needed matching bottom clearance so its last form field / primary action button isn't hidden underneath the bar:
- `AddEditIngredientView.tsx`
- `AddEditRecipeView.tsx`
- `RecipeDetailView.tsx`
- `CategoryManager.tsx`
- `GlasswareManager.tsx`

Each got `paddingBottom: 'calc(16px + 48px + env(safe-area-inset-bottom))'` (existing 16px padding + the bar's 48px min-height + safe-area inset).

## Verification

- `cd apps/barback && pnpm test --run` — 16 test files, 58 tests, all passing (before and after).
- `cd apps/barback && pnpm run build` (runs `@my-bar/shared` build → `tsc --noEmit` → `vite build`) — clean typecheck, successful production build. (A bare `tsc -p tsconfig.json --noEmit` without first building the `@my-bar/shared` workspace dependency shows pre-existing `Cannot find module '@my-bar/shared'` errors — this is a workspace build-ordering artifact unrelated to this change; the full `pnpm run build` script, which builds the dependency first, is clean.)

## Deviations from Plan

None — plan executed exactly as written. One clarification during execution: the plan file referenced in the executor's `<files_to_read>` did not exist on disk when this task started (no prior planning artifact for `260812-drh` existed anywhere in the repo or its branches), so this executor created `260812-drh-PLAN.md` itself (acting as planner) before implementing, based on direct investigation of `BottomTabBar.tsx`/`App.tsx`/the five full-screen view components to identify the root cause.

## Self-Check

- FOUND: apps/barback/src/components/BottomTabBar.tsx (position: fixed)
- FOUND: apps/barback/src/components/views/AddEditIngredientView.tsx (paddingBottom clearance)
- FOUND: apps/barback/src/components/views/AddEditRecipeView.tsx (paddingBottom clearance)
- FOUND: apps/barback/src/components/views/RecipeDetailView.tsx (paddingBottom clearance)
- FOUND: apps/barback/src/components/CategoryManager.tsx (paddingBottom clearance)
- FOUND: apps/barback/src/components/GlasswareManager.tsx (paddingBottom clearance)
- FOUND commit: 57b88ef (Task 1 — fixed positioning)
- FOUND commit: 7a1b178 (Task 2 — bottom clearance)

## Self-Check: PASSED
</content>
