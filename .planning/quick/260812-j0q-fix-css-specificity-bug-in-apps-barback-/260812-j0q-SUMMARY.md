---
phase: quick-260812-j0q
plan: 01
subsystem: barback-ui
tags: [css, cascade-layers, tailwind, bugfix]
dependency-graph:
  requires: []
  provides: [barback-sticky-header-top-padding-fix]
  affects: [apps/barback/src/index.css, apps/barback/src/components/IngredientsTab.tsx, apps/barback/src/components/RecipesTab.tsx]
tech-stack:
  added: []
  patterns: ["additive safe-area-inset CSS (base spacing + env() inset), matching .safe-area-inset-bottom's existing pattern"]
key-files:
  created: []
  modified:
    - apps/barback/src/index.css
    - apps/barback/src/components/IngredientsTab.tsx
    - apps/barback/src/components/RecipesTab.tsx
decisions:
  - "Moved the .safe-area-inset-top padding value directly into the CSS rule itself (unlayered author rule) rather than relying on a Tailwind pt-* utility class (layered), since unlayered rules always win the cascade over layered rules for the same property regardless of source order or specificity — this was the root cause of two prior ineffective top-padding fixes (260812-fpi, 260812-gcp)"
metrics:
  duration: 6min
  completed: 2026-08-12
status: complete
actuals:
  tokens: 4500
  tasks: 1
  commits: 1
---

# Quick Task 260812-j0q: Fix CSS Specificity Bug in Barback Summary

Fixed a CSS cascade-layer bug where `.safe-area-inset-top`'s unlayered author rule was silently overriding Tailwind's layered `pt-lg` utility on every non-notched device, by making `.safe-area-inset-top` additive to match its sibling `.safe-area-inset-bottom`.

## What Was Built

`apps/barback/src/index.css`'s `.safe-area-inset-top` rule previously read `padding-top: env(safe-area-inset-top);` — a plain, unlayered author rule. Tailwind v4 generates all of its utility classes (including `pt-lg`) inside `@layer utilities`. Per the CSS cascade-layers spec, an unlayered rule always beats a layered rule for the same property, regardless of source order or specificity. This meant `.safe-area-inset-top`'s `padding-top: env(safe-area-inset-top)` — which resolves to `0px` on any device without a notch (Android phones, desktop Chrome) — silently zeroed out whatever `pt-lg` set on the same element. This is the actual reason the prior two "add top padding" quick tasks (260812-fpi's original `pt-md`, then 260812-gcp's bump to `pt-lg`) never produced a visible top gap.

The fix moves the padding value directly into the winning unlayered rule:
- `.safe-area-inset-top` now reads `padding-top: calc(env(safe-area-inset-top) + var(--spacing-lg));`, mirroring `.safe-area-inset-bottom`'s existing additive pattern (`padding-bottom: calc(env(safe-area-inset-bottom) + 16px)`).
- The now-redundant `pt-lg` class was removed from the sticky header wrapper `<div>` in both `IngredientsTab.tsx` and `RecipesTab.tsx`.
- Both files' leading comment blocks were updated with a new entry explaining the cascade-layer root cause and how this fix resolves it, so future readers don't repeat the same "bump the Tailwind class" fix that doesn't work.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `pnpm --filter barback test`: 17 test files, 64 tests, all passed.
- `pnpm --filter barback build`: `tsc --noEmit` and production `vite build` both completed cleanly with no new errors.
- Human visual check on a real device is still required to confirm the top gap is now visible (per plan's verification note) — not performed as part of this automated execution.

## Self-Check: PASSED

- FOUND: apps/barback/src/index.css (`.safe-area-inset-top` now additive)
- FOUND: apps/barback/src/components/IngredientsTab.tsx (`pt-lg` removed, comment added)
- FOUND: apps/barback/src/components/RecipesTab.tsx (`pt-lg` removed, comment added)
- FOUND: commit e6cd035
