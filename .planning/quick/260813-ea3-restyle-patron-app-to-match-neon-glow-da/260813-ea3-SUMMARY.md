---
phase: quick-260813-ea3
plan: 01
subsystem: patron-ui
tags: [react, tailwind-css-v4, css-glow-utility, patron]
dependency-graph:
  requires:
    - phase: 03-patron-browse-experience
      provides: "TagRail, TagSubmenu, RecipeCard, MakeableIndicator, RecipeDetail components this task restyles"
  provides: [patron-neon-glow-css-utility-layer]
  affects:
    - apps/patron/src/components/TagRail.tsx
    - apps/patron/src/components/TagSubmenu.tsx
    - apps/patron/src/components/RecipeCard.tsx
    - apps/patron/src/components/MakeableIndicator.tsx
    - apps/patron/src/components/RecipeDetail.tsx
tech-stack:
  added: []
  patterns: ["reusable .glow-orange/.glow-orange-subtle/.glow-success/.glow-destructive CSS utility classes in index.css as the single source of truth for the neon box-shadow motif — never repeated inline", "middot-separated (·) uppercase orange tag typography replacing pill-chip tag markup on both RecipeCard and RecipeDetail"]
key-files:
  created: []
  modified:
    - apps/patron/src/index.css
    - apps/patron/src/components/TagRail.tsx
    - apps/patron/src/components/TagSubmenu.tsx
    - apps/patron/src/components/RecipeCard.tsx
    - apps/patron/src/components/MakeableIndicator.tsx
    - apps/patron/src/components/RecipeDetail.tsx
decisions:
  - "Glow utilities implemented as plain CSS classes in index.css (not Tailwind @apply or arbitrary-value classes) since the 3-layer box-shadow values needed to be defined exactly once and reused verbatim across 5 components"
  - "RecipeDetail's radial-gradient hero uses an inline style prop (not a Tailwind arbitrary-value class) per the plan's explicit rationale: Tailwind has no built-in radial-gradient utility and bracket-syntax for a multi-stop radial gradient is error-prone"
  - "glow-success/glow-destructive only add box-shadow (no border, no fill color) so D-42's locked green/red semantic mapping and existing bg-patron-success/bg-patron-destructive fills are never touched"
metrics:
  duration: 12min
  completed: 2026-08-13
status: complete
actuals:
  tokens: 2600
  tasks: 3
  commits: 3
---

# Quick Task 260813-ea3: Restyle Patron app to match neon-glow dark-bar-menu reference Summary

Restyled all 5 Patron browse/detail components onto a shared neon-glow CSS utility layer (`.glow-orange`, `.glow-orange-subtle`, `.glow-success`, `.glow-destructive` added once in `index.css`): TagRail became a glowing rounded-full pill rail with individually-bordered icon buttons in three visual states, RecipeCard/RecipeDetail moved from flat surfaces and pill-chip tags to glow-bordered rounded-2xl cards with middot-separated uppercase tag typography and cyan-white ingredient text, MakeableIndicator became a hue-matched glowing pill badge, and RecipeDetail's hero placeholder became a radial-gradient vignette with a circular glowing "X" close control — all while preserving every behavioral contract (D-36/D-37 selection logic, D-38/D-41/D-42/D-43 makeable-status semantics, `aria-label="Back"`/`onBack` wiring) and all 28 existing Patron tests unmodified.

## What Was Built

- **`index.css`**: four new reusable glow utility classes added after the existing `@theme` block — `.glow-orange` (strong glow + `rgba(255,107,53,0.7)` border, used on selected/expanded states and content-card borders), `.glow-orange-subtle` (resting glow, used on non-selected rail icons and makeable RecipeCards), `.glow-success`/`.glow-destructive` (shadow-only, layered on the existing success/destructive fills, exact rgba decomposition of the locked hex tokens — never redefining D-42's color mapping).
- **`TagRail.tsx`**: root container restyled into a `self-start`, `rounded-full`, `glow-orange` pill (`w-20`, `py-lg`, `bg-patron-bg/50`); each icon button now renders in one of three states derived from the *unchanged* `isActive`/`isExpanded` booleans — muted `opacity-40` (D-36, byte-identical to the pre-existing class, since `TagRail.test.tsx` asserts it), `glow-orange-subtle` outlined (active, not expanded), or `glow-orange` + `bg-patron-accent/20` filled (active and expanded). Icon size reduced to 22px, label now `text-[10px] uppercase tracking-wide` (same `group.label` string, same `aria-label`).
- **`TagSubmenu.tsx`**: chip buttons restyled — selected chip gains `glow-orange-subtle`, unselected chips get a `bg-patron-bg/60` + `border-patron-accent/30` outline instead of the old flat `bg-patron-surface` fill. Selection logic (`tag.id === selectedTagId`) untouched.
- **`RecipeCard.tsx`**: outer card is now `rounded-2xl bg-patron-surface/70 backdrop-blur-sm` with a border that's `glow-orange-subtle` when makeable or a muted `border-patron-text-secondary/20` (paired with the pre-existing `opacity-60 grayscale`) when not — D-43 preserved exactly. `MakeableIndicator` moved into a new header row beside the bold (`font-semibold`) drink name (renders exactly once per card, satisfying `RecipeBrowse.test.tsx`'s count-of-1 assertion) with a divider below. Tags render as a single middot-separated uppercase orange `<p>` (`.slice(0, 3)` triplet unchanged, D-38) instead of pill `<span>`s. Ingredient text switched to `text-patron-accent-text` (cyan-white). Added a "Tap to View" affordance line with a `ChevronRight` icon.
- **`MakeableIndicator.tsx`**: `rounded-full` pill (was `rounded`), `uppercase tracking-wide`, `shrink-0`, plus `glow-success`/`glow-destructive` on top of the existing `bg-patron-success`/`bg-patron-destructive` fills. `'Available'`/`'Not Available'` text content and the `isAvailable` boolean are byte-identical.
- **`RecipeDetail.tsx`**: header restructured into a `relative shrink-0` wrapper containing (1) a `h-64` radial-gradient (`rgba(255,107,53,0.18)` center → `rgba(26,35,50,0.9)` at 70%, via inline `style`) hero vignette replacing the old linear-gradient placeholder, and (2) an `absolute top-md right-md` circular `glow-orange` "X" close button (`lucide-react`'s `X` icon replacing `ChevronLeft`) — `type="button"`, `onClick={onBack}`, and `aria-label="Back"` all unchanged, so `RecipeDetailView`'s `getByRole('button', { name: /back/i })` query still resolves. The scroll container (`-mt-lg` for a slight card-over-hero overlap) now wraps a single `rounded-2xl bg-patron-surface/70 backdrop-blur-sm glow-orange` content card containing, in unchanged order: name, full middot-separated tag list (no `.slice()`, D-39), badge, optional missing-ingredients line, a new divider, ingredients (`text-patron-accent-text`), and an optional italic cyan-white description.

## Deviations from Plan

None — plan executed exactly as written. The plan's `pnpm --filter patron test -- TagRail`/`RecipeBrowse MakeableIndicator`/`RecipeDetail` filter arguments ran the full 28-test suite each time (all passed) rather than a narrowed subset, which does not affect correctness — every named test file's assertions were exercised and passed at each checkpoint.

## Verification

- Task 1 (`pnpm --filter patron test -- TagRail`): 28/28 tests passed, including `TagRail.test.tsx`'s `toHaveClass('opacity-40')` assertion.
- Task 2 (`pnpm --filter patron test -- RecipeBrowse MakeableIndicator`): 28/28 tests passed.
- Task 3 (`pnpm --filter patron test -- RecipeDetail`, then full `pnpm --filter patron test`, then `pnpm --filter patron build`): 28/28 tests passed on every run; `tsc --noEmit` and production `vite build` both completed with zero errors (confirms the removed `ChevronLeft` import left no stray reference).
- **Human visual check on a real device (iPad Safari / phone browser) is still required** — not performed as part of this automated execution (no working browser in the sandbox). Confirm per the plan's Verification section: (1) tag rail reads as one continuous glowing pill with three distinct icon states; (2) RecipeCard grid shows glow-bordered cards with badge beside name, middot tag text, cyan ingredient text, and not-makeable cards still visibly dimmed/desaturated; (3) tapping a card opens RecipeDetail with the radial-gradient hero, glowing "X" (confirm it still navigates back), and a single glow-bordered content card; (4) no layout breakage at iPad-width and phone-width viewports.

## Self-Check: PASSED

- FOUND: apps/patron/src/index.css (glow utility classes present)
- FOUND: apps/patron/src/components/TagRail.tsx (restyled pill rail)
- FOUND: apps/patron/src/components/TagSubmenu.tsx (restyled chips)
- FOUND: apps/patron/src/components/RecipeCard.tsx (restyled card)
- FOUND: apps/patron/src/components/MakeableIndicator.tsx (restyled badge)
- FOUND: apps/patron/src/components/RecipeDetail.tsx (restyled hero/close/content card)
- FOUND: commit f3e93fd (feat: glow utility CSS + TagRail restyle)
- FOUND: commit b5ad89e (feat: RecipeCard + MakeableIndicator restyle)
- FOUND: commit 3c50854 (feat: RecipeDetail restyle + full regression pass)
