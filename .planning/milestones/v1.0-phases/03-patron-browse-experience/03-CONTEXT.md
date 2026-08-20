# Phase 3: Patron Browse Experience - Context

**Gathered:** 2026-08-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the new `apps/patron` app: a guest-facing, dark-neon-styled iPad screen where a patron browses drinks via a grouped icon-rail tag taxonomy, taps into a drink detail view, and always sees a trustworthy makeable/not-makeable status that live-updates from Barback stock changes without a manual refresh. This phase does NOT include order submission (PATR-05), kiosk-lock/fullscreen mode or inactivity-timeout return-to-home (PATR-07/08 — Phase 4), the Bartender screen, AI recommendations/substitutions, or barcode scanning. Adds a new recipe-level tag taxonomy and a recipe description field to the data model (extends Phase 2/2.1's recipe schema) — this is implementation groundwork for PATR-01/02, not scope creep.

</domain>

<decisions>
## Implementation Decisions

### Category Rail & Tag Taxonomy
- **D-33:** Recipes get a new multi-value tag system, not a single category field. A recipe can carry any number of tags across four fixed groups. Rail icons are the groups; tapping a rail icon expands a submenu of that group's tags. — **Reversibility:** costly — this is a new schema concept (recipe↔tag many-to-many) that PATR-01's rail, the card layout, and detail screen all depend on; reworking the grouping later touches all three.
- **D-34:** Default taxonomy, approved as-is (owner may add more tags later via Barback, but starts with this set):
  - **SPIRIT:** Whiskey, Gin, Rum, Vodka, Tequila, Brandy, Mezcal, Liqueur-forward
  - **TYPE:** Classics, Modern, Tiki, Spritz, Shots, Mocktail
  - **SEASON:** Summer, Fall/Winter, Spring, Year-round
  - **FLAVOR:** Sweet, Sour/Citrus, Bitter, Refreshing, Spicy, Boozy/Strong
- **D-35:** Tags are fixed/curated for this phase (not a fully owner-managed CRUD surface like ingredient categories) — ship with the D-34 defaults; owner assigns tags to recipes from Barback's recipe form.
- **D-36:** A rail group's submenu only lists tags that currently have at least one recipe tagged with them — never show a tag a patron could tap into and see an empty result (e.g. don't show "Shots" if no recipe is tagged Shots yet). This must be computed live, not hardcoded, since the owner will add recipes/tags over time.
- **D-37:** Tapping a tag applies it as a single active filter — selecting a new tag (even from a different rail group) replaces the previous filter, matching the reference app's one-filter-at-a-time browsing model. Not multi-select/AND-across-groups.

### Card & Detail Content
- **D-38:** Drink card (browse grid) shows: name, its flavor/type tags (tag-triplet style per reference), a makeable/not-makeable badge (in the position the reference reserves for price — no price exists in this app), and ingredient names without amounts.
- **D-39:** Detail screen shows: drink name, its tags, ingredient names without amounts (flat list — no grouping by role/spirit-vs-mixer-vs-garnish, no glassware/garnish shown), a makeable/not-makeable badge (same "in place of price" position as the card), and a description/story section that only renders if non-empty.
- **D-40:** Add a new free-text `description` field to the recipe data model, editable from the Barback recipe form (Phase 2/2.1's `RecipeForm.tsx`) — this is what populates the detail screen's story section. No AI generation this phase.
- **D-41:** No real recipe photos this phase — detail screen uses a placeholder in the hero-image slot (from the reference layout); the makeable indicator is NOT in the photo slot, it replaces the price position on both card and detail. Real photo upload / AI photo-import remains deferred (already tracked in PROJECT.md backlog).

### Makeable Indicator Design
- **D-42:** Patron collapses Barback's tri-state (green/yellow/red) makeable model down to 2 states: makeable / not-makeable. Yellow (substitution-available-but-not-as-written) counts as **not-makeable** from the guest's perspective — substitution judgment calls belong to the bartender (Phase 4), not the patron screen. — **Reversibility:** reversible — a pure display-layer collapse of the existing tri-state value from `computeMakeable()`; the underlying tri-state computation is untouched, so a future phase can re-expose 3 states on Patron without a data model change.
- **D-43:** Visual treatment: not-makeable cards are dimmed/desaturated in the browse grid AND carry a badge — both together, not badge-only. Makeable cards render at full visual weight.
- **D-44:** Missing-ingredient detail (PATR-04) shows only on the detail screen, not on the card — card stays at the D-38 content level.
- **D-45:** Not-makeable drinks remain fully visible and tappable in the browse grid at all times (no hide/filter toggle) — satisfies PATR-06's "browse freely" together with PATR-04's requirement that a patron can reach the missing-ingredient detail.

### Live Sync Behavior
- **D-46:** When a drink's makeable status changes live (via the Socket.IO push → TanStack Query refetch pattern already chosen in the tech stack), the card/badge updates silently in place — no pulse/flash animation this phase.
- **D-47:** Live updates apply on both the browse grid AND an open detail screen — if a patron has a drink's detail view open when its status flips, that view updates live too, not just the grid. Both surfaces subscribe to the same live makeable state.

### Claude's Discretion
- Icon choice for each of the 4 rail groups (Spirit/Type/Season/Flavor) and their sub-tags — follow the reference photo's icon style (simple line/glyph icons), specific glyphs are a UI-phase decision.
- Exact grid layout (columns, spacing) for the card view — reference proportions as a guide.
- Placeholder image treatment for the detail hero slot (D-41) — generic glass/cocktail silhouette or solid color block, UI-phase decision.
- Whether tags are stored as a fixed enum or an owner-extensible table pre-seeded with D-34's defaults — technical implementation detail for research/planning; D-35 only locks that the UI doesn't need new tag-management screens this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Product vision, constraints, reference design context
- `.planning/REQUIREMENTS.md` — PATR-01, PATR-02, PATR-03, PATR-04, PATR-06, SYNC-01 (this phase's requirements)
- `.planning/ROADMAP.md` §Phase 3: Patron Browse Experience — phase goal and success criteria

### Visual Reference (direct design source for this phase)
- `PXL_20260809_011509863.jpg` (repo root) — reference photo: icon rail with expandable submenu chevrons, card list view (name/tag-triplet/price/tap-to-view)
- `PXL_20260809_011531977.jpg` (repo root) — reference photo: drink detail view (hero photo, name, tag-triplet, price, origin story with location/decade + narrative text)

### Prior Phase Decisions (still binding, extended here)
- `.planning/phases/02.1-recipe-ui-cleanup/02.1-CONTEXT.md` — D-31/D-32 (tri-state makeable model, worst-of-all-lines rollup) is the source Patron's 2-state collapse (D-42) reads from; D-27 (unified autocomplete-with-create picker pattern) is the reference pattern for adding the new tag-picker to `RecipeForm.tsx`
- `.planning/phases/02-recipe-collection-makeable-engine/02-CONTEXT.md` — D-14 (recipe data lives in the shared backend, category-based/presence-based matching); `02-UI-SPEC.md`'s dark-theme tokens are the Barback-side baseline (Patron gets its OWN dark-neon system per PROJECT.md, not a reuse of Barback's utilitarian style — see D-11 in `01-CONTEXT.md`)
- `.planning/phases/01-barback-inventory-foundation/01-CONTEXT.md` — D-11 (Barback deliberately does NOT use the dark-neon Patron branding) confirms Patron is the first phase to actually build that neon visual system from the reference photos

### Live Implementation (current state being extended)
- `apps/server/src/services/makeableEngine.ts` — tri-state `computeMakeable()` this phase's 2-state collapse (D-42) reads from, unchanged
- `packages/shared/src/recipe.ts` — current recipe Zod contract (name/ingredients/method/glassware/garnish) that D-40 (description field) and D-33/D-34 (tags) extend
- `apps/server/src/db/schema.ts` — current `recipes`/`recipeIngredients` tables that need a new `description` column and a new tag/tag-group data model
- `apps/barback/src/components/RecipeForm.tsx` — where the new description field (D-40) and tag picker (D-33) get added on the owner-facing side

No external ADRs/specs exist for this project — these planning docs plus this CONTEXT.md and the two reference photos are the complete canonical source for Phase 3.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/barback/src/components/pickers/` — Phase 2.1's autocomplete-with-inline-create picker components are the closest existing analog for a new tag-multiselect picker in `RecipeForm.tsx`
- `apps/barback/src/api/useRecipes.ts` and sibling hooks — TanStack Query + cross-entity-invalidation pattern (`['recipes']` invalidation on stock/glassware/category changes) is the established precedent Patron's live-sync hooks should follow, paired with the Socket.IO push already chosen in the tech stack
- `packages/shared/` — existing per-entity Zod schema files (`recipe.ts`, `ingredient.ts`, `category.ts`, `glassware.ts`) are the pattern a new `tag.ts` (or equivalent) should follow

### Established Patterns
- Fastify routes + Zod validation + Drizzle + SQLite (`onDelete` guard conventions from Phase 1/2.1) — the pattern any new tags table/junction table should follow
- antd dark theme (`ConfigProvider` + `darkAlgorithm` + token overrides) is Barback's pattern; Patron is a SEPARATE app/theme (dark-neon, orange accents, per PROJECT.md reference photos) — do not inherit Barback's token values, only the ConfigProvider mechanism if antd is used at all for Patron (open question for research — Patron's guest-facing kiosk UI may not need antd's admin-form-oriented components)
- Vite SPA + React 19 + TanStack Query — same stack as Barback, new `apps/patron` workspace package per the monorepo structure in CLAUDE.md

### Integration Points
- `computeMakeable()` in `makeableEngine.ts` is the single source Patron's makeable badge reads from (via API response), same integration point Barback already uses — Patron does its own tri→2-state collapse (D-42) at the display layer, not by changing the engine
- New tag data model needs a junction table (recipe↔tag) and a live "which tags currently have ≥1 recipe" query for D-36's empty-tag-hiding rule — this is a new integration point between the tags feature and the rail's submenu rendering

</code_context>

<specifics>
## Specific Ideas

- Old Fashioned example: owner wants to tag it "Whiskey" (Spirit) + "Sweet" (Flavor) + "Classics" (Type) — concrete illustration of the multi-tag, multi-group model driving D-33/D-34
- The two reference photos are a literal pixel-level design reference for Phase 3's visual system — not just inspirational, the rail chevron-into-submenu interaction (D-33), the price-slot-becomes-makeable-badge substitution (D-38/D-39/D-41), and the tag-triplet row under the drink name are all drawn directly from what's visible in these photos

</specifics>

<deferred>
## Deferred Ideas

- Owner-managed tag CRUD (add/rename/delete tags/groups from Barback, like ingredient categories) — deferred past D-35's fixed-taxonomy-for-now decision; revisit if the D-34 defaults prove insufficient
- Real recipe photo upload and AI photo-import parsing — already tracked as an Active requirement in PROJECT.md, explicitly deferred past this phase per D-41
- Multi-select/AND-across-groups tag filtering — deferred past D-37's single-active-filter decision; revisit only if single-filter browsing proves too limiting in practice

### Reviewed Todos (not folded)
None — no pending todos matched this phase (`todo_count: 0`).

</deferred>

---

*Phase: 3-Patron Browse Experience*
*Context gathered: 2026-08-12*
