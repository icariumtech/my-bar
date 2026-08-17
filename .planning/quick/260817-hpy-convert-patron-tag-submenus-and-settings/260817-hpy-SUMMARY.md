---
phase: quick
plan: 260817-hpy
subsystem: apps/patron
tags: [patron, tag-rail, flyout, settings, ui]
status: complete
dependency-graph:
  requires: []
  provides:
    - TagRail single-flyout state machine (openFlyoutId)
    - Settings gear flyout replacing Eye/EyeOff availability toggle
  affects:
    - apps/patron/src/components/RecipeBrowse.test.tsx (indirect, via TagRail)
tech-stack:
  added: []
  patterns:
    - Single shared `openFlyoutId` state variable for mutual exclusivity across N triggers, instead of N booleans
    - Absolutely-positioned flyout popovers (`absolute left-full`) anchored to relatively-positioned trigger wrappers, so open/closed state never changes container width
key-files:
  created: []
  modified:
    - apps/patron/src/components/TagRail.tsx
    - apps/patron/src/components/TagSubmenu.tsx
    - apps/patron/src/components/TagRail.test.tsx
    - apps/patron/src/components/RecipeBrowse.test.tsx
decisions:
  - "Task 1 (flyout mechanics/persistent highlight) and Task 2 (Settings gear) were implemented in a single combined feat commit since both live in the same render tree of the same TagRail.tsx file and only compile/test correctly as one coherent whole — the group-button JSX from Task 1 and the Settings-button JSX from Task 2 share the outer rail div and the openFlyoutId state Task 1 introduces. Test commits remained split per task per the plan's RED/GREEN structure."
  - "RecipeBrowse.test.tsx (not in the plan's file list) was updated as a Rule 3 blocking-issue fix — it exercised TagRail indirectly via the now-removed aria-label=\"Availability filter\" button; updated to use the new Settings gear + checkbox flow. RecipeBrowse.tsx itself was not touched, per the plan's out-of-scope constraint (verified zero diff)."
metrics:
  duration: 25min
  completed: 2026-08-17
actuals:
  tokens: 5535
  tasks: 3
  commits: 5
---

# Quick Task 260817-hpy: Convert Patron tag submenus and settings to flyouts Summary

Converted TagRail's tag-group submenus from inline-expanding blocks into absolutely-positioned flyout popovers, replaced the bottom-pinned Eye/EyeOff availability toggle with a Settings gear flyout containing the "Show all recipes" checkbox, and made a tag-group's filled/selected highlight persist based on whether it owns the active filter — independent of whether its own flyout is open.

## What Was Built

- **Unified `openFlyoutId` state** (`string | undefined`, holding a group id, the literal `'settings'`, or `undefined`) replaces the old `expandedGroupId` — single source of truth for which one flyout (of 5 possible triggers: 4 tag groups + Settings) is open. Mutual exclusivity is a natural consequence of one shared variable rather than five independent booleans.
- **Absolutely-positioned flyouts**: each tag-group's `TagSubmenu` now renders inside `absolute left-full top-0 ml-sm ...` wrapper anchored beside its trigger button, inside a `relative` group wrapper. The rail's own `w-20` width never changes regardless of open/closed state.
- **Persistent selection highlight**: a group button's filled/glowing visual state and `aria-pressed` now derive from `isFlyoutOpen || groupHasSelection` (where `groupHasSelection` checks `selectedTagId` membership in that group's own tags) — the highlight survives closing the flyout as long as the group still owns the active filter.
- **Generic outside-click/Escape close**: one `useEffect` keyed on `openFlyoutId`, attaching `mousedown`/`keydown` listeners to `document` only while a flyout is open, closing on outside click (via `railRef.current.contains`) or `Escape`. Works identically for every flyout type — no per-control duplication.
- **Settings gear replaces Eye/EyeOff**: the bottom-pinned control is now a single-state `Settings` icon button (`aria-label="Settings"`, same `w-14 h-14 rounded-xl` footprint) opening a flyout with a "Show all recipes" checkbox wired identically to before (`checked={!showAvailableOnly}`, `onChange={onToggleAvailableOnly}`).
- **TagSubmenu.tsx**: top-of-file comment updated to describe its new flyout-positioned rendering context; component itself (list rendering, selection classNames) unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Updated RecipeBrowse.test.tsx's availability-toggle assertions**
- **Found during:** Task 3's full regression pass (`pnpm --filter patron test`)
- **Issue:** `RecipeBrowse.test.tsx` had two tests clicking `screen.getByRole('button', { name: 'Availability filter' })` — that control no longer exists after replacing it with the Settings gear.
- **Fix:** Both call sites now click the `'Settings'` button then the `'Show all recipes'` checkbox to achieve the same effect.
- **Files modified:** `apps/patron/src/components/RecipeBrowse.test.tsx`
- **Commit:** a9b3b6c
- **Note:** `RecipeBrowse.tsx` (the component itself) was verified to have zero diff throughout — only its test file needed updating, since it exercises TagRail's rendered output rather than TagRail's internals.

### Structural Note (not a deviation from correctness, but from the plan's literal per-task commit split)

Task 1 and Task 2's implementation changes both landed in TagRail.tsx (and Task 1 also touched TagSubmenu.tsx). Because the group-button flyout JSX (Task 1) and the Settings-button flyout JSX (Task 2) live in the same return statement of the same component and share the `openFlyoutId` state Task 1 introduces, they were committed together in a single `feat` commit (e27b787) rather than as two separate feat commits. The RED (test) commits remained split exactly per task (7501ead for Task 1, 0d75232 for Task 2), preserving the TDD gate sequence.

## Verification

- `pnpm --filter patron test` — 5 test files, 41 tests, all passing (includes TagRail.test.tsx's new flyout-mechanics, persistent-selection-highlight, and settings-flyout suites, plus RecipeBrowse.test.tsx and RecipeDetail.test.tsx exercising TagRail indirectly).
- `pnpm --filter patron build` — clean `tsc --noEmit` + `vite build`, no errors from the removed `Eye`/`EyeOff` imports or new `Settings`/`useEffect`/`useRef` imports.
- `git diff --stat apps/patron/src/components/RecipeBrowse.tsx` — empty, confirming RecipeBrowse.tsx was not modified.

## Self-Check: PASSED

- FOUND: apps/patron/src/components/TagRail.tsx
- FOUND: apps/patron/src/components/TagSubmenu.tsx
- FOUND: apps/patron/src/components/TagRail.test.tsx
- FOUND: apps/patron/src/components/RecipeBrowse.test.tsx
- FOUND commit: 7501ead
- FOUND commit: 0d75232
- FOUND commit: e27b787
- FOUND commit: a9b3b6c
