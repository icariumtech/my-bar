# Phase 2: Recipe Collection & Makeable Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-10
**Phase:** 2-Recipe Collection & Makeable Engine
**Areas discussed:** Where recipes get managed, Recipe structure (method/glassware/garnish), Ingredient quantity & units, Category deletion guard

---

## Where Recipes Get Managed

| Option | Description | Selected |
|--------|-------------|----------|
| New tab in the Barback app | Adds a "Recipes" section to the existing owner-facing shell — reuses Phase 1 styling/routing/API-client patterns | ✓ |
| New standalone Recipe Manager app | A 4th SPA sharing packages/shared types, cleaner separation but more setup | |
| You decide | Claude picks the pragmatic path | |

**User's choice:** New tab in the Barback app

| Option | Description | Selected |
|--------|-------------|----------|
| Show status in the list | Each recipe row gets a makeable/not-makeable badge, computed server-side | ✓ |
| Detail view only | List shows names only; status only on detail view | |

**User's choice:** Show status in the list

---

## Recipe Structure: Method, Glassware, Garnish

| Option | Description | Selected |
|--------|-------------|----------|
| Structured numbered steps | Method stored as an ordered list of step strings | ✓ |
| Single free-text block | One multi-line text field | |

**User's choice:** Structured numbered steps

| Option | Description | Selected |
|--------|-------------|----------|
| Free text (glassware) | Just a text field, no matching-logic impact | ✓ (initial) |
| Curated list (like categories) | Owner-managed reusable taxonomy | |

**User's choice (initial):** Free text

| Option | Description | Selected |
|--------|-------------|----------|
| Free text, not part of makeable check (garnish) | Descriptive only, doesn't affect makeable status | ✓ |
| Tied to inventory ingredient/category | Missing garnish could make a recipe not-makeable | |

**User's choice:** Free text, not part of makeable check

**Revisit:** User asked to revisit glassware mid-area ("I want to visit the glassware").

| Option | Description | Selected |
|--------|-------------|----------|
| Owner-managed list (matches categories) | Same add/rename/delete pattern as Phase 1 categories | ✓ |
| Fixed preset, not editable | Hardcoded dropdown, no management UI | |

**User's choice:** Owner-managed list — **this supersedes the earlier free-text glassware answer.** CONTEXT.md D-17 reflects the final (curated list) decision only.

**Notes:** Glassware examples discussed: "Coupe" vs "Nick & Nora" — illustrates why a small fixed preset wouldn't cover the owner's naming preferences.

---

## Ingredient Quantity & Units

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed unit dropdown | oz, dash, splash, barspoon, muddled, part, etc. | ✓ |
| Free text | Owner types any unit string | |

**User's choice:** Fixed unit dropdown

| Option | Description | Selected |
|--------|-------------|----------|
| No conversion — store & display as entered | No conversion table; dashes/splashes aren't volume-convertible anyway | ✓ |
| Store in ml, convert oz→ml for display | Real conversion table for true volume units | |

**User's choice:** No conversion — store & display as entered

---

## Category Deletion Guard Now Covers Recipes Too

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, block on either | Category deletion blocked if any ingredient OR recipe references it, with counts | ✓ |
| Only guard against ingredients (unchanged) | Keep Phase 1 behavior as-is | |

**User's choice:** Yes, block on either

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same guard pattern (glassware) | Same usage-guard pattern applied to glassware deletion | ✓ |
| No, glassware deletion is unguarded | Glassware deletion always succeeds | |

**User's choice:** Yes, same guard pattern

---

## Claude's Discretion

None — every gray area had an explicit user decision, including one revisited/superseded decision (glassware).

## Deferred Ideas

- Garnish tied to inventory (rejected for this phase, may revisit later)
- Unit volume conversion oz↔ml (rejected for this phase, no current requirement needs it)
