# Phase 2: Recipe Collection & Makeable Engine - Context

**Gathered:** 2026-08-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Owner can manually build a real recipe collection (create/edit/delete recipes with name, ingredients, method, glassware, garnish), and the system computes — server-side, once, as the single source of truth — whether each recipe is makeable from live inventory, and if not, exactly which ingredient(s) are missing. Matching is category-based (any in-stock bottle in the right category, not one exact brand) and presence-based (boolean in-stock/out-of-stock, never volume/quantity-based). This phase does NOT include the Patron or Bartender screens, live cross-screen sync, AI features (recommendations, substitutions, recipe-photo import), recipe photos, flavor tags, or barcode scanning — those are Phase 3+ and v2 requirements.

</domain>

<decisions>
## Implementation Decisions

### Where Recipes Get Managed
- **D-14:** Recipe CRUD lives in a new "Recipes" tab/section inside the existing Barback app (not a new standalone app). Reuses Phase 1's dark utilitarian shell, routing, and API-client patterns — Patron and Bartender screens don't exist until Phase 3/4, so Barback remains the only owner-facing "back of house" surface. — **Reversibility:** reversible — a later phase can still lift recipe management into its own app or fold it elsewhere without touching the data model.
- **D-15:** The recipe list shows each recipe's makeable/not-makeable status inline (a badge per row), computed server-side — not only on the detail view. Directly serves the phase goal ("the core trust guarantee") and lets the owner scan the whole collection for gaps while building it out.

### Recipe Structure
- **D-16:** Method (mixing instructions) is stored as an ordered list of step strings, not a single free-text block. Renders as a clean numbered list; Phase 4's Bartender screen (BART-01, "full method detail") consumes this directly.
- **D-17:** Glassware is a curated, owner-managed list — add/rename/delete from the Recipes tab, mirroring Phase 1's category-management pattern (D-01/D-03) exactly. (Initially discussed as free text since glassware doesn't feed the makeable engine; revisited and changed to curated list for naming consistency across recipes.) — **Reversibility:** costly — once recipes reference glassware-list entries, converting back to free text means migrating every recipe's glassware value.
- **D-18:** Garnish is free text and explicitly does NOT reference inventory or affect makeable/not-makeable status. Keeps MATCH-01's scope ("boolean ingredient presence") from silently expanding to include garnishes — a missing lime wedge shouldn't block a drink from showing as makeable.

### Ingredient Quantity & Units
- **D-19:** Each recipe ingredient line's unit is chosen from a fixed dropdown (oz, dash, splash, barspoon, muddled, part, etc.), not free text — prevents the same typo-drift Phase 1's D-01 avoided for categories.
- **D-20:** No unit conversion. Quantity + unit are stored and displayed exactly as entered from the dropdown (e.g. "2 oz", "1 dash") — no oz↔ml conversion table. MATCH-04's "canonical unit converted for display" is satisfied by consistent dropdown values alone, since makeable-check logic is presence-based, not volume-based, and several units (dash, splash, muddled) aren't meaningfully volume-convertible anyway.

### Category & Glassware Deletion Guard
- **D-21:** Deleting a category is blocked if ANY ingredient OR ANY recipe still references it (previously Phase 1's D-03 only checked ingredients) — refusal message includes an accurate count of each. Prevents silently breaking a recipe's category-based matching by deleting the category out from under it.
- **D-22:** Glassware deletion gets the identical usage guard — blocked with an accurate count if any recipe still references that glassware entry. One shared "curated list with usage guard" pattern applies consistently to categories and glassware.

### Claude's Discretion
None — every gray area discussed had an explicit user decision (see above), including one revisited/superseded decision (glassware: free text → curated list).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Product vision, constraints, reference design context
- `.planning/REQUIREMENTS.md` §Recipes (RECIPE-01, RECIPE-02) and §Makeable Matching (MATCH-01 through MATCH-04) — the requirements this phase implements
- `.planning/ROADMAP.md` §Phase 2: Recipe Collection & Makeable Engine — phase goal and success criteria

### Prior Phase Decisions (still binding)
- `.planning/phases/01-barback-inventory-foundation/01-CONTEXT.md` — D-01/D-02/D-03 (category model: fixed curated list, one category per ingredient, owner-managed add/rename/delete with delete-guard) is the direct precedent this phase's D-17/D-21/D-22 extend. D-07 (no flavor-profile data) still holds — do not add flavor fields to recipes.

No external ADRs/specs exist for this project — these planning docs plus this CONTEXT.md are the complete canonical source for Phase 2.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/server/src/db/schema.ts` — `categories` and `ingredients` Drizzle tables already implement the unique-name, delete-restrict pattern (D-01/D-03) that this phase's `glassware` table and the recipe→category delete-guard extension should mirror.
- `packages/shared/src/category.ts` and `packages/shared/src/ingredient.ts` — Zod schema pattern to replicate for `recipe.ts`: a `*Input` schema for create/edit, a full response schema with joined display fields (e.g. `categoryName` joined onto `ingredient` → equivalent joins needed for recipe ingredient lines' category names and the recipe's glassware name), and narrow single-purpose patch schemas (like `stockPatch`) rather than one large mutable object.
- `apps/server/src/routes/categories.ts` / `categories.test.ts` and `ingredients.ts` / `ingredients.test.ts` — route + colocated-test pattern to follow for new `recipes.ts` and `glassware.ts` routes.
- `apps/barback/src/components/CategoryManager.tsx` — the exact UI pattern (add/rename/delete with refusal-on-use-count) to replicate for a `GlasswareManager.tsx`.

### Established Patterns
- Fastify routes + Zod validation at the boundary + Drizzle ORM + SQLite `onDelete: 'restrict'` as the database-enforced invariant, not just application-code checks — the pattern this phase's category/glassware/recipe relations should continue.
- antd + Tailwind dark utilitarian styling (Phase 1's Barback shell) — the Recipes tab should match, not introduce a new visual language.

### Integration Points
- The makeable engine is new server-side logic with no Phase 1 precedent — likely a computed field/endpoint that joins recipe ingredient lines against current `ingredients.inStock` grouped by `categoryId`, returning `makeable: boolean` plus `missingCategoryIds`/`missingCategoryNames`. Research should confirm the cleanest place for this (a dedicated endpoint vs. a field computed inline on recipe GET responses).

</code_context>

<specifics>
## Specific Ideas

- Glassware examples the owner may want to distinguish: "Coupe" vs "Nick & Nora" — illustrates why a curated, owner-editable list (not a small fixed preset) was chosen, same rationale as Phase 1's flexible category taxonomy.
- Unit dropdown should cover at minimum: oz, dash, splash, barspoon, muddled, part — drawn directly from how the owner described entering quantities.

</specifics>

<deferred>
## Deferred Ideas

- **Garnish tied to inventory** — Considered and explicitly rejected for this phase (see D-18): garnish referencing real ingredients/categories and affecting makeable status. Could be revisited in a future phase if the owner later wants stricter garnish tracking, but would need garnish items (limes, cherries, mint) modeled as first-class inventory ingredients first.
- **Unit volume conversion (oz↔ml)** — Considered and explicitly rejected for this phase (see D-20). Would only matter if a future feature needed true volume math (e.g. batch-scaling a recipe) — no such requirement exists yet.

### Reviewed Todos (not folded)
None — no pending todos matched this phase (`todo_count: 0`).

</deferred>

---

*Phase: 2-Recipe Collection & Makeable Engine*
*Context gathered: 2026-08-10*
