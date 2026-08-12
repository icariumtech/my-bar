---
quick_id: 260812-fpi
slug: barback-ui-polish-1-add-a-small-gap-padd
mode: quick
created: 2026-08-12
---

# Quick Task 260812-fpi: Barback UI polish — header gap, remove redundant tab titles, re-theme BottomTabBar

## Problem

Three small visual gaps in the Barback app's navigation shell, all downstream
of the sticky-header work in quick task 260812-e8j:

1. **No breathing room below the sticky header.** In both
   `IngredientsTab.tsx` and `RecipesTab.tsx`, the `position: sticky`
   title/Add-button/search wrapper's bottom padding is only `pb-sm` (8px),
   so `IngredientList`/`RecipeList` start immediately underneath it with
   almost no visual separation from the scrolling content.

2. **Redundant per-tab titles.** Each tab's sticky header renders an
   `<h2>Ingredients</h2>` / `<h2>Recipes</h2>` above the "Add {Item}"
   button, duplicating what `BottomTabBar`'s active-tab state already
   communicates.

3. **BottomTabBar doesn't read as a distinct, native-feeling nav bar.** It's
   currently an antd `Segmented` control: no border separating it from the
   scroll content above, a background color (`#18181b`) identical to the
   page background, text-only labels (no icons), and selection shown via
   `Segmented`'s built-in background-pill highlight rather than an
   icon+label color change.

## Fix

1. **`IngredientsTab.tsx` / `RecipesTab.tsx`**: remove each tab's `<h2>`
   title (the "Add {Item}" button becomes the sole, right-aligned child of
   that row), and bump the sticky wrapper's bottom padding from `pb-sm` to
   `pb-md` for a clearer gap above the scrolling list. `SettingsTab.tsx` is
   untouched (its own internal menu header is out of scope), and
   `IngredientList.tsx`/`RecipeList.tsx` are untouched (the added gap comes
   entirely from the sticky wrapper's own padding in the tab files, not from
   list-internal spacing).

2. **`BottomTabBar.tsx`**: replace the antd `Segmented` control with a
   custom row of three pressable `<button>` tabs (icon stacked above
   label), matching the reference image's native-app bottom-nav look while
   staying inside this app's own dark utilitarian palette (no neon):
   `border-t border-zinc-700` for the separator line, `bg-bar-surface`
   (`#27272a`, the existing "Secondary (30%)" token from index.css /
   02.1-UI-SPEC.md) so the bar reads as a distinct surface from the
   `bg-bar-bg` page background, `InboxOutlined`/`CoffeeOutlined`/
   `SettingOutlined` (`@ant-design/icons`, already a dependency) per tab,
   and `text-bar-accent` (selected) vs `text-zinc-400` (unselected) for the
   icon+label color change instead of a background pill. The existing
   `activeTab`/`onChange` props contract, the fixed Ingredients→Recipes→
   Settings order, the `position: fixed` + `env(safe-area-inset-bottom)`
   handling from 260812-drh, and the 48px touch-target convention are all
   preserved unchanged.

## Tasks

<task type="auto" number="1">
<name>Ingredients/Recipes tabs: remove redundant title, add header-to-content gap</name>
<files>apps/barback/src/components/IngredientsTab.tsx, apps/barback/src/components/RecipesTab.tsx</files>
<action>
In `IngredientsTab.tsx`: remove the `<h2 className="text-white text-xl font-semibold">Ingredients</h2>` element from inside the title+Add-button row. Change that row's className from `"flex items-center justify-between pb-md"` to `"flex justify-end pb-md"` so the "Add Ingredient" `Button` is the row's sole, right-aligned child — the bottom tab bar already labels the active tab, so the per-tab heading was redundant, and the button keeps the existing upper-right placement the rest of this phase's UI-SPEC already establishes. On the sticky wrapper div itself, change `className="sticky top-0 z-10 bg-bar-bg pt-md pb-sm safe-area-inset-top"` to use `pb-md` instead of `pb-sm` (both are existing spacing tokens from index.css — no new value) so there's a clearer visual gap between `SearchFilterBar` (the last element inside the sticky wrapper) and `IngredientList` rendered below it. Update the file's leading comment block to note (260812-fpi) that the per-tab `<h2>` was removed as redundant with `BottomTabBar`'s active-tab indication, and the sticky wrapper's bottom padding was bumped from `pb-sm` to `pb-md` for clearer separation from the scrolling list beneath it.

Apply the identical pair of changes to `RecipesTab.tsx`: remove the `<h2 className="text-white text-xl font-semibold">Recipes</h2>` element, change its row's className from `"flex items-center justify-between pb-md"` to `"flex justify-end pb-md"`, and change the sticky wrapper's `pb-sm` to `pb-md`. Update its leading comment identically (260812-fpi).

Do not modify `SettingsTab.tsx` (its own internal "Settings" header/menu is explicitly out of scope for this task) or `IngredientList.tsx`/`RecipeList.tsx` (no change needed there — the added gap comes entirely from the sticky wrapper's own bottom padding in the tab files).
</action>
<verify>
<automated>cd apps/barback && pnpm exec vitest run IngredientsTab RecipesTab --reporter=verbose</automated>
</verify>
<done>Neither IngredientsTab nor RecipesTab renders an "Ingredients"/"Recipes" `<h2>`; in both files the "Add {Item}" button is the sole, right-aligned child of its former title row; both sticky headers use `pb-md` (not `pb-sm`) as their bottom padding; IngredientsTab.test.tsx and RecipesTab.test.tsx pass unmodified (neither queries the removed heading text).</done>
</task>

<task type="auto" number="2" tdd="true">
<name>Re-theme BottomTabBar: icon+label tab buttons, surface background, top border, color-based selection</name>
<files>apps/barback/src/components/BottomTabBar.tsx, apps/barback/src/components/BottomTabBar.test.tsx</files>
<behavior>
The existing three tests in `BottomTabBar.test.tsx` (tab order via `getAllByText(/Ingredients|Recipes|Settings/)`; `onChange` fires exactly once with `'recipes'` when Recipes is clicked while Ingredients is active; clicking the already-active tab is a no-op) must all still pass byte-for-byte unmodified — the no-op behavior now has to be implemented explicitly in the click handler (only call `onChange` when the clicked tab's `value` differs from `activeTab`), since it can no longer rely on antd `Segmented`'s native-radio-input semantics once `Segmented` is removed.

Two new tests, added to the same file without touching the existing three:
- Test 4: renders `<BottomTabBar activeTab="ingredients" onChange={vi.fn()} />` and asserts, via `screen.getByRole('img', { name: 'inbox' })`, `screen.getByRole('img', { name: 'coffee' })`, and `screen.getByRole('img', { name: 'setting' })` (antd icons render as `<span role="img" aria-label={iconName}>`), that all three tab icons are present.
- Test 5: renders with `activeTab="recipes"` and asserts the Recipes tab button has `aria-selected="true"` (`screen.getByRole('tab', { name: /Recipes/ })`) while the Ingredients and Settings tab buttons have `aria-selected="false"` — proving selection state is driven by the `activeTab` prop per-button, not a single shared highlight element.
</behavior>
<action>
Rewrite `BottomTabBar.tsx`. Replace the `import { Segmented } from 'antd'` line with `import { CoffeeOutlined, InboxOutlined, SettingOutlined } from '@ant-design/icons'` (all three already exist in the installed `@ant-design/icons` package and follow the same import pattern already used elsewhere in this codebase, e.g. `PlusOutlined`/`SearchOutlined`/`RightOutlined`). Define a module-level `TABS` array (typed as `{ value: 'ingredients' | 'recipes' | 'settings'; label: string; icon: React.ReactNode }[]`) with exactly three entries in the fixed order this codebase already treats as invariant (D-23/BARBACK-01 — Ingredients, Recipes, Settings never reorder): `{ value: 'ingredients', label: 'Ingredients', icon: <InboxOutlined /> }`, `{ value: 'recipes', label: 'Recipes', icon: <CoffeeOutlined /> }`, `{ value: 'settings', label: 'Settings', icon: <SettingOutlined /> }` — Inbox reads as inventory/storage for Ingredients, Coffee reads as a drink for Recipes, Setting is the unambiguous choice for Settings.

Keep the outer wrapper `div`'s inline `style` exactly as today — `position: 'fixed', bottom: 0, left: 0, right: 0, width: '100%', zIndex: 10, paddingBottom: 'env(safe-area-inset-bottom)'` — this preserves the existing safe-area-inset-bottom behavior from 260812-drh unchanged; do not touch or reuse the unrelated `.safe-area-inset-bottom` CSS class from index.css (that one adds an extra +16px meant for scrolling list content, not this bar). Drop the inline `backgroundColor: '#18181b'` from that same style object, and instead add `className="border-t border-zinc-700 bg-bar-surface"` to the wrapper div: `bg-bar-surface` reuses the existing `--color-bar-surface` (`#27272a`, "Secondary (30%)") token from index.css/02.1-UI-SPEC.md so the bar reads as a distinct surface from the `bg-bar-bg` page background above it (this app has no existing border/separator design token, so `border-zinc-700` reuses Tailwind's already-available default zinc palette — already used in this codebase for muted tones via `text-zinc-400`/`text-zinc-900` — rather than inventing a new custom hex value).

Inside the wrapper, replace the `<Segmented>` element entirely with `<div className="flex">` containing `TABS.map(...)`, one `<button>` per entry: `key={tab.value}`, `type="button"`, `role="tab"`, `aria-selected={tab.value === activeTab}`, `onClick` that calls `onChange(tab.value)` only when `tab.value !== activeTab` (this explicit guard is what reproduces the existing "clicking the already-active tab is a no-op" test), `className` combining a fixed base — `"flex flex-1 flex-col items-center justify-center gap-xs text-xl transition-colors"` (`text-xl` sizes the antd icon glyph, which uses `font-size: 1em`) — with a conditional pair: `"text-bar-accent"` when `tab.value === activeTab`, else `"text-zinc-400"` (this codebase's existing muted-text convention) — this is the icon+label color change replacing `Segmented`'s background-pill highlight. `style={{ minHeight: 48 }}` on every button preserves the 48px touch-target convention (D-13, reused throughout this codebase, e.g. `SearchFilterBar`'s `CategoryChip`). Each button renders `{tab.icon}` followed by `<span className="text-xs">{tab.label}</span>` (icon stacked above label, matching the reference image's layout; no `font-weight` utility on the label — index.css's D-13 comment restricts this app to exactly two type weights, 400 and 600, so the label stays at the inherited 400 body weight rather than introducing a third weight).

Update the file's leading comment block: note the switch from antd `Segmented` to a custom row of three pressable tab buttons (260812-fpi) because `Segmented`'s whole visual identity is its background-pill highlight, which conflicts with the new icon+label color-based selection state. Keep the existing `position: fixed` vs `sticky` rationale comment (260812-drh) unchanged, since that decision is untouched by this task.

Add the two new tests described in `<behavior>` to `BottomTabBar.test.tsx`, leaving its existing three tests unmodified.
</action>
<verify>
<automated>cd apps/barback && pnpm exec vitest run BottomTabBar --reporter=verbose</automated>
</verify>
<done>BottomTabBar renders a `border-t border-zinc-700 bg-bar-surface` fixed bottom bar containing three icon-over-label buttons (Inbox/Coffee/Setting) in fixed Ingredients/Recipes/Settings order; the active tab's icon+label render in `text-bar-accent`, inactive tabs in `text-zinc-400` (no background-pill highlight); all 5 BottomTabBar.test.tsx tests (3 original, unmodified, plus 2 new) pass; the component still exposes exactly the same `BottomTabBarProps` contract (`activeTab`, `onChange`) and 48px-minimum touch targets.</done>
</task>

## Verification

- `cd apps/barback && pnpm test` (equivalently `pnpm --filter barback test`) — full suite passes, including `IngredientsTab.test.tsx`, `RecipesTab.test.tsx`, and the extended `BottomTabBar.test.tsx`, with no regressions in any other existing test file.
- `cd apps/barback && pnpm run build` (equivalently `pnpm --filter barback build`) — clean `tsc --noEmit` typecheck and production `vite build`, no errors from the new icon imports, className changes, or the removed `Segmented` usage.
- **Human visual check required on a real device (iPad Safari and/or phone browser)** — this was planned without a working browser in the sandbox, consistent with 260812-e8j/260812-drh's own sign-off notes. Specifically confirm: (1) there's a visible gap between the sticky title/Add-button/search header and the scrolling list on both the Ingredients and Recipes tabs; (2) neither tab shows an "Ingredients"/"Recipes" heading above its Add button; (3) `BottomTabBar` shows a visible top border, a background distinct from the page behind it, three labeled icons (inbox/coffee/setting), and the active tab shown via green icon+label color rather than a pill background; (4) all three tab buttons remain easily tappable at their existing position.

## Success Criteria

- `IngredientsTab`/`RecipesTab`: no `<h2>` "Ingredients"/"Recipes" title renders; there is a visible `pb-md` gap between the sticky header and the scrolling list; the "Add {Item}" button remains a 48px-minimum, right-aligned, functional control.
- `BottomTabBar`: visible `border-t` separator; background color (`bg-bar-surface`) distinct from the page background (`bg-bar-bg`); three tabs each show an icon stacked above a label (Inbox/Coffee/Setting for Ingredients/Recipes/Settings); the active tab is indicated via accent-green icon+label color, inactive tabs via muted gray — no background-pill highlight; the existing `activeTab`/`onChange` prop contract and fixed tab order are unchanged; every tab button remains a ≥48px touch target; the existing `safe-area-inset-bottom` padding behavior is unchanged.
- No new dependencies added; only existing index.css design tokens (`bg-bar-surface`, `text-bar-accent`) and Tailwind's already-in-use default `zinc-700`/`zinc-400` shades are used — no invented hex values or spacing numbers.
- `pnpm --filter barback test` and `pnpm --filter barback build` both pass with no regressions.
</content>
