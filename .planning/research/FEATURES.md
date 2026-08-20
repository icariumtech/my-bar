# Feature Research

**Domain:** Home bar management — three-role app (Patron ordering kiosk, Bartender recipe/queue console, Barback mobile inventory), overlapping with consumer cocktail-recipe apps, commercial bar-inventory software (WISK, BinWise, Backbar, Barkeep), and restaurant self-order-kiosk/KDS patterns.
**Researched:** 2026-08-09 (v1.0), 2026-08-20 (v1.1 additions)
**Confidence:** MEDIUM-HIGH (web search only, cross-checked across multiple independent sources per topic; no official vendor docs or SDKs involved — this is a product/UX domain, not a library integration)

---

# Part 1: Feature Landscape for v1.0 (Core App)

This domain sits at the intersection of three normally-separate product categories, which is why "table stakes" differs sharply by role:

- **Patron role** ≈ consumer cocktail-recipe apps (Mixel, Make Me A Cocktail, Cocktail Party, My Cocktail Bar) + restaurant self-order kiosks (QSR tablet ordering).
- **Bartender role** ≈ a lightweight KDS (kitchen display system) + a bartender's recipe cheat-sheet app (Shaken and Stirred, Cocktails Guru).
- **Barback role** ≈ commercial bar-inventory software (WISK, BinWise, Backbar, Barkeep) scaled down to zero-cost, single-location, no-POS-integration home use.

None of the researched products combine all three into one connected system with a shared live inventory — that combination is itself close to this project's core differentiator, not something to copy feature-for-feature from any single competitor.

## Table Stakes — Patron Interface

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Browse drinks by category (icon rail / tabs) | Every referenced menu app and self-order kiosk organizes by category; matches the owner's reference screenshots directly | LOW | Static category list is fine at this scale (Cocktails/Wine/Beer/Spirits/etc.) |
| Drink detail view (photo, description, flavor tags) | Consumer cocktail apps and kiosk menus both treat the detail view as the primary "sell" moment | LOW | Photo is the single highest-impact visual element per kiosk UX research |
| Clear makeable / not-makeable indicator on every card | This is the project's stated Core Value — every researched pantry/cocktail app that does ingredient matching surfaces this as the primary UI signal (badge, dim/grey-out, "almost" label) | MEDIUM | See dedicated Makeable-From-Stock Logic section below |
| "Missing ingredient(s)" detail for not-makeable drinks | My Cocktail Bar and similar apps explicitly show *what's missing*, not just a binary no — this is what makes a "no" actionable instead of a dead end | LOW | Simple diff of recipe ingredients vs. in-stock ingredients |
| Order submission (send to bartender queue) | Core requirement; mirrors restaurant self-order kiosks sending tickets to a KDS | MEDIUM | No payment/cart-total step needed (no payments) — simplifies vs. commercial kiosks significantly |
| Browse-only mode (no forced order) | Explicitly requested; also matches real usage — commercial kiosks assume every session ends in a transaction, but a home menu screen is browsed far more often than ordered from | LOW | Just means "order" is one optional action on the detail view, not a forced funnel |
| Kiosk-lock / guided-access-friendly full-screen mode | Wall-mounted, unauthenticated, always-on tablet — without this, guests can accidentally back out to Safari/home screen or fiddle with settings | LOW | PWA fullscreen / iOS Guided Access; standard practice for any public-facing kiosk tablet |
| Idle timeout → return to browse/home view | Standard self-order-kiosk pattern; prevents a stuck detail view or half-finished order from persisting for the next guest | LOW | |
| "Who's this for" free-text field on order submission | With no accounts, the bartender has no other way to know who an order is for; every KDS pattern researched relies on a name/table identifier attached to the ticket | LOW | Simple free-text, not a real identity system — one line, optional but strongly recommended |

## Table Stakes — Bartender Interface

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full recipe detail (ingredients + quantities + method + glassware + garnish) | This is the standard field set across every bartending reference app researched (Shaken and Stirred, Cocktails Guru, BarSmarts) — ingredients, method (build/shake/stir/muddle/blend), glass, ice, garnish | LOW | Recipe data model should capture these fields from the start (also feeds AI photo-import extraction target schema) |
| Live order queue, new orders appear without manual refresh | Direct analogue to a KDS ticket rail; the entire value of a KDS over a paper ticket is that it's real-time — a polling/refresh-required queue would feel broken by comparison to any modern ordering system | MEDIUM | Requires a push/live-update mechanism (WebSocket or short-poll), not a "refresh" button |
| Ticket status lifecycle (new → in progress → done/served) | Universal KDS pattern — tickets get "bumped" through stages so bartender and system agree on what's outstanding | LOW–MEDIUM | With one bartender and one station, this can be a simple 2–3 state model, not full multi-station KDS complexity |
| Elapsed-time indicator per ticket | Standard KDS feature — shows how long an order has been waiting | LOW | Simple "time since submitted," no SLA/alerting needed at this scale |
| Search/filter recipes (by name, base spirit, flavor) | Bartending reference apps universally support search — a real-time lookup during service is the primary bartender use case outside the queue | LOW | |
| Recipe list reflects live makeable/not-makeable state | Same shared-inventory requirement as Patron — bartender needs to see the same "can I actually make this" truth, e.g. if a walk-up request isn't in the queue | LOW (once shared state exists) | Reuses the same matching logic as Patron — do not duplicate the algorithm |

## Table Stakes — Barback Interface

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add/edit ingredient or bottle (name, category, brand) | Every bar-inventory tool (WISK, BinWise, Backbar, Barkeep) starts here; this is the base CRUD the rest of the system depends on | LOW | |
| In-stock / out-of-stock toggle per ingredient | The minimum signal the makeable-logic needs; every consumer cocktail app (Mixel, Cocktail Party) reduces inventory to this same boolean at its core | LOW | This is the load-bearing table-stakes feature — everything else in the app depends on this being accurate and low-friction to update |
| Mobile-first responsive layout | Barback role is explicitly phone-based; commercial tools (Backbar, EasyInventory) all lead with mobile-first counting flows for exactly this reason (staff count from the floor/stockroom, not a desktop) | LOW–MEDIUM | |
| Search/filter inventory by name/category | Standard across all inventory tools once list size passes ~20-30 items; this project expects 50-100 | LOW | |
| Category/type tagging on ingredients (spirit type, liqueur, bitters, mixer, etc.) | Needed both for browsing and for substitution-aware matching (see logic section) — every commercial and consumer tool researched categorizes ingredients, not just names them | LOW–MEDIUM | This taxonomy decision has downstream effects — worth getting right early (see Dependencies) |

## Differentiators — Patron Interface

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI recommendation when a desired drink can't be made | No researched competitor (consumer cocktail app or commercial kiosk) does live LLM-driven "closest alternative" reasoning — most either show a flat "no results" or a static "almost makeable" list. This turns a dead end into a positive discovery moment | MEDIUM–HIGH | Already an explicit project requirement; depends on makeable logic + recipe flavor metadata |
| Dark-neon premium visual design matching the reference photos | Consumer cocktail apps researched are largely utilitarian (list-heavy, generic Material/iOS styling); a bespoke premium aesthetic is a genuine differentiator for the "feels like a real bar menu" experience | LOW–MEDIUM (design effort, not technical complexity) | |
| Flavor-profile tags / "almost makeable, missing X" surfaced proactively | My Cocktail Bar does a version of this — showing it prominently (vs. burying it) is a differentiator, not table stakes, because most apps treat it as secondary | LOW | Builds directly on the missing-ingredient diff already required for the not-makeable state |

## Differentiators — Bartender Interface

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI substitution suggestions when a recipe is missing an ingredient | Commercial and consumer tools researched only do rule-based/static substitution charts (e.g. "orange liqueur ↔ orange liqueur") at best; LLM-generated reasoning about flavor-appropriate swaps from *actual current stock* is not something any researched competitor does | MEDIUM–HIGH | Already an explicit project requirement; natural extension of the substitution-aware matching layer |
| Shared source-of-truth with Patron and Barback (no separate "backend" data entry) | Commercial tools (WISK, Backbar) sync inventory to POS but not to a customer-facing ordering surface — that combination doesn't exist in the researched competitive set | MEDIUM (mostly architecture, not bartender-facing feature work) | This is really the project's core differentiator, expressed at the bartender screen as "queue and recipes always agree with what's actually in stock" |

## Differentiators — Barback Interface

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| In-browser camera UPC scanning (no dedicated hardware) | Commercial tools mostly assume Bluetooth/dedicated scanners; consumer apps (noflair, Drinks On...D) that do camera scanning are single-purpose bottle-tracking apps, not connected to a live ordering system | MEDIUM–HIGH | Browser barcode APIs (e.g. BarcodeDetector / a JS zxing-style library) plus a UPC lookup fallback (public product DB or manual entry) — flag for phase-specific research |
| AI recipe-photo import (photo/screenshot → structured recipe) | Not found in any researched competitor — bar-inventory tools import from supplier catalogs, not from photographed recipe cards; cocktail apps ship with pre-seeded databases instead of ingesting user recipes at all | MEDIUM–HIGH | Already an explicit project requirement; needs a defined target schema (ingredients + qty/unit + method + glass + garnish) for the AI to extract into — same schema as the Bartender recipe detail view |
| Auto-generated low-stock shopping list | Seen in one researched consumer app (Drinks On...D: scan → shopping list when below target); not present in most competitors researched | LOW–MEDIUM | Natural follow-on once ingredients have a stock-level field beyond boolean in/out; can be deferred past v1 |

## Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Precise volumetric pour-depletion tracking (auto-decrement ml per drink poured) | Commercial tools (WISK, precision scales) do this, and it feels like the "correct" way to know true stock levels | Requires either integrated scales/flow meters or perfectly disciplined manual logging by every guest/bartender-friend pouring a drink — neither exists in this home setting; the imprecision of "dash," "splash," "barspoon" units (which have no fixed volume even in professional practice) makes exact math meaningless anyway. This is the single biggest scope trap in this domain. | Boolean/coarse in-stock tracking as the source of truth for makeable-logic; optional coarse fractional level (full/¾/½/¼/empty) set manually by the barback for shopping-list purposes only, decoupled from the makeable-check math |
| User accounts / per-guest order history / loyalty | Feels like standard "app" behavior, and self-order-kiosk research assumes it | Explicitly out of scope per PROJECT.md; adds login friction for exactly the casual/trusted-network use case this app serves | The free-text "who's this for" field on an order gives 90% of the practical benefit (bartender knows who to hand the drink to) with none of the friction |
| Payments / tabs / checks / pricing | Every commercial POS and kiosk system researched treats this as the core loop | Explicitly out of scope — no commercial transaction exists; building a fake price/cart/checkout flow adds real complexity for zero benefit | Drop price entirely from the drink card; if a "value" signal is wanted, use flavor/strength tags instead (matches the reference design's flavor-tag triplet, not a price) |
| Multi-station KDS routing / course timing / expo screen | Standard KDS feature set (route drinks to bar station, food to kitchen, sync course timing) | There is exactly one station (the bartender) — none of the coordination problems multi-station KDS solves exist here | A simple 2-3 state ticket lifecycle (new → in progress → done) on a single queue |
| Seeded/imported cocktail database (e.g. TheCocktailDB) | Fastest way to launch with "content" | Explicitly out of scope — owner wants a curated personal collection; a large generic seed set also pollutes makeable-logic with hundreds of drinks that will never be makeable, undermining the Core Value signal | Manual entry + AI photo-import cover cold-start fast enough for a ~100-recipe personal collection |
| Full POS/supplier integration, invoice matching, COGS/margin reporting | Commercial bar-inventory tools (WISK, Restaurant365) lead with these as flagship features | No commercial purchasing, invoicing, or margin exists in a home bar — this is pure overbuild for a friends/family use case | None needed; if the owner ever wants cost visibility, a simple manual "price paid" field on a bottle is enough, not a reporting subsystem |
| Allergen filtering system / dietary-preference profiles | Self-order kiosk research flags this as a common commercial feature | No strangers are ordering — the owner and friends/family already know each other's allergies; building a filter UI is solving a problem this audience doesn't have | If needed later, a plain-text note on a recipe ("contains egg white") is sufficient |
| Real dedicated barcode scanner hardware / Bluetooth scanner support | Commercial inventory tools (EasyInventory) support Bluetooth scanners for speed at scale | At 50-100 bottles, in-browser camera scanning is fast enough; hardware adds cost, setup, and another device to keep charged for a marginal speed gain | In-browser camera-based UPC scanning (already the planned approach), with manual entry as fallback when a UPC isn't recognized |

## Makeable-From-Stock Logic Patterns

This is the algorithmic core of the app's Core Value and deserves explicit treatment beyond "table stakes."

### Pattern 1 — Boolean presence matching (the baseline, and what most competitors actually ship)

Every consumer cocktail app researched (Mixel, Make Me A Cocktail, Mixit, Cocktail Party, My Cocktail Bar) reduces "makeable" to a simple set-membership check: a drink is makeable if every ingredient it requires is present (in stock) in the user's ingredient list. None of them attempt to reason about *how much* of an ingredient is available — presence/absence is the universal baseline. This should be this project's default matching algorithm too: `makeable = (recipe.ingredients ⊆ inventory.in_stock_ingredients)`.

### Pattern 2 — Partial-match / "almost makeable"

My Cocktail Bar's pattern (and the project's own explicit requirement) extends Pattern 1 by not stopping at a binary result: compute the *set difference* between a recipe's required ingredients and current stock, then classify drinks by how many ingredients are missing (0 = makeable, 1-2 = "almost," 3+ = not worth surfacing). This is the same computation as Pattern 1, just not discarding the diff — cheap to add once Pattern 1 exists, and it's what turns "no" into an actionable, specific message ("missing: Angostura bitters").

### Pattern 3 — Substitution-aware / category matching

The naive version of Pattern 1 breaks the moment a recipe calls for a specific brand ("Cointreau") but the bar stocks a different bottle in the same role ("Grand Marnier," "Triple Sec"). The standard fix, used in both cocktail-modifier taxonomies (bitters/liqueurs are near-universally discussed as *categories* — orange liqueur, aromatic bitters, orange bitters — rather than single brands) and in general recipe-substitution engines (rule-based category swaps, e.g. buttermilk ↔ milk+lemon), is a two-layer ingredient model:

- Every inventory bottle belongs to a **category** (e.g. "orange liqueur," "rye whiskey," "orange bitters," "aromatic bitters").
- Every recipe ingredient line references a category by default, with an optional brand-pin only when the specific bottle actually matters to the drink's identity (rare — most recipes are brand-agnostic in practice).
- Matching becomes: does the inventory contain *any in-stock bottle in the referenced category* (or the exact pinned brand, if pinned)?

This is also the data structure the project's own AI substitution feature needs: when a category has zero in-stock bottles, that's the trigger for asking Claude to suggest a flavor-appropriate substitute from whatever categories *are* in stock — the category taxonomy is a prerequisite for that feature, not an independent one.

### Pattern 4 — Unit conversion and the case for NOT quantity-tracking makeability

Researched standard bar-measurement conversions are consistent (1 oz = 30 ml, 1 jigger = 1.5 oz = ~44 ml, 1 tsp/barspoon ≈ 5 ml) but small-format units are explicitly imprecise even in professional use: a "dash" is commonly cited as anywhere from ~0.6 ml to ~1 ml depending on the bottle and bartender, and "splash" has no standard definition at all across sources. This has a direct design implication:

- **Use quantity/unit conversion for display purposes** (storing a canonical unit — recommend milliliters — and converting to oz/dash/etc. for display) so recipes read naturally to a bartender.
- **Do NOT use quantity for the makeable-check math.** None of the researched consumer cocktail apps compute "do I have *enough* volume of X for this recipe" — they all stop at presence/absence (Pattern 1). This is the right scope choice here too: true volumetric depletion tracking requires either integrated scales/flow meters (commercial-grade hardware this project doesn't have) or perfect manual pour-logging discipline from casual home bartenders, neither of which is realistic. Attempting it would be the single most likely source of a rewrite or a UI that lies to guests ("makeable" when the bottle is actually empty because depletion math silently drifted from reality).
- The one place quantity legitimately matters is a **coarse manual stock level** (full/¾/½/¼/empty) set by the barback occasionally, used only to drive low-stock alerts/shopping lists — decoupled entirely from the makeable-check, which stays boolean in/out.

### Summary Recommendation

Ship Patterns 1–3 (boolean presence + partial-match + category-based substitution) as the core makeable-logic for v1. Treat true quantity-based depletion tracking as an anti-feature per the table above — no researched competitor does it at this scale, and the imprecision of standard bar units makes it unreliable even if built.

## Feature Dependencies

```
Ingredient category taxonomy (Barback)
    └──requires──> Add/edit ingredient (name, category, brand)

Boolean in-stock toggle (Barback)
    └──enables──> Makeable/not-makeable logic (Pattern 1)
                       └──enables──> "Missing ingredient(s)" detail (Pattern 2)
                                          └──enables──> AI patron recommendation on not-makeable
                                          └──enables──> AI bartender substitution suggestion

Ingredient category taxonomy
    └──enables──> Substitution-aware matching (Pattern 3)
                       └──enhances──> AI substitution suggestion (narrows what Claude needs to reason about)

Recipe data schema (ingredients+qty/unit, method, glass, garnish)
    └──requires──> AI recipe-photo import (defines the extraction target)
    └──requires──> Bartender recipe detail view (defines the display target)

Live shared inventory state (sync mechanism)
    └──requires──> Makeable logic showing consistently on Patron AND Bartender screens
    └──requires──> Live order queue updates without refresh

UPC barcode scanning ──enhances──> Add/edit ingredient (speeds entry, not required for it)

Coarse fractional stock level ──enhances──> Low-stock shopping list (v1.x/v2, independent of makeable-check)

Payments/accounts/loyalty ──conflicts──> No-auth kiosk access model (explicit project decision)
```

### Dependency Notes

- **Makeable logic requires the boolean in-stock toggle, not full CRUD on quantities.** Build the simplest version of Barback data entry first; the makeable-check does not need to wait for a quantity/unit system.
- **AI substitution and AI recommendation both sit downstream of the missing-ingredient diff.** Get Pattern 1 + Pattern 2 solid before wiring the Claude calls — the AI features are a thin reasoning layer on top of data the matching logic already computes, not a replacement for it.
- **The category taxonomy is a foundational, hard-to-retrofit decision.** Deciding how granular categories are (e.g. "orange liqueur" vs. "triple sec" vs. "Cointreau specifically") shapes both the substitution-matching quality and the AI prompt design. Get this right in an early phase rather than bolting it on after recipes/inventory already exist with flat ingredient names.
- **Live sync (shared inventory + live queue) is one underlying capability, not two features.** Whatever mechanism is chosen (WebSocket, SSE, or short-polling) should serve both the makeable-state-must-agree-everywhere requirement and the queue's real-time-ticket requirement — don't build two separate sync systems.
- **Payments/accounts conflict with the no-auth kiosk model** — this isn't just "not built," it's actively incompatible with the trusted-network, zero-friction access pattern the project has already decided on.

## MVP Definition

### Launch With (v1)

- [ ] Barback: add/edit ingredient with name + category + boolean in-stock toggle — everything else depends on this existing and being trustworthy
- [ ] Patron: browse by category, drink detail view, makeable/not-makeable badge with missing-ingredient list (Patterns 1-2)
- [ ] Patron: order submission (with optional "who's this for" field) to a live bartender queue
- [ ] Bartender: recipe detail (ingredients/qty/unit, method, glass, garnish), live queue with new→in-progress→done states
- [ ] Manual recipe entry (owner needs to seed ~100 recipes from zero regardless of what else ships)
- [ ] Category-based substitution matching (Pattern 3) — cheap once the taxonomy exists, and the AI substitution feature is much weaker without it
- [ ] Kiosk-lock/fullscreen + idle timeout on the Patron screen — a wall-mounted unauthenticated tablet without this will misbehave on day one

### Add After Validation (v1.x)

- [ ] AI-assisted patron recommendation when a drink can't be made — add once the manual makeable/missing-ingredient flow is proven correct and trustworthy; an AI recommendation on top of buggy matching logic will just erode trust faster
- [ ] AI-assisted bartender substitution suggestions — same trigger condition
- [ ] AI recipe-photo import — valuable primarily once the owner has proven out the manual-entry recipe schema and wants to accelerate filling out the remaining ~50-70 recipes
- [ ] UPC camera barcode scanning — valuable once there are enough bottles (>20-30) that manual entry is genuinely tedious; not needed to validate the core concept with an initial ~20-30 bottle set
- [ ] Coarse fractional stock level (full/¾/½/¼/empty) — trigger: owner finds boolean in/out insufficiently informative for restocking decisions

### Future Consideration (v2+)

- [ ] Auto-generated low-stock shopping list — defer until fractional stock levels exist and the owner has a real restocking rhythm to automate
- [ ] Flavor-profile tag browsing/filtering on Patron screen — defer until there's enough recipe volume (~50+) for filtering to matter over simple category browsing
- [ ] Anything from the Anti-Features table — explicitly not planned; revisit only if the project's audience or context changes (e.g. app ever exposed beyond the home network)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Boolean in-stock toggle + ingredient CRUD (Barback) | HIGH | LOW | P1 |
| Makeable/not-makeable + missing-ingredient diff (Patterns 1-2) | HIGH | MEDIUM | P1 |
| Category-based substitution matching (Pattern 3) | HIGH | MEDIUM | P1 |
| Patron browse + detail view | HIGH | LOW | P1 |
| Order submission + live bartender queue | HIGH | MEDIUM | P1 |
| Bartender recipe detail (full schema) | HIGH | LOW | P1 |
| Kiosk-lock + idle timeout | MEDIUM | LOW | P1 |
| Manual recipe entry/editing | HIGH | LOW | P1 |
| AI patron recommendations | MEDIUM–HIGH | MEDIUM–HIGH | P2 |
| AI bartender substitution suggestions | MEDIUM–HIGH | MEDIUM–HIGH | P2 |
| AI recipe-photo import | MEDIUM | MEDIUM–HIGH | P2 |
| UPC camera barcode scanning | MEDIUM | MEDIUM–HIGH | P2 |
| Coarse fractional stock level | LOW–MEDIUM | LOW | P2 |
| Low-stock shopping list | LOW–MEDIUM | LOW | P3 |
| Flavor-tag browsing/filtering | LOW–MEDIUM | LOW | P3 |
| Volumetric pour-depletion tracking | LOW (see Anti-Features) | HIGH | Not planned |
| Payments/accounts/loyalty | N/A (out of scope) | HIGH | Not planned |

## Competitor Feature Analysis

| Feature | Consumer cocktail apps (Mixel, Make Me A Cocktail, Cocktail Party) | Commercial bar-inventory tools (WISK, Backbar, BinWise) | Our Approach |
|---------|---|---|---|
| Makeable-from-stock matching | Boolean presence, sometimes with "almost" partial match | Not their focus — they track cost/usage, not "can I make X" | Boolean presence + partial-match + category substitution (Patterns 1-3); this is central to us, peripheral to both competitor classes |
| Inventory input | Manual add or camera photo-scan of bottles (Make Me A Cocktail) | Barcode scan (500k+ UPC database), Bluetooth scanners, precision scales | In-browser camera UPC scan + manual fallback; skip scales/Bluetooth hardware — out of scale for a home bar |
| Order/ticket flow | None — these are personal recipe lookup apps only | POS-integrated, not guest-facing | Patron order → live Bartender queue is unique to this project among researched competitors |
| Recipe content | Large pre-seeded databases (600-2,600+ recipes) | N/A | Owner's own curated ~100 recipes, manual + AI-photo-import entry — deliberately not seeded |
| Substitution guidance | Static, if present at all | Not a focus | AI-generated (Claude), reasoning from actual current stock — no researched competitor does this dynamically |
| Depletion/quantity tracking | Not attempted | Core feature (their primary value prop) | Deliberately not attempted at the makeable-check level (see Pattern 4) — this is the biggest deliberate divergence from commercial tools, and correct for this project's scale |

---

# Part 2: Feature Landscape for v1.1 (AI, Docker, MCP)

**Milestone context:** Single-owner, LAN-only home server deployment; existing v1.0 has Barback/Patron/Bartender screens, makeable-engine, Socket.IO live sync.

**Three new feature areas for v1.1:**

1. **Docker Containerization** — Single-container deployment model for the entire app (API + 3 frontends)
2. **AI Bottle Photo Recognition** — Replace manual bottle entry with Claude Vision; photograph a bottle to identify it
3. **MCP Server** — Allow recipe creation and ingredient management via chat by exposing the REST API to Claude

## Feature Area 1: Docker Containerization

### What This Is

A multi-stage Dockerfile + docker-compose.yml that packages the entire My Bar application (Fastify backend + 3 React SPAs compiled into static bundles, all sharing one SQLite file) into a single Docker image and runs it as one container on the home server.

### Table Stakes Features

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-stage Dockerfile (build + runtime) | Reduces image size; runtime stage includes only Node runtime + app, no build tools | Medium | Build stage: pnpm install, npm run build all 3 apps. Runtime stage: COPY dist folders, run `npm start` for Fastify server. Runtime listens on localhost:3000 by default. |
| docker-compose.yml (single-service definition) | Entry point for home server; defines ports, volumes, restart policy, optional env vars for ANTHROPIC_API_KEY | Medium | Single service called `my-bar` or similar; port mapping (3000 → host, or only listen on LAN IP). Volume for SQLite db persistence (mount a named volume or bind-mount the db file to `/app/data/db.sqlite` or wherever the Drizzle schema places it). |
| Persistent storage (SQLite db & recipe photos if stored) | Container is ephemeral; recipes and inventory must survive restarts | Low | Dockerfile should define VOLUME for db directory or docker-compose should bind-mount `/app/data` (or your db location) to host. If recipe/bottle photos are stored on disk, same principle applies. |
| Restart policy (restart: unless-stopped or on-failure) | Home server reboots, containers crash — app should auto-recover | Low | Standard docker-compose setting; `restart_policy: unless-stopped` is the home-friendly default. |
| Image tagged with version (e.g., `my-bar:latest` or `my-bar:1.1.0`) | Allows rollback if needed; keeps dev/prod images distinct | Low | Use `docker build -t my-bar:1.1.0 .` and push tags to a registry (or just keep locally on the Pi). |

### Differentiators (Nice-to-Have)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Health check in docker-compose | Orchestrators (or your monitoring) can restart unhealthy containers; not required for a single home server but a good practice | Low | Add `healthcheck: curl localhost:3000/health` or similar simple probe endpoint to Fastify |
| Arm64 & armv7 multi-arch image | Single `docker build` produces arm64 (Pi 5) and armv7 (Pi 4) images in a registry; no extra compilation on the Pi during deploy | High | Requires buildx (Docker's multi-arch builder), GitHub Actions (or similar CI) to build and push. For a solo dev and a single home Pi, overkill — just build natively on the Pi if you deploy there, or build on an x86 dev machine and rely on QEMU emulation. |
| Docker Compose override files (docker-compose.override.yml) | Let developers spin up a dev version locally with different env/ports without editing the main compose file | Low | Not needed for this project — dev is already local; production is the Pi/NAS. Skip unless you're managing multiple deploy targets. |
| Secrets management (docker-compose secrets or env file) | Keep ANTHROPIC_API_KEY out of compose file and Dockerfile; load from `~/.env` or `.env.local` at deploy time | Medium | Production-grade approach: use `docker compose --env-file /path/to/.env up`. Home-grade: keep .env out of git, manually set on the Pi once. Either works; the medium complexity is about integration testing, not the feature itself. |

### Anti-Features (Explicitly Don't Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| TLS/HTTPS termination in the container or docker-compose | Home network only, LAN-only traffic — no need for TLS at all. HTTPS adds cert management complexity and slows connection setup on a LAN. | Keep unencrypted HTTP on localhost:3000 (or 3000→127.0.0.1) inside the home network. Reverse proxy (nginx/Caddy/etc) is only relevant if you expose to the internet later — not for this phase. |
| Secrets in Dockerfile or docker-compose.yml | Secrets checked into git → exposed in image layers → compromised the moment code is public. | Use `ANTHROPIC_API_KEY` as an environment variable injected at container runtime (docker run -e or docker-compose env: [value] pulled from a local .env file not in git). Dockerfile should have no secrets baked in. |
| Multi-container docker-compose (separate containers for db, API, nginx) | Each extra container adds moving parts, startup time, networking complexity, and RAM usage on a Pi. API + 3 SPAs all in one container already isolates from the host OS; no need to isolate them further. | Keep db (SQLite, in-process) and API in the same container. Bind-mount the db file to host for backup/recovery. Single container = single process = easier to debug, restart, and monitor. |
| Kubernetes or orchestration platforms | A solo dev with one Pi doesn't need Kubernetes, Nomad, or Docker Swarm. Adds declarative config complexity for zero payoff. | If the app ever scales to multiple Pis or needs load balancing, revisit. For now, `docker-compose up` on one Pi is sufficient. |
| CI/CD pipeline for automated image pushes to Docker Hub | Publishing multi-arch images to the Docker Hub registry requires CI/CD (GitHub Actions, GitLab CI), buildx setup, and ongoing maintenance. For a personal project, overkill. | Build the image locally on the deployment target (the Pi), or build on dev machine and copy locally. If you do publish publicly later, add this — for now, no need. |
| Image size optimization beyond multi-stage build | Chasing the last few MB of image size. Multi-stage alone gets you from ~1GB (full build tools) to ~200-300MB (Node + app). | Multi-stage Dockerfile is the 80/20 win; done. Further optimization (using Alpine Linux, stripping, hand-crafted layers) yields diminishing returns and can introduce subtle bugs (Alpine's musl vs glibc, missing .so files). |

### Recommended MVP

**Minimal for shipping:**

1. Multi-stage Dockerfile (build all 3 apps, copy dist/ to runtime stage, start Fastify)
2. docker-compose.yml (one service, port 3000 → host, volume for db file, restart: unless-stopped)
3. `.env.example` documenting ANTHROPIC_API_KEY (actual .env excluded from git)
4. README section: "Run in Docker — `docker compose up -d`" with one-sentence explanation

**Skip initially:**
- Health checks (can add later)
- Multi-arch builds (build on-target for now)
- Secrets management beyond env file (home-grade .env is sufficient)

**Defer to later phases:**
- Reverse proxy / TLS (only if exposed outside LAN)
- CI/CD image publishing (personal project; not needed)

---

## Feature Area 2: AI Bottle Photo Recognition

### What This Is

Replace manual ingredient entry with: owner photographs a bottle from their phone, Claude Vision analyzes the image, returns structured data (bottle name, category, ABV, notes), prefills the "add ingredient" form on Barback, owner reviews and confirms before saving.

### Table Stakes Features

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Camera capture in Barback "add ingredient" flow | User can take a photo from their phone/tablet camera without leaving the app | Medium | Barback already has form-based ingredient add. Add a "📷 Take Photo" button that triggers HTML5 `<input type="file" accept="image/*" capture="environment">` or similar (or use `html5-qrcode` library which handles camera permission prompts + orientation quirks, especially on iOS). |
| Claude Vision analysis of bottle photo | Sends the image to Claude API's vision endpoint with a structured prompt asking for bottle name, category, proof/ABV, color, any visible labels. Returns Zod-validated JSON. | Medium | Already using @anthropic-ai/sdk and Zod in v1.0. Use `client.messages.create()` with `image` content type + `output_config.format` for structured output (Zod schema defining Bottle fields). Barback form only needs name, category, ABV — start there; add color/notes later if useful. |
| Review before save — prefilled form | Claude's guess is shown in a form the user can review/edit before committing to the ingredient. User can see the photo, the extracted data, and override any field. | Low | Barback already has edit flows. Show the photo inline, display extracted fields in editable form inputs, user clicks "Save" to create the ingredient with those values. |
| Fallback to manual entry | If photo is too blurry, label unreadable, or user just wants to type — form can be filled in by hand | Low | Form fields are already text inputs. If photo fails or user doesn't want to use it, they can ignore the photo and type manually (e.g., "Bourbon, 90 proof, house bottle"). |
| Low-confidence detection handling | Claude sometimes guesses wrong (generic clear bottles, missing labels, poor lighting). Show a confidence indicator; if low, prompt user to double-check fields before save. | Medium | Use Claude's confidence output or prompt it to return a confidence score (0–100). If <60%, add a warning label in the form ("Claude is uncertain — please review the fields carefully"). |

### Differentiators (Nice-to-Have)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Retry photo flow (delete + retake) | User can immediately retake a photo if the first one was blurry/wrong angle without losing the form context | Medium | Add a "Retake Photo" button next to the photo thumbnail. Clears the photo and lets user take another without closing the form or losing other input. |
| Multi-photo support (take multiple at once, pick the clearest) | Batch-identify several bottles without reopening the form between each photo. | High | Not recommended for MVP. Adds complexity: storing multiple temp photos, letting user pick which one to extract, queuing extractions (multiple Claude calls). Defer to v1.2. |
| Suggested category based on bottle shape/color | Claude can guess "spirit" vs "wine" vs "beer" from the bottle silhouette alone, even if label is illegible. Pre-select category dropdown based on this. | Low | Include category guess in Claude's structured output. Populate the category dropdown in the form with this suggestion. User can still override. |
| Partial info fallback (extract name, skip ABV if not visible) | Some bottles don't have all info on the label. Form should accept partial data: name required, category required, ABV optional. | Low | Adjust Zod schema: `abv?: number` instead of required. Form inputs should make ABV optional on submit. |
| Photo quality assessment before sending to Claude | Local heuristics (check if image is in focus, well-lit) before spending Claude API tokens. If blurry, show "Photo too blurry — try again" without calling Claude. | High | Would need OpenCV, TensorFlow, or a lightweight focus-detection model. Not worth the complexity for MVP. Just call Claude and trust the user to retake if Claude says "can't read this." |

### Anti-Features (Explicitly Don't Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Batch bulk-import (photograph entire shelf at once, extract all bottles) | Sounds convenient but massively increases scope and cost (many Claude Vision calls) and error surface (wrong categories, misprinted labels, overlapping bottles). Extracting a single bottle accurately is hard enough. | Stick with one-photo-per-ingredient flow. Bulk import is a future differentiator, not table stakes. |
| Auto-fill ABV from external database (e.g., UPC lookup, spirit-db) | Defeats the purpose of replacing UPC scanning. No free, reliable alcohol database exists. Claude Vision + user review is the solution. | Don't query external DBs. If Claude's ABV guess is wrong, user corrects it manually. |
| Computer-vision-based shelf detection (automatically photograph a shelf, detect edges, crop individual bottles) | Image processing complexity explodes; camera angle/lighting sensitivity is high. User photographing one bottle is already the right scope. | Keep it simple: user takes one photo, Claude analyzes it, done. |
| Storing & re-processing previous bottle photos | Saves old photos "just in case" for offline re-identification or model improvement. Adds storage + privacy complexity with no current benefit. | Don't persist photos beyond the current add-ingredient session. After save, discard the photo. If user edits the ingredient later, they can retake a photo if needed. |
| Translation/localization of Claude's output | Claude might return labels in the bottle's original language (e.g., Italian wine, French liqueur). Auto-translating adds complexity. | Accept that some labels might be in foreign languages. User will know (e.g., they bought the bottle). Not a MVP concern. |

### Dependencies on Existing v1.0 Capabilities

- **Barback UI structure**: v1.0 has the "add ingredient" form with fields (name, category, ABV, notes). Camera input and Claude analysis simply extend this form with a photo preview + analysis step.
- **Category & ingredient API endpoints**: v1.0 already has `/api/categories` and `/api/ingredients` (POST to create). Photo recognition just prefills the form; saving uses existing endpoints.
- **Claude API integration**: Barback already imports @anthropic-ai/sdk for future AI features. Add Claude Vision call to the same client.
- **Zod schema validation**: Existing `packages/shared` uses Zod for API contracts. Extend with a `BottleExtraction` schema for Claude's structured output.
- **Form state management**: Barback already handles form inputs (name, category, etc.). Photo input is one more field + a preview step.

### Complexity Estimate

- **Claude Vision call itself**: 5 min
- **Camera input**: 15–30 min (native HTML5 or html5-qrcode library setup + iOS testing)
- **Review form + retry logic**: 30–45 min
- **Testing**: 30 min
- **Total**: ~2 hours end-to-end for MVP

---

## Feature Area 3: MCP Server

### What This Is

A standalone TypeScript MCP (Model Context Protocol) server that exposes My Bar's REST API (recipes, ingredients, categories, glassware) to Claude Code or any MCP-aware LLM client. Owner can tell Claude "create a recipe for Margarita" or "add 2 oz of tequila to the inventory", and Claude calls the MCP server, which delegates to the existing My Bar REST API and saves the result.

### Table Stakes Features

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| MCP server binary/process (separate from main Fastify app) | Runs alongside the main app on the home server; listens for MCP protocol messages from Claude Code (or other MCP client) and translates them to REST calls. | Medium | Standalone Node process with @anthropic-ai/sdk's MCP server utilities. Runs on same LAN, connects to the main Fastify API at `http://localhost:3000` (or configurable URL). Uses JSON-RPC 2.0 protocol; Claude Code / MCP clients initiate connection. |
| Tools for recipe creation from text | User pastes recipe text into Claude ("2 oz vodka, 1 oz cranberry, lime juice, shake and strain"), Claude structures it, MCP creates the recipe. | Medium | MCP tool: `create_recipe_from_text(text)`. Claude or the MCP server parses the text into {name, ingredients: [{name, quantity, unit}], steps, glassware}. Calls REST POST `/api/recipes`. |
| Ingredient CRUD via MCP | Add, edit, delete, query ingredients without opening Barback. Useful for quick adjustments ("bump the Bourbon to 4 oz", "remove the bitters we ran out of"). | Medium | MCP tools: `add_ingredient(name, category, quantity, unit)`, `edit_ingredient(id, {name?, category?, quantity?, unit?})`, `delete_ingredient(id)`. Each delegates to existing REST endpoints. |
| Recipe CRUD via MCP | List recipes, view details, edit (update name, ingredients, steps, glassware), delete. | Medium | MCP tools: `list_recipes()`, `get_recipe(id)`, `update_recipe(id, {...})`, `delete_recipe(id)`. Each delegates to REST. |
| Confirmation flow before destructive operations | Before deleting a recipe or ingredient, ask Claude (and ultimately the user) for confirmation. No silent deletions. | Low | MCP tool output includes "This will delete X. Confirm? (yes/no)". Claude presents to user, user says yes, Claude calls a `confirm_delete(id)` tool. |
| Error handling and validation | MCP server validates inputs (e.g., ingredient quantity > 0, recipe name not empty) and returns clear error messages. If a URL fetch fails or recipe extraction is incomplete, report that to Claude with a fallback suggestion. | Medium | Use Zod for validation. MCP tool responses include `{ success: boolean, data?: {...}, error?: string }`. If extraction fails, return the partial data and let Claude retry or ask user. |

### Differentiators (Nice-to-Have)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Tools for recipe creation from URL | User sends Claude a recipe URL (e.g., blog post, cocktail database), Claude fetches the page, extracts structured recipe data, calls MCP to create the recipe in My Bar. | High | MCP tool: `create_recipe_from_url(url)`. MCP server: fetches URL (using node-fetch or similar), parses HTML/text for ingredients/steps, calls REST POST `/api/recipes` with extracted data. |
| Tools for recipe creation from YouTube video URL | User sends a video link (cooking channel, bartender demo), Claude fetches transcript (if available via YouTube API or transcript extraction library), extracts recipe, creates via MCP. | High | MCP tool: `create_recipe_from_video(url)`. MCP server: extracts transcript (youtube-transcript-api or similar), sends to Claude Vision or text extraction, parses for recipe structure. Calls REST POST `/api/recipes`. |
| Natural-language recipe search ("show me recipes with gin") | User asks Claude to find recipes by ingredient, category, flavor, and Claude uses MCP to query and summarize. | Low | Add MCP tool: `search_recipes(query: string, filter?: {ingredient?, category?, makeable?})`. Returns matching recipes. |
| Makeable status in recipe details | When Claude fetches a recipe via MCP, include whether it's makeable with current inventory. "The Martini is makeable (you have gin, vermouth, olives); the Daiquiri is missing rum." | Low | Existing Fastify API already has `computeMakeable()`. Include the status in `GET /api/recipes/:id` response. MCP just surfaces it. |
| Ingredient suggestions when substitutions needed | User tells Claude "I don't have tequila for the Margarita"; Claude uses MCP to fetch available spirits and suggests a substitute (mezcal, vodka). | Medium | MCP tool: `suggest_substitution(original_ingredient_id)` returns a list of compatible ingredients currently in stock. |

### Anti-Features (Explicitly Don't Build)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time recipe scraping & auto-import from public recipe sites (AllRecipes, Cocktails DB, etc.) | Adds legal/terms-of-service complexity; requires on-demand fetching + parsing + error recovery for potentially thousands of recipes. | Keep it explicit: user sends Claude a link or text, Claude + MCP extract it one at a time, user confirms before saving. |
| Training/learning from user's recipes (e.g., "remember this is how you like your martini made") | Requires storing preferences, building a user profile, and personalizing Claude's suggestions — adds state management complexity. | Don't persist preferences. Claude can ask the user each time or the user can edit recipes as-needed. |
| Multi-user MCP (different auth tokens per household member) | "Alice's preferences" vs "Bob's preferences" adds user management, per-user tool visibility, and access control. | Skip entirely. No auth in My Bar; all MCP calls are trusted (LAN-only). Single owner/admin runs the MCP server. |
| Recipe recommendation engine ("based on your inventory, here are 10 drinks you can make") | Patron screen already shows makeable recipes; recommending from those is just filtering/sorting. | Patron screen already displays makeable recipes. If user wants more ideas, they browse. |
| Automatic shopping list generation ("you're missing these ingredients for recipes X, Y, Z; buy them") | Requires tracking historical inventory, predicting what you'll want to make, and building a shopping workflow. Out of scope. | User manually edits inventory in Barback. |
| Multi-language recipe support (extract recipes in Spanish/French, translate to English) | Adds i18n complexity. Most home bar recipes are in English or owner's native language already. | Don't auto-translate. If a recipe URL is in another language, Claude may prompt the user. |
| Video-based full-featured bartender tutorial (step-by-step video playback for making a drink) | Not a recipe management feature; it's content delivery. Out of scope for an MCP server focused on CRUD. | MCP extracts recipe *data* from video; video playback is a future UI feature. |

### Dependencies on Existing v1.0 Capabilities

- **REST API for recipes, ingredients, categories, glassware**: v1.0 ships with Fastify endpoints (GET, POST, PUT, DELETE). MCP server simply wraps these calls.
- **Zod schema validation**: Existing shared package uses Zod. MCP can reuse/extend these schemas.
- **Makeable engine**: v1.0 computes whether recipes are makeable. MCP just surfaces the result; no new logic needed.
- **Claude API client**: MCP server itself is *not* Claude; it's a server that Claude Code connects to. But MCP may use Claude internally for parsing recipes from text/URLs.
- **Database schema**: No changes needed. MCP reads/writes the same `recipes`, `ingredients`, `categories` tables via REST API.

### Complexity Estimate

- **MCP server boilerplate**: 20 min
- **Recipe text parsing + structured output**: 30 min
- **REST API calls from MCP tools**: 20 min
- **CRUD tools (5 recipe + 4 ingredient tools)**: 45 min
- **Error handling + Zod validation**: 30 min
- **Testing**: 30 min
- **Documentation**: 15 min
- **Total**: ~3 hours end-to-end for MVP

---

## Cross-Feature Themes

### Confidence & Review-Before-Save Pattern

All three features benefit from this pattern:
- **Bottle photo**: Claude guesses name/category; user reviews before saving.
- **Recipe from text**: Claude structures recipe; user reviews before saving.
- **MCP ingredient add**: Claude suggests name/category; user confirms or corrects.

**Best practice**: Always show AI-generated data in a preview/edit form before committing to the database.

### Partial Data Handling

Real-world inputs are messy:
- **Photo**: Bottle has no ABV label visible.
- **Text**: Recipe has ingredients but no measurements.
- **Video**: Transcript is incomplete.

**Best practice**: Accept partial data. Use Zod `optional` fields where appropriate. Show warnings for missing fields but don't block save if it's acceptable.

### Error Fallback & UX Continuity

**Anti-pattern**: AI feature fails → entire flow breaks → user can't proceed.
**Pattern**: AI feature fails → show error + fallback option → user can still complete the task manually.

### LAN-Only Simplifications

Because this is a home network app:
- No authentication needed for MCP server (LAN-only, trusted users).
- No TLS/reverse proxy needed for containerized app (HTTP on LAN is fine).
- No multi-arch CI/CD needed (build on-target or manually copy).
- No audit logging needed (small team, no compliance requirements).

---

## Feature Dependency Graph

```
Docker Containerization
  ↓ depends on
  Fastify API + 3 built SPAs (v1.0 — already shipped)
  SQLite db file (v1.0 — already shipped)

AI Bottle Photo Recognition
  ↓ depends on
  Barback UI (v1.0 — already shipped)
  Add ingredient REST API (v1.0 — already shipped)
  Claude API integration (v1.0 foundation, adds Vision in v1.1)
  Category API (v1.0 — already shipped)

MCP Server
  ↓ depends on
  Recipe/Ingredient/Category/Glassware REST APIs (v1.0 — already shipped)
  Makeable engine (v1.0 — already shipped)
  Claude API client (v1.0 foundation, adds MCP wrapper in v1.1)

Cross-feature:
  All three can be developed in parallel
  No hard ordering constraints for MVP
  Docker only needed for deployment (can develop without it locally)
  Photo recognition and MCP Server are independent
```

---

## Phasing Recommendation for v1.1

### Phase 7 — MVP: AI Bottle Photo Recognition
**Why first**: Smallest scope, most immediate user value (replace manual entry), lowest risk.
- Takes ~2 hours
- Extends existing Barback form
- No new infrastructure (uses existing Claude API)

### Phase 8 — MVP: MCP Server
**Why second**: Medium scope, independent from photo recognition.
- Takes ~3 hours
- Standalone process, parallel development possible
- Sets up Claude integration pattern for future AI features

### Phase 9 — MVP: Docker Containerization
**Why third**: Required for real deployment, but no functional value alone.
- Takes ~2 hours once API/apps are stable
- Lets owner actually run the app on home server
- Can be tested locally with `docker-compose up`

**Total estimated MVP effort**: ~7 hours for all three features.

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| Docker containerization best practices | HIGH | Consistent best practices documented across multiple sources; pattern is well-established for home servers and Raspberry Pi. |
| What NOT to complicate in Docker for home projects | HIGH | Strong consensus: skip TLS (for LAN-only), skip K8s, skip multi-arch CI/CD for single-server projects. |
| AI photo recognition UX patterns | HIGH | Strong empirical evidence from user research and design literature (confidence scores, review-before-save, fallback patterns, retry visibility). |
| Claude Vision capability for bottle identification | MEDIUM-HIGH | Documented as capable of product/label identification; real-world testing needed on alcohol bottles specifically (lighting, label clarity, blurry images). Mitigation: fallback to manual entry always works. |
| MCP server implementation pattern | MEDIUM-HIGH | MCP specification and reference servers documented; pattern for wrapping REST APIs is clear. Limited real-world homelab examples; may encounter edge cases in testing. |
| Recipe extraction from text | MEDIUM-HIGH | Well-established pattern; Claude excels at parsing structured data from freeform text. |
| Recipe extraction from URLs/video | MEDIUM | Best practices exist, but no single "standard" approach. URL scraping varies by source; YouTube transcript extraction has API rate limits. |

---

## Sources

### v1.0 Features (original research)

- [Bar Management Apps that Actually Help You Run a Better Bar](https://www.joinhomebase.com/blog/bar-management-app)
- [WISK Bar Inventory Software](https://www.wisk.ai/for/wisk-bar-management-software)
- [Top 10 Bar Inventory Apps of 2024 | WISK](https://www.wisk.ai/blog/top-10-bar-inventory-apps-2024)
- [Kitchen Display Systems (KDS) Guide](https://www.webstaurantstore.com/article/1002/kitchen-display-systems.html)
- [Cocktail Measurements Guide | Good Cocktails](https://www.goodcocktails.com/bartending/measurements.php)
- [Bartender Basics: DIY Substitutions | Wine Enthusiast](https://www.wineenthusiast.com/culture/spirits/cocktail-ingredient-swaps-vermouth/)

### v1.1 Features (new research, 2026-08-20)

#### Docker & Container Best Practices

- [How Containerization Makes Your Raspberry Pi Projects Portable and Scalable - Pidora](https://pidora.ca/how-containerization-makes-your-raspberry-pi-projects-portable-and-scalable/)
- [Best Docker Containers for Home Server in 2025 - Virtualization Howto](https://www.virtualizationhowto.com/2024/03/best-docker-containers-for-home-server-in-2024/)
- [I run my entire home server in one Docker Compose file - XDA Developers](https://www.xda-developers.com/run-my-entire-home-server-in-one-docker-compose-file/)
- [How to deploy on remote Docker hosts with docker-compose - Docker](https://www.docker.com/blog/how-to-deploy-on-remote-docker-hosts-with-docker-compose/)

#### AI Photo Recognition & UX Patterns

- [How to design AI UIs that show confidence, uncertainty, trust? - Wild Codes](https://wild.codes/candidate-toolkit-question/how-to-design-ai-uis-that-show-confidence-uncertainty-trust)
- [UX Patterns for Trustworthy AI Features - Design Key](https://www.designkey.studio/post/designing-for-trust-ux-ai-features)
- [10 UX Design Patterns That Improve AI Accuracy and Customer Trust - CMS Wire](https://www.cmswire.com/digital-experience/10-ux-design-patterns-that-improve-ai-accuracy-and-customer-trust/)
- [AI Product Recognition in 2026: How Modern Systems Identify Every SKU on the Shelf - Width.ai](https://www.width.ai/post/product-recognition)

#### Claude Vision & Structured Outputs

- [Vision - Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Structured outputs - Claude API Docs](https://docs.claude.com/en/docs/build-with-claude/structured-outputs)
- [Claude API Structured Output: Complete Guide - Thomas Wiegold Blog](https://thomas-wiegold.com/blog/claude-api-structured-output/)

#### MCP (Model Context Protocol)

- [Model Context Protocol - GitHub](https://github.com/modelcontextprotocol)
- [Model Context Protocol (MCP) explained: A practical technical overview - Codilime](https://codilime.com/blog/model-context-protocol-explained/)
- [How to MCP - The Complete Guide - Simplescraper Blog](https://simplescraper.io/blog/how-to-mcp)
- [MCP Server Development Guide - GitHub](https://github.com/cyanheads/model-context-protocol-resources/blob/main/guides/mcp-server-development-guide.md)

#### Recipe Extraction & Data

- [Best Apps That Extract Recipes from Video URLs 2026 - Nutrola](https://nutrola.app/en/blog/best-apps-that-extract-recipes-from-video-urls-2026/)
- [How to Extract Recipes from YouTube Videos in 2026 - Pluck Blog](https://pluckrecipes.com/blog/save-youtube-cooking-videos-as-recipes/)
- [How I built a Social Recipe Extractor - DEV Community](https://dev.to/johnrusu/how-i-built-a-social-recipe-extractor-that-turns-short-form-video-links-into-structured-recipes-11j6)

#### Self-Hosted & Homelab Inventory

- [20 Open-source Self-hosted Inventory and Warehouse Solutions - Medevel](https://medevel.com/20-warehouse-systems/)
- [I self-hosted an inventory app so I could stop losing things in my home - XDA Developers](https://www.xda-developers.com/self-hosted-inventory-app/)
- [Top 20 Open Source Inventory Management Systems in 2026 - LarkSuite](https://www.larksuite.com/en_us/blog/open-source-inventory-management-system)

#### AI Inventory & Recipe Management

- [Best AI Restaurant Inventory Management Software (2026) - AI Tools Bakery](https://aitoolsbakery.com/blog/best-ai-restaurant-inventory-management-software/)
- [8 best AI inventory management software in 2026 - Softr](https://www.softr.io/blog/best-ai-inventory-management-software)
- [Best Pantry Inventory Apps (2026) — Pantryfy](https://www.pantryfy.ai/blog/best-pantry-inventory-apps)

---

*Feature research for: home bar management / cocktail ordering / small-venue inventory*
*Researched: 2026-08-09 (v1.0), 2026-08-20 (v1.1 additions)*
