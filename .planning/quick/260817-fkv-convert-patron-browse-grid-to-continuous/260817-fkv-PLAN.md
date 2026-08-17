---
phase: quick
plan: 260817-fkv
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/patron/src/components/RecipeCard.tsx
  - apps/patron/src/components/RecipeBrowse.tsx
autonomous: true
requirements: [PATR-01]

must_haves:
  truths:
    - Patron browse view renders recipes as a single continuous vertical list, not a 2-column grid
    - Each recipe row is visually separated from the next only by a thin divider line — no individual glow border or boxed-card background around any row
    - Not-makeable recipes are still dimmed via opacity-60 grayscale exactly as before (D-43)
    - Tapping a row still navigates to RecipeDetail exactly as before — no change to onClick/onSelect wiring
  artifacts:
    - apps/patron/src/components/RecipeCard.tsx (glow-orange-subtle/glow-orange border + rounded/bg card treatment removed, row padding added)
    - apps/patron/src/components/RecipeBrowse.tsx (grid grid-cols-2 replaced with a single-column divided list)
  key_links:
    - RecipeBrowse.tsx's list container divide-y class + RecipeCard.tsx's root div (no border) — divider lines must render between rows, not around them
---

<objective>
Convert the Patron browse view from a 2-column grid of individually glow-bordered cards to a single continuous vertical list of rows, separated only by thin divider lines — matching the reference screenshot's "DESTINATIONS" list section.

Purpose: The current per-card glow-border grid (added in quick task 260813-ea3) doesn't match the reference design's actual list layout — a single scrolling column of plain rows with hairline separators, no boxed cards.
Output: RecipeCard.tsx renders as an unbordered list row; RecipeBrowse.tsx renders rows in a single-column divided list instead of a grid.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@apps/patron/src/components/RecipeCard.tsx
@apps/patron/src/components/RecipeBrowse.tsx
@apps/patron/src/components/RecipeBrowse.test.tsx
@apps/patron/src/index.css

Reference screenshot (already reviewed by planner): the "DESTINATIONS" list below the hero panel — individual rows of text (name + tags + ingredient line + "Tap to View") separated by a single thin horizontal line each, no per-row border/box/background.

No RecipeCard.test.tsx exists; RecipeCard is exercised indirectly through RecipeBrowse.test.tsx. Confirmed via grep: no test in apps/patron/src asserts `toHaveClass('grid-cols-2')` or `toHaveClass('glow-orange...')` on either component, so no test file requires class-name-assertion updates for this change — only manual confirmation that existing text/click/dimming assertions still pass is required (see Task 2).
</context>

<tasks>

<task type="tracer" tdd="false">
  <name>Task 1: Convert RecipeCard from a bordered card to an unbordered list row</name>
  <files>apps/patron/src/components/RecipeCard.tsx</files>
  <action>
    In the root `div` (the one with `onClick={() => onSelect(recipe)}`), replace the current className string:
    `cursor-pointer p-md rounded-2xl bg-patron-surface/70 backdrop-blur-sm border flex flex-col gap-sm transition-shadow` with the conditional `border-patron-accent/50 glow-orange-subtle` (makeable) / `border-patron-text-secondary/20 opacity-60 grayscale` (not-makeable) suffix.

    Replace with: base classes `cursor-pointer py-lg flex flex-col gap-sm transition-opacity`, and drop the border/glow/background/rounded-corner classes entirely — makeable recipes get no extra class (empty string), not-makeable recipes keep only `opacity-60 grayscale` (D-43 dimming must survive unchanged). Do not add any border, background-color, backdrop-blur, or box-shadow/glow class to this root div — those are exactly what made it read as a boxed card instead of a list row.

    Leave every other line inside RecipeCard.tsx completely unchanged: the internal `h-px bg-patron-accent/30` divider between the header row and the tags (this is a decorative rule inside a single row, unrelated to the row-to-row separator being added in Task 2), the name+badge header line, the tag triplet paragraph, the ingredient-names paragraph, and the "Tap to View" affordance with its ChevronRight icon. Update the file's leading comment block to note the 260817 change (card → list row) alongside the existing 260813-ea3 note, without deleting the D-38/D-43 provenance notes already there.
  </action>
  <verify>
    <automated>grep -n "glow-orange\|rounded-2xl\|backdrop-blur\|bg-patron-surface" /home/gjohnson/src/my-bar/apps/patron/src/components/RecipeCard.tsx | grep -v '^[0-9]*://' | grep -c . </automated>
  </verify>
  <done>RecipeCard.tsx's root div has no border/glow/rounded/background classes; `opacity-60 grayscale` still applies conditionally on `recipe.overallStatus !== 'green'`; all other content (header, tags, ingredients, Tap to View) is unchanged; the grep count above is 0 (no leftover card-styling classes anywhere in the file).</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Convert RecipeBrowse's grid container to a single-column divided list, then run full verification</name>
  <files>apps/patron/src/components/RecipeBrowse.tsx</files>
  <action>
    In the non-empty branch of the `filteredRecipes.length === 0 ? ... : ...` ternary (the `<div className="grid grid-cols-2 gap-md">...</div>` wrapping the `.map()` over `filteredRecipes`), replace the container's className `grid grid-cols-2 gap-md` with `flex flex-col divide-y divide-white/10`. Do not change the `.map()` body, the `key`, or the `onSelect` callback passed to `RecipeCard` — only the container div's className changes. Leave the outer `min-h-dvh bg-patron-bg flex gap-xl p-lg` wrapper, the `TagRail`, and the `flex-1` wrapper div around this container completely untouched — this task only changes how recipes lay out relative to each other, not the page's overall structure or the TagRail.

    After making both this change and Task 1's RecipeCard.tsx change, run the full Patron test suite and the Patron build to confirm nothing broke: `pnpm --filter patron test` then `pnpm --filter patron build`. If any test fails on a class-name assertion tied to the old grid/glow classes, fix that specific assertion to match the new markup (do not weaken or delete assertions on text content, click handlers, ARIA roles, or the `opacity-60 grayscale` dimming behavior — per planner's grep, none currently exist, so this should be a no-op, but confirm by reading the failure output if the suite doesn't pass clean).
  </action>
  <verify>
    <automated>cd /home/gjohnson/src/my-bar && pnpm --filter patron test && pnpm --filter patron build</automated>
  </verify>
  <done>RecipeBrowse.tsx's recipe container renders `flex flex-col divide-y divide-white/10` instead of `grid grid-cols-2 gap-md`; `pnpm --filter patron test` passes with all pre-existing tests green (28 tests as of last full run, ±any necessary class-assertion fixes); `pnpm --filter patron build` passes with no TypeScript or Vite build errors.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| N/A | Pure client-side presentational/layout change — no new data flow, no new trust boundary crossed. Existing Patron API/WS boundaries are untouched by this plan. |

## STRIDE Threat Register

No new threats introduced — this plan only changes CSS/Tailwind class composition on two already-reviewed presentational components, with zero changes to data fetching, props, event handlers crossing a trust boundary, or new dependencies.
</threat_model>

<verification>
1. Visual: Patron browse view (`/`) renders a single vertical scrolling list of recipe rows next to the TagRail, each row separated by a thin `divide-white/10` line, no individual card border/glow/background visible on any row.
2. Not-makeable recipes remain visibly dimmed (`opacity-60 grayscale`) and remain clickable/navigable to RecipeDetail exactly as before.
3. `pnpm --filter patron test` — full suite green.
4. `pnpm --filter patron build` — clean TypeScript + Vite build.
</verification>

<success_criteria>
- RecipeCard.tsx no longer applies any border/glow/rounded/background-card styling to its root element.
- RecipeBrowse.tsx's recipe list container is a single-column `divide-y` list, not a `grid-cols-N` grid.
- All existing Patron behavior (filtering by tag, navigation to detail, empty/error/loading states, D-43 dimming) is unchanged.
- No new npm dependencies added.
- apps/barback and apps/server untouched.
</success_criteria>

<output>
Create `.planning/quick/260817-fkv-convert-patron-browse-grid-to-continuous/260817-fkv-SUMMARY.md` when done
</output>
