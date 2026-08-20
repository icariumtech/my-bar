# Phase 4: Bartender Console & Order Workflow - Context

**Gathered:** 2026-08-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the new `apps/bartender` app plus server-side order infrastructure: a patron can submit a single-drink order (with an optional "who's this for" note) from the Patron detail screen, which flows live into a Bartender queue; the Bartender screen (a two-tab utility UI — Recipes / Orders — running on an Echo Show 8 Gen 1 / LineageOS device) lets the bartender look up full recipe detail with tri-state makeable status, search/filter recipes by tags, and mark an order Done once fulfilled. Also adds Patron kiosk-lockdown (fullscreen, inactivity-timeout return-to-home). Does NOT include AI recommendations/substitutions, multi-item carts, barcode scanning, or any patron-facing live order-status tracking (SYNC-02 is satisfied by Bartender-side + submission-side sync only, not a patron order tracker).

</domain>

<decisions>
## Implementation Decisions

### Order Submission (Patron side)
- **D-48:** One drink per order — no multi-item cart. The order CTA lives only on the Patron `RecipeDetail` screen (not on browse-grid cards). — **Reversibility:** costly — a cart model would need a new client-side order-draft state and a different submission payload shape; ordering is currently strictly single-recipe end to end.
- **D-49:** Order button is disabled/hidden on the detail screen whenever the recipe is not makeable (2-state Patron collapse from D-42 governs this — yellow/substitution-available still counts as not-makeable, consistent with Phase 3).
- **D-50:** Tapping Order opens a small "who's this for" prompt (optional free-text, blank allowed — REQUIREMENTS.md's own wording) before final submit.
- **D-51:** On successful submit: brief confirmation (toast/overlay), then back to the browse grid. No persistent post-submit tracking screen for the patron.
- **D-52:** On submit failure (network error, or item went out of stock between tap and submit): inline error message on the same detail screen; patron can retry the Order button. No separate error page.
- **D-53:** No cooldown/lock after submitting — the same kiosk can submit another order immediately, even while a prior order from that kiosk is still unfulfilled. No "my order" state tracked client-side.
- **D-54:** Order record is minimal: recipe reference + optional free-text name + timestamp. No device/session identifier — matches the no-auth/no-accounts constraint (there's one Patron kiosk).

### Ticket Queue & Bartender Layout
- **D-55:** Bartender screen is two tabs: **Recipes** (full catalog, search + tag filter, for lookup per BART-01/05/06) and **Orders** (pending tickets). The Orders tab shows a badge with the count of open (not-yet-Done) orders. — **Reversibility:** costly — this tab split is the top-level navigation shape the rest of the Bartender app hangs off of.
- **D-56:** Tapping a recipe (from either tab) opens a shared full detail view: all measurements/quantities, method steps, garnish, glassware, tags, and tri-state makeable status. If the item being viewed is an open order, a **Done** button also appears on this detail screen.
- **D-57:** Status lifecycle satisfies BART-03's new → in progress → done: a ticket is "new" while unopened in the Orders tab; opening it (tapping into detail) auto-advances it to "in progress"; the only manual control is the Done button, which finishes it. No separate "Start" tap.
- **D-58:** Identical open orders (same recipe, still pending) collapse into a single row in the Orders tab list, shown with a count (e.g. "Old Fashioned ×3"); the individual "who's this for" names are listed inside; one Done button on that entry clears all of them at once.
- **D-59:** Each order row/detail shows elapsed time since submission (BART-04).
- **D-60:** Once marked Done, a ticket stays visible briefly (e.g. remainder of the session) then auto-clears — not removed instantly, so the bartender has a short window of recent-history visibility, but the queue doesn't grow unbounded over a long event. Exact retention window is a planning/research detail.
- **D-61:** No live order-status is ever pushed back to the Patron screen — SYNC-02 is satisfied by Patron→Bartender submission sync and Bartender↔Bartender consistency (if multiple bartender devices exist later), not a patron-facing tracker.

### Bartender Recipe Search & Makeable Display
- **D-62:** Search/filter is a filter button that opens a full-screen tag picker, listing all four existing tag groups (Spirit/Type/Season/Flavor) as selectable filters, plus a name search box — broader than BART-05's literal "name or base spirit" wording, since the full tag taxonomy already exists from Phase 3 and a full-screen filter view is cheap to build once. Search/filter applies to the Recipes tab only — the Orders tab has no search (small list, sorted oldest-first, no lookup need).
- **D-63:** Bartender sees the **full tri-state** makeable status (green/yellow/red from `computeMakeable()`), not Patron's 2-state collapse — the bartender is the one who makes substitution judgment calls (yellow = "substitution available"), so this state must be visible here even though it's hidden from patrons.

### Bartender Visual Style
- **D-64:** Bartender app is a plain antd utility UI (matching Barback's existing dark antd theme/mechanism), not themed with Patron's dark-neon branding — this is a working tool for the bartender, not a guest-facing screen. Runs on an Echo Show 8 Gen 1 (LineageOS, ~8" touchscreen) — layout must be responsive/scaled for that screen size but shows the same full content as a larger screen (no field-trimming).

### Claude's Discretion
- Kiosk lockdown mechanics (PATR-07): exact fullscreen/kiosk-lock implementation approach for Patron on iPad Safari — user deferred this to sensible defaults; research/plan the standard browser fullscreen API + a wake-lock/no-nav-chrome pattern appropriate for an unauthenticated wall-mounted kiosk.
- Inactivity timeout duration and detection (PATR-08): pick a reasonable idle threshold (e.g. 60–120s of no touch input) that returns Patron to the browse/home view; exact timing and what counts as "activity" (tap vs. scroll vs. any DOM event) is an implementation detail.
- Exact Done-ticket retention window (D-60) — "briefly" is not pinned to a number; pick something sensible (e.g. until next app load, or a fixed few-minute window) during planning.
- Visual treatment of the "×N" batched order row (D-58) and the elapsed-time display (D-59) — follow Barback's existing antd list/row conventions.
- Whether the Orders-tab badge counts "new" tickets only or "new + in progress" — not locked; pick whichever reads clearest as "orders needing attention."

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — Product vision, constraints, hardware context
- `.planning/REQUIREMENTS.md` — PATR-05, PATR-07, PATR-08, BART-01 through BART-06, SYNC-02 (this phase's requirements)
- `.planning/ROADMAP.md` §Phase 4: Bartender Console & Order Workflow — phase goal and success criteria

### Prior Phase Decisions (still binding, extended here)
- `.planning/phases/03-patron-browse-experience/03-CONTEXT.md` — D-42/D-43 (Patron's 2-state makeable collapse, which D-49 reuses for the order-button gating); D-33/D-34/D-35/D-36/D-37 (tag taxonomy — Spirit/Type/Season/Flavor groups, the same taxonomy D-62's Bartender filter reuses); D-46/D-47 (Socket.IO push → TanStack Query refetch live-sync pattern, the mechanism the Orders queue and BART-06's live makeable state both use)
- `.planning/phases/02.1-recipe-ui-cleanup/02.1-CONTEXT.md` — D-31/D-32 (tri-state makeable model: green/yellow/red, worst-of-all-lines rollup) — this is the exact tri-state D-63 says Bartender must show in full, unlike Patron's collapse
- `.planning/phases/01-barback-inventory-foundation/01-CONTEXT.md` — D-11 (Barback's utilitarian antd dark theme, not neon) — D-64 says Bartender follows this same visual precedent, not Patron's

### Live Implementation (current state being extended)
- `apps/server/src/ws/hub.ts` — Socket.IO hub already attached to Fastify (`app.io`); new order-created/order-status-changed events should follow the same `app.io?.emit(...)` pattern already used for inventory/recipe changes
- `apps/server/src/db/schema.ts` — current tables (`recipes`, `recipeIngredients`, `tags`, `recipeTags`, `ingredients`, `categories`, `glassware`); this phase needs a new `orders` table (recipe reference, optional name, status, timestamps) with no existing analog
- `apps/patron/src/components/RecipeDetail.tsx` and `apps/patron/src/api/useRecipeDetail.ts` — where the Order button (D-49/D-50) and "who's this for" prompt get added
- `apps/patron/src/api/socket.ts` — existing Socket.IO client wiring pattern for Patron; Bartender's new client should follow the same connection/reconnect approach
- `apps/barback/` — reference app for antd dark-theme mechanism (`ConfigProvider` + `darkAlgorithm`) and TanStack Query hook/invalidation conventions (`apps/barback/src/api/*`) that the new `apps/bartender` app should follow structurally
- No `apps/bartender` app exists yet — this phase creates it from scratch as a new monorepo package, structurally mirroring `apps/barback`'s Vite + React 19 + antd + TanStack Query setup

No external ADRs/specs exist for this project — these planning docs plus this CONTEXT.md are the complete canonical source for Phase 4.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/barback/` structure (Vite + React 19 + antd `darkAlgorithm` theme + TanStack Query hooks) — the direct template for scaffolding `apps/bartender`, since D-64 puts Bartender in the same utilitarian-antd visual family as Barback, not Patron's neon system
- `apps/patron/src/components/RecipeDetail.tsx` — closest existing analog for the shared Bartender recipe/order detail view (D-56); Bartender's version needs the additional tri-state badge (vs. Patron's 2-state) and a conditional Done button
- `apps/server/src/ws/hub.ts` + existing `app.io?.emit(...)` call sites in `apps/server/src/routes/*.ts` — the established pattern new order routes should follow for live push

### Established Patterns
- Fastify routes + Zod validation + Drizzle + SQLite, with `onDelete` guard conventions (restrict/cascade/set null) established across `categories`, `ingredients`, `recipes`, `tags` — the new `orders` table should follow the same conventions (e.g. recipe reference likely `onDelete: 'restrict'` or `'set null'` — a research/planning decision)
- TanStack Query + Socket.IO push-then-refetch (no partial WS payloads) — same pattern the Orders queue and BART-06's live makeable state must use, already proven in Phase 3
- antd dark utilitarian theme (Barback) vs. dark-neon custom theme (Patron) — two established, separate visual systems; Bartender explicitly joins the Barback family per D-64

### Integration Points
- `computeMakeable()` in `apps/server/src/services/makeableEngine.ts` — same single source of truth Bartender's tri-state display (D-63) reads from, via the recipes API response (no engine changes needed)
- New `orders` table + routes need to emit Socket.IO events on create and on status change so the Orders tab list/badge and elapsed-time displays update live without polling
- Tag taxonomy (`tags`/`recipeTags` tables, already built in Phase 3) is reused as-is by D-62's Bartender filter screen — no new tag data model needed, just a new filter UI consuming the existing tags API

</code_context>

<specifics>
## Specific Ideas

- Hardware: Bartender interface runs on an Amazon Echo Show 8 (1st Gen) flashed with LineageOS — a small (~8") Android touchscreen device, not an iPad. This is a real constraint on Bartender's UI density/responsiveness, distinct from Patron's iPad target.
- Concrete batching example (D-58): if 3 patrons order an Old Fashioned before the bartender gets to it, the Orders tab shows one "Old Fashioned ×3" row (not three separate rows), and marking it Done clears all 3 at once.
- Bartender's two-tab shape (Recipes / Orders with a badge count) and the "tap a recipe or order → shared detail screen → conditional Done button" flow (D-55/D-56) came directly from the owner describing how they want to physically use the device behind the bar — not inferred from requirements wording alone.

</specifics>

<deferred>
## Deferred Ideas

- Multi-item cart ordering — deferred past D-48's single-drink-per-order decision; revisit only if single-item ordering proves too limiting in practice
- Persistent patron-facing order status tracker — deferred past D-51/D-61; SYNC-02 is satisfied without one this phase
- Drag-and-drop ticket management — deferred past D-57's tap-to-advance/Done-button model
- Multi-device kiosk identity (order tagged with which Patron device it came from) — deferred past D-54; revisit only if multiple Patron kiosks are ever deployed

### Reviewed Todos (not folded)
None — no pending todos matched this phase (`todo_count: 0`).

</deferred>

---

*Phase: 4-Bartender Console & Order Workflow*
*Context gathered: 2026-08-17*
