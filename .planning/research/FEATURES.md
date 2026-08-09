# Feature Research

**Domain:** Home bar management — three-role app (Patron ordering kiosk, Bartender recipe/queue console, Barback mobile inventory), overlapping with consumer cocktail-recipe apps, commercial bar-inventory software (WISK, BinWise, Backbar, Barkeep), and restaurant self-order-kiosk/KDS patterns.
**Researched:** 2026-08-09
**Confidence:** MEDIUM (web search only, cross-checked across multiple independent sources per topic; no official vendor docs or SDKs involved — this is a product/UX domain, not a library integration)

## Feature Landscape

This domain sits at the intersection of three normally-separate product categories, which is why "table stakes" differs sharply by role:

- **Patron role** ≈ consumer cocktail-recipe apps (Mixel, Make Me A Cocktail, Cocktail Party, My Cocktail Bar) + restaurant self-order kiosks (QSR tablet ordering).
- **Bartender role** ≈ a lightweight KDS (kitchen display system) + a bartender's recipe cheat-sheet app (Shaken and Stirred, Cocktails Guru).
- **Barback role** ≈ commercial bar-inventory software (WISK, BinWise, Backbar, Barkeep) scaled down to zero-cost, single-location, no-POS-integration home use.

None of the researched products combine all three into one connected system with a shared live inventory — that combination is itself close to this project's core differentiator, not something to copy feature-for-feature from any single competitor.

### Table Stakes — Patron Interface

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

### Table Stakes — Bartender Interface

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full recipe detail (ingredients + quantities + method + glassware + garnish) | This is the standard field set across every bartending reference app researched (Shaken and Stirred, Cocktails Guru, BarSmarts) — ingredients, method (build/shake/stir/muddle/blend), glass, ice, garnish | LOW | Recipe data model should capture these fields from the start (also feeds AI photo-import extraction target schema) |
| Live order queue, new orders appear without manual refresh | Direct analogue to a KDS ticket rail; the entire value of a KDS over a paper ticket is that it's real-time — a polling/refresh-required queue would feel broken by comparison to any modern ordering system | MEDIUM | Requires a push/live-update mechanism (WebSocket or short-poll), not a "refresh" button |
| Ticket status lifecycle (new → in progress → done/served) | Universal KDS pattern — tickets get "bumped" through stages so bartender and system agree on what's outstanding | LOW–MEDIUM | With one bartender and one station, this can be a simple 2–3 state model, not full multi-station KDS complexity |
| Elapsed-time indicator per ticket | Standard KDS feature — shows how long an order has been waiting | LOW | Simple "time since submitted," no SLA/alerting needed at this scale |
| Search/filter recipes (by name, base spirit, flavor) | Bartending reference apps universally support search — a real-time lookup during service is the primary bartender use case outside the queue | LOW | |
| Recipe list reflects live makeable/not-makeable state | Same shared-inventory requirement as Patron — bartender needs to see the same "can I actually make this" truth, e.g. if a walk-up request isn't in the queue | LOW (once shared state exists) | Reuses the same matching logic as Patron — do not duplicate the algorithm |

### Table Stakes — Barback Interface

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add/edit ingredient or bottle (name, category, brand) | Every bar-inventory tool (WISK, BinWise, Backbar, Barkeep) starts here; this is the base CRUD the rest of the system depends on | LOW | |
| In-stock / out-of-stock toggle per ingredient | The minimum signal the makeable-logic needs; every consumer cocktail app (Mixel, Cocktail Party) reduces inventory to this same boolean at its core | LOW | This is the load-bearing table-stakes feature — everything else in the app depends on this being accurate and low-friction to update |
| Mobile-first responsive layout | Barback role is explicitly phone-based; commercial tools (Backbar, EasyInventory) all lead with mobile-first counting flows for exactly this reason (staff count from the floor/stockroom, not a desktop) | LOW–MEDIUM | |
| Search/filter inventory by name/category | Standard across all inventory tools once list size passes ~20-30 items; this project expects 50-100 | LOW | |
| Category/type tagging on ingredients (spirit type, liqueur, bitters, mixer, etc.) | Needed both for browsing and for substitution-aware matching (see logic section) — every commercial and consumer tool researched categorizes ingredients, not just names them | LOW–MEDIUM | This taxonomy decision has downstream effects — worth getting right early (see Dependencies) |

### Differentiators — Patron Interface

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI recommendation when a desired drink can't be made | No researched competitor (consumer cocktail app or commercial kiosk) does live LLM-driven "closest alternative" reasoning — most either show a flat "no results" or a static "almost makeable" list. This turns a dead end into a positive discovery moment | MEDIUM–HIGH | Already an explicit project requirement; depends on makeable logic + recipe flavor metadata |
| Dark-neon premium visual design matching the reference photos | Consumer cocktail apps researched are largely utilitarian (list-heavy, generic Material/iOS styling); a bespoke premium aesthetic is a genuine differentiator for the "feels like a real bar menu" experience | LOW–MEDIUM (design effort, not technical complexity) | |
| Flavor-profile tags / "almost makeable, missing X" surfaced proactively | My Cocktail Bar does a version of this — showing it prominently (vs. burying it) is a differentiator, not table stakes, because most apps treat it as secondary | LOW | Builds directly on the missing-ingredient diff already required for the not-makeable state |

### Differentiators — Bartender Interface

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI substitution suggestions when a recipe is missing an ingredient | Commercial and consumer tools researched only do rule-based/static substitution charts (e.g. "orange liqueur ↔ orange liqueur") at best; LLM-generated reasoning about flavor-appropriate swaps from *actual current stock* is not something any researched competitor does | MEDIUM–HIGH | Already an explicit project requirement; natural extension of the substitution-aware matching layer |
| Shared source-of-truth with Patron and Barback (no separate "backend" data entry) | Commercial tools (WISK, Backbar) sync inventory to POS but not to a customer-facing ordering surface — that combination doesn't exist in the researched competitive set | MEDIUM (mostly architecture, not bartender-facing feature work) | This is really the project's core differentiator, expressed at the bartender screen as "queue and recipes always agree with what's actually in stock" |

### Differentiators — Barback Interface

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| In-browser camera UPC scanning (no dedicated hardware) | Commercial tools mostly assume Bluetooth/dedicated scanners; consumer apps (noflair, Drinks On...D) that do camera scanning are single-purpose bottle-tracking apps, not connected to a live ordering system | MEDIUM–HIGH | Browser barcode APIs (e.g. BarcodeDetector / a JS zxing-style library) plus a UPC lookup fallback (public product DB or manual entry) — flag for phase-specific research |
| AI recipe-photo import (photo/screenshot → structured recipe) | Not found in any researched competitor — bar-inventory tools import from supplier catalogs, not from photographed recipe cards; cocktail apps ship with pre-seeded databases instead of ingesting user recipes at all | MEDIUM–HIGH | Already an explicit project requirement; needs a defined target schema (ingredients + qty/unit + method + glass + garnish) for the AI to extract into — same schema as the Bartender recipe detail view |
| Auto-generated low-stock shopping list | Seen in one researched consumer app (Drinks On...D: scan → shopping list when below target); not present in most competitors researched | LOW–MEDIUM | Natural follow-on once ingredients have a stock-level field beyond boolean in/out; can be deferred past v1 |

### Anti-Features (Commonly Requested, Often Problematic)

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

## Sources

- [Bar Management Apps that Actually Help You Run a Better Bar](https://www.joinhomebase.com/blog/bar-management-app)
- [WISK Bar Inventory Software](https://www.wisk.ai/for/wisk-bar-management-software)
- [Top 10 Bar Inventory Apps of 2024 | WISK](https://www.wisk.ai/blog/top-10-bar-inventory-apps-2024)
- [The Top 5 Bar Inventory Apps for Bars and Restaurants - Bar Patrol](https://www.barpatrol.net/the-top-5-bar-inventory-apps-for-2023/)
- [Mixel: Cocktail Recipes & Bar - Google Play](https://play.google.com/store/apps/details?id=com.cfdrink&hl=en_US)
- [Make Me A Cocktail - App Store](https://apps.apple.com/us/app/make-me-a-cocktail/id1541820377)
- [Mixit Cocktails: drink recipes - App Store](https://apps.apple.com/us/app/mixit-cocktails-drink-recipes/id1548476411)
- [My Cocktail Bar - Google Play](https://play.google.com/store/apps/details?id=com.mybarapp.free&hl=en_US)
- [Cocktail Party](https://cocktailpartyapp.com/)
- [noflair - Home Bar & Cocktails](https://apps.apple.com/us/app/noflair-home-bar-cocktails/id1550567225)
- [Drinks On...D](https://apps.apple.com/ca/app/drinks-on-d/id6476776666)
- [Backbar (App Store listing)](https://apps.apple.com/ml/app/backbar/id1461796151)
- [What is a KDS System? The Ultimate Guide for Modern Restaurants](https://orderingstack.com/blog/a-guide-to-kitchen-display-system-kds-in-restaurant)
- [Restaurant's Guide to Kitchen Display Systems (KDS)](https://www.webstaurantstore.com/article/1002/kitchen-display-systems.html)
- [Designing a Self-Ordering Kiosk User Interface - QSR Magazine](https://www.qsrmagazine.com/story/designing-a-self-ordering-kiosk-user-interface-to-optimize-sales-and-profitability/)
- [Item Availability (86-ing) – Otter Help Center](https://helpdesk.tryotter.com/hc/en-us/articles/5159002040083-Item-Availability-86-ing)
- [Bar Measurements and Bar Unit Converter | Good Cocktails](https://www.goodcocktails.com/bartending/measurements.php)
- [Measurement Units - Kindred Cocktails](https://kindredcocktails.com/info/measurement-units)
- [Measures and measuring - Difford's Guide](https://www.diffordsguide.com/encyclopedia/1177/cocktails/measures-and-measuring)
- [Cocktail Measurements: Dash, Splash, Pinch and Float](https://www.drinklab.org/the-dash-and-splash-unveiling-the-mystery-of-informal-cocktail-measurements/)
- [Bartender Basics: DIY Substitutions for Common Cocktail Ingredients | Wine Enthusiast](https://www.wineenthusiast.com/culture/spirits/cocktail-ingredient-swaps-vermouth/)
- [Modifiers in Cocktails - Alcademics](https://www.alcademics.com/2012/10/modifiers-in-cocktails.html)
- [Drink Recipe Swaps & Substitutions | Feast + West](https://feastandwest.com/recipe-substitutions/)
- [Ultimate Guide to Ingredient-Based Recipe Search - OrganizEat](https://home.organizeat.com/blog/ultimate-guide-to-ingredient-based-recipe-search/)
- [Bartending Techniques - A New York Bartending School](http://barschool.com/drink-recipes/bartending-techniques/)

---
*Feature research for: home bar management / cocktail ordering / small-venue inventory*
*Researched: 2026-08-09*
