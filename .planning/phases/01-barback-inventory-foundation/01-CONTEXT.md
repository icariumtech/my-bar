# Phase 1: Barback Inventory Foundation - Context

**Gathered:** 2026-08-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Owner can fully manage the bar's real inventory from their phone: add ingredients/bottles with name and category, edit them, toggle in-stock/out-of-stock, and search/filter the list — all persisted to a live backend, mobile-first and comfortably one-handed. This phase does NOT include recipes, the makeable/not-makeable engine, the Patron or Bartender screens, live cross-screen sync, AI features, or barcode scanning — those are Phase 2+ and v2 requirements.

</domain>

<decisions>
## Implementation Decisions

### Category Model
- **D-01:** Categories are a fixed, curated list — not free-text per ingredient. Prevents typo drift (e.g. "Liqueur" vs "liqueur") that would silently break Phase 2's category-based makeable matching. — **Reversibility:** costly — once Phase 2 recipes reference categories for matching, restructuring the category taxonomy means recategorizing every affected ingredient and recipe reference.
- **D-02:** One category per ingredient (not multi-category). Simpler data model and simpler Phase 2 matching logic.
- **D-03:** The owner can add/rename/delete categories directly from the Barback screen in Phase 1 — not a hardcoded preset list. Matches the "owner builds their own curated collection" philosophy already set for recipes. Categories can be as broad or specific as the owner wants (e.g. "Gin" vs "Dry Gin" as separate categories) since the owner fully controls the list.

### Ingredient Identity
- **D-04:** Inventory entries represent specific bottles/brands, not generic ingredient types — e.g. "Bombay Sapphire Gin," not just "Gin." Matches how a home bar actually tracks and restocks.
- **D-05:** A single free-text **Name** field holds the full product title (e.g. "Bombay Sapphire Gin," "Hendrick's Limited Edition Orbium Gin"). No separate structured Brand/Product fields — the owner types the name however makes sense to them, and Category (D-01–D-03) is the separate field used for matching/filtering.
- **D-06:** An optional free-text size/note field is included per ingredient (e.g. "750ml"), even though nothing reads it yet in Phase 1 or Phase 2's matching logic.
- **D-07:** Flavor-profile data is explicitly OUT of Phase 1's data model — deferred to a later phase (see Deferred Ideas). Do not add a flavor/profile field now.

### In-stock Toggle & Defaults
- **D-08:** Toggle interaction is a **swipe gesture** on the ingredient row: swipe left → out-of-stock, swipe right → in-stock, with a brief (~few seconds) undo grace period before the change finalizes. Not a switch control, not a full-row tap.
- **D-09:** Newly added ingredients default to **in-stock**.
- **D-10:** No blocking confirmation modal on toggle — the swipe's undo grace period (D-08) is the safety net instead.

### Barback Visual Style
- **D-11:** The Barback screen gets its own **distinct, utilitarian** visual style — it does NOT reuse the dark-neon Patron branding from the reference photos. Barback is a personal tool guests never see; optimize for speed and legibility, not guest-facing polish.
- **D-12:** Barback uses a **dark color scheme** — easier on the eyes in typical dim bar lighting when restocking.
- **D-13:** Layout prioritizes **large tap targets and minimal chrome** over information density — optimized for one-handed thumb use, not for showing the maximum number of items per screen.

### Claude's Discretion
None — every gray area discussed had an explicit user decision (see above). No open "you decide" items from this discussion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Product vision, constraints (no-auth, local network, browser-based), reference design context
- `.planning/REQUIREMENTS.md` §Inventory (Barback) — INV-01 through INV-05, the requirements this phase implements
- `.planning/ROADMAP.md` §Phase 1: Barback Inventory Foundation — phase goal and success criteria

No external ADRs/specs exist for this project yet — no SPEC.md, no separate architecture docs. These three planning docs are the complete canonical source for Phase 1.

</canonical_refs>

<code_context>
## Existing Code Insights

This is a greenfield project — no application code exists yet (repo contains only planning docs, `LICENSE`, `README.md`, and two reference photos at the repo root). Phase 1 planning/research should treat the tech stack recommendations in `.claude/CLAUDE.md` (Node 22, TypeScript, Vite, React 19, Fastify, better-sqlite3, Drizzle ORM, Tailwind CSS v4) as the starting point, since no prior implementation exists to pattern-match against.

### Reusable Assets
- None yet — this is the first phase of implementation.

### Established Patterns
- None yet.

### Integration Points
- `PXL_20260809_011509863.jpg` and `PXL_20260809_011531977.jpg` at the repo root are the dark-neon Patron reference photos described in `PROJECT.md`. Not directly relevant to Phase 1 (D-11 deliberately diverges from this style for Barback), but flagged here so they aren't mistaken for stray files — they matter starting Phase 3 (Patron Browse Experience).

</code_context>

<specifics>
## Specific Ideas

- User's own naming examples: Name "Bombay Sapphire Gin" with Category "Dry Gin"; Name "Hendrick's Limited Edition Orbium Gin" with Category "Gin" — illustrates that Category can be more specific than a generic top-level spirit type, entirely at the owner's discretion.
- Swipe gesture direction is specific and intentional: **left = out-of-stock, right = in-stock**, with a short undo grace period rather than an undo toast after the fact.

</specifics>

<deferred>
## Deferred Ideas

- **AI-assisted brand/flavor-affinity matching** — When adding a bottle, suggest which recipes it's best suited for (or vice versa, when adding a recipe, suggest which specific bottles in stock work best) based on flavor profile — not just category membership. User's example: a recipe calling for gin might specifically want Bombay Sapphire or Beefeater over a more floral gin like Hendrick's. This goes beyond Phase 2's category-level matching (MATCH-03, "any bottle in the right category") and beyond the existing v2 AI-02 substitution feature ("suggest a substitute when an ingredient is entirely missing") — it's a preference/ranking layer on top of category matching, for when multiple in-category bottles are in stock. Depends on flavor-profile data (see D-07, also deferred) existing on ingredients/recipes first. Consider as a fast-follow after Phase 2's core makeable engine is proven, likely bundled with or after AI-02.
- **Barcode-scan-to-toggle-stock** — Refinement to the existing v2 requirements SCAN-01/SCAN-02 (barcode scanning to prefill new-ingredient details): scanning a *known* bottle's barcode should also be able to toggle it back in-stock (restock) or remove it from stock, not only prefill details when first adding a new ingredient. Relevant when SCAN-01/SCAN-02 are eventually planned.

### Reviewed Todos (not folded)
None — no pending todos matched this phase (`todo_count: 0`).

</deferred>

---

*Phase: 1-Barback Inventory Foundation*
*Context gathered: 2026-08-09*
