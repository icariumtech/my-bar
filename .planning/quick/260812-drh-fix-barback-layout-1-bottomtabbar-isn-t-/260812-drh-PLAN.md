---
quick_id: 260812-drh
slug: fix-barback-layout-1-bottomtabbar-isn-t-
mode: quick
created: 2026-08-12
---

# Quick Task 260812-drh: Fix Barback layout — BottomTabBar isn't visible on full-screen sub-views

## Problem

`BottomTabBar` (`apps/barback/src/components/BottomTabBar.tsx`) is rendered
unconditionally as a sibling after the active tab's content in
`apps/barback/src/App.tsx`, and is positioned with `position: sticky; bottom: 0`.

Every tab (Ingredients, Recipes, Settings) has one or more full-screen
sub-views (`AddEditIngredientView`, `AddEditRecipeView`, `RecipeDetailView`,
`CategoryManager`, `GlasswareManager`) that replace the tab's list content
entirely and are laid out as `display: flex; flex-direction: column;
min-height: 100vh`. Because that wrapper is exactly one viewport tall (or
taller, once the form/list content inside it grows), the `BottomTabBar`
sibling that follows it in the DOM starts its normal flow position right at
(or past) the bottom edge of the viewport.

`position: sticky` only pins an element inside the viewport while a user
scrolls *past* its natural flow position — it does not pull an element that
already starts off-screen back into view. Since the sub-view content exactly
(or more than) fills the viewport, the tab bar's natural position is already
at/below the fold at scroll position 0, so `sticky` never engages and the
bar is effectively invisible without deliberately scrolling further down.

This reproduces every time a user opens Add/Edit Ingredient, Add/Edit
Recipe, Recipe Detail, Categories, or Glassware from the Barback app.

## Root Cause

`position: sticky` is the wrong tool here — it depends on the sticky
element's static-flow position falling inside the current viewport before it
"catches." A `position: fixed` bar anchored to the viewport's bottom edge is
required so it's guaranteed visible regardless of how tall the preceding
sibling content is.

## Fix

1. **BottomTabBar.tsx** — switch the wrapper from `position: sticky` to
   `position: fixed` at the viewport bottom (`bottom: 0, left: 0, right: 0`),
   keep `width: 100%`, add `zIndex` so it renders above page content, and add
   `env(safe-area-inset-bottom)` padding (matches the existing
   `.safe-area-inset-bottom` convention in `index.css`) so it isn't
   obstructed by the iPad/iPhone home indicator.

2. **Full-screen sub-view `<main>` bottom padding** — now that the tab bar
   is a fixed overlay that is visible on top of every screen (not just the
   three list tabs, which already reserve space via `pb-3xl`), the five
   full-screen views' scrollable `<main style={{ flex: 1, padding: 16,
   overflow: 'auto' }}>` areas need extra bottom padding so their last
   field / primary action button (e.g. "Save Changes") isn't hidden behind
   the now-always-visible fixed bar:
   - `apps/barback/src/components/views/AddEditIngredientView.tsx`
   - `apps/barback/src/components/views/AddEditRecipeView.tsx`
   - `apps/barback/src/components/views/RecipeDetailView.tsx`
   - `apps/barback/src/components/CategoryManager.tsx`
   - `apps/barback/src/components/GlasswareManager.tsx`

## Tasks

<task type="auto" number="1">
<name>Fix BottomTabBar to use fixed positioning instead of sticky</name>
<files>apps/barback/src/components/BottomTabBar.tsx</files>
<action>
Change the wrapper `div` style from `{ position: 'sticky', bottom: 0, width:
'100%' }` to a fixed overlay: `{ position: 'fixed', bottom: 0, left: 0,
right: 0, width: '100%', zIndex: 10, paddingBottom:
'env(safe-area-inset-bottom)', backgroundColor: '#18181b' }` (matches
`--color-bar-bg` from index.css so the safe-area padding strip isn't
transparent over content). Keep the existing `Segmented` markup/props
unchanged.
</action>
<verify>cd apps/barback && pnpm test -- BottomTabBar --run</verify>
<done>BottomTabBar renders at `position: fixed` anchored to the viewport bottom; existing BottomTabBar.test.tsx assertions (tab order, onChange behavior) still pass unmodified since they don't depend on positioning.</done>
</task>

<task type="auto" number="2">
<name>Reserve bottom padding in full-screen sub-views so content isn't hidden behind the fixed tab bar</name>
<files>apps/barback/src/components/views/AddEditIngredientView.tsx,apps/barback/src/components/views/AddEditRecipeView.tsx,apps/barback/src/components/views/RecipeDetailView.tsx,apps/barback/src/components/CategoryManager.tsx,apps/barback/src/components/GlasswareManager.tsx</files>
<action>
In each file's `<main style={{ flex: 1, padding: 16, overflow: 'auto' }}>`,
add bottom clearance for the fixed BottomTabBar (48px min-height +
safe-area-inset-bottom): change to `<main style={{ flex: 1, padding: 16,
paddingBottom: 'calc(16px + 48px + env(safe-area-inset-bottom))', overflow:
'auto' }}>`. Do not touch header/back-button markup or any other styles.
</action>
<verify>cd apps/barback && pnpm test --run</verify>
<done>All five full-screen views reserve bottom clearance equal to the fixed tab bar's height + safe-area inset; full barback test suite passes.</done>
</task>

## Verification

- `cd apps/barback && pnpm test --run` — full suite passes, no regressions.
- `cd apps/barback && pnpm exec tsc -p tsconfig.json --noEmit` — no type errors introduced.

## Success Criteria

- BottomTabBar is visible and tappable on every screen of the Barback app,
  including all five full-screen add/edit/detail/manager sub-views, without
  requiring the user to scroll.
- No existing test regresses.
</content>
