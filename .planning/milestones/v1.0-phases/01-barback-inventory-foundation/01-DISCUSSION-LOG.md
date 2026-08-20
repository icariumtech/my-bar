# Phase 1: Barback Inventory Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-09
**Phase:** 1-Barback Inventory Foundation
**Areas discussed:** Category model, Ingredient identity/granularity, In-stock toggle & defaults, Barback visual style

---

## Category Model

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed curated list | Owner defines categories up front; every ingredient picks one from a dropdown | ✓ |
| Free-text field | Owner types any category string per ingredient | |

| Option | Description | Selected |
|--------|-------------|----------|
| One category per ingredient | Simpler data model and matching logic | ✓ |
| Multiple categories allowed | E.g. an amaro could count as both Liqueur and Bitters | |

| Option | Description | Selected |
|--------|-------------|----------|
| Owner can manage categories | Add/rename/delete from the Barback screen | ✓ |
| Fixed preset list for now | Hardcoded starter list, management deferred | |

**User's choice:** Fixed curated list, one category per ingredient, owner-manageable.
**Notes:** None beyond the selections — user confirmed "Next area" without additional clarification.

---

## Ingredient Identity/Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Specific bottle/brand | Entries are real bottles, e.g. "Bombay Sapphire Gin" | ✓ |
| Generic ingredient type | Entries are generic types, e.g. "Gin" | |

| Option | Description | Selected |
|--------|-------------|----------|
| Single free-text name | One field, owner types it however makes sense | (initially: Structured, later reversed to this) |
| Structured brand + product fields | Separate Brand and Product fields | (initially selected, then reversed) |

| Option | Description | Selected |
|--------|-------------|----------|
| Out of scope for now (bottle size) | Not tracked, no consumer for the data yet | |
| Track it as an optional note | Optional free-text size/note field | ✓ |

**User's choice (final, after clarification):** Specific bottle/brand entries with a single free-text **Name** field holding the full product title (e.g. "Bombay Sapphire Gin," "Hendrick's Limited Edition Orbium Gin"), separate owner-managed Category field, and an optional size/note field.

**Notes:** User initially chose "Structured brand + product fields." When asked to clarify what "Product" would capture beyond Category, the user explained a broader motivation: wanting brand-level data to eventually support AI-assisted matching of specific bottles to recipes based on flavor profile (e.g. a recipe wanting Bombay Sapphire or Beefeater specifically, not a floral gin like Hendrick's). This AI-matching idea was captured as a **Deferred Idea** (see CONTEXT.md) since it's beyond Phase 1/2 scope. After walking through concrete examples ("Bombay Sapphire Gin" / category "Dry Gin"; "Hendrick's Limited Edition Orbium Gin" / category "Gin"), the user confirmed a single free-text Name field is sufficient — Category already carries the type-level granularity needed, no separate Brand/Product split required. User also confirmed flavor-profile data itself is deferred to Phase 2 or 3, not part of Phase 1.

---

## In-stock Toggle & Defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Tap the whole row | Fastest one-handed interaction | |
| Dedicated switch control | Standard iOS-style switch | |
| Swipe gesture | Swipe left/right on a row | ✓ (with modification) |

| Option | Description | Selected |
|--------|-------------|----------|
| In-stock | Default for newly added ingredients | ✓ |
| Out-of-stock | Safer default for pre-added future purchases | |

| Option | Description | Selected |
|--------|-------------|----------|
| Instant, no confirmation | Toggle happens immediately | ✓ |
| Instant with brief undo toast | Immediate toggle with a short-lived undo affordance | |

**User's choice:** Swipe gesture — left to toggle out-of-stock, right to toggle in-stock — with a few-seconds grace period before the change finalizes (soft undo, not a blocking modal). New items default to in-stock. No blocking confirmation dialog.

**Notes:** User also raised barcode-scan integration: scanning a barcode should automatically mark an item in-stock again (restock), and scanning should also support removing an item from stock. This overlaps with the existing v2 requirements SCAN-01/SCAN-02 (barcode scanning, currently scoped to prefilling new-ingredient details on first add) but extends them to cover toggling stock on *existing* ingredients. Captured as a refinement note in CONTEXT.md's Deferred Ideas — out of scope for Phase 1, which is manual-entry only.

---

## Barback Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct utilitarian style | Optimized for speed/legibility, doesn't match Patron's neon aesthetic | ✓ |
| Same dark-neon branding | Reuses Patron's color palette/style | |

| Option | Description | Selected |
|--------|-------------|----------|
| Dark mode | Easier on the eyes in dim bar environment | ✓ |
| Light mode | Higher contrast in bright kitchen/storage lighting | |
| Follow system preference | Adapts to phone's light/dark setting | |

| Option | Description | Selected |
|--------|-------------|----------|
| Large tap targets, minimal chrome | Optimized for thumb reach and speed | ✓ |
| Dense list, more info per screen | Prioritizes information density | |

**User's choice:** Distinct utilitarian style (not matching Patron's dark-neon branding), dark color scheme, large tap targets with minimal chrome.
**Notes:** All three selections matched the recommended option; no further discussion requested.

---

## Claude's Discretion

None — every gray area discussed resulted in an explicit user decision.

## Deferred Ideas

- **AI-assisted brand/flavor-affinity matching**: suggest which recipes a newly-added bottle pairs best with (or which bottles best suit a new recipe), based on flavor profile rather than category alone. Raised during the Ingredient Identity discussion. Builds on the existing v2 AI-02 substitution feature but adds a preference/ranking layer beyond simple category matching. Depends on flavor-profile data (also deferred) existing on ingredients/recipes.
- **Barcode-scan-to-toggle-stock**: extend the existing v2 SCAN-01/SCAN-02 requirements so scanning a known bottle's barcode can restock (mark in-stock) or remove it from stock, not only prefill details for a brand-new ingredient. Raised during the In-stock Toggle discussion.
