# My Bar

## What This Is

My Bar is a home bar management and ordering system for a personal home bar, used by the owner and their friends/family (not paying customers). It has three linked interfaces — a Patron screen for browsing/ordering drinks, a Bartender screen for recipe lookup, and a Barback screen for inventory tracking — all sharing one live view of what's actually in stock, so every screen agrees on what can and can't currently be made.

## Core Value

The inventory must be the single source of truth: at any moment, the Patron and Bartender screens must correctly show which drinks are makeable right now, and which are missing ingredients — this is what makes the whole system trustworthy.

## Requirements

### Validated

- [x] Manual recipe entry/editing (owner builds the recipe collection from scratch, no seeded dataset) — Validated in Phase 2: Barback recipe CRUD (name, ingredients, method, glassware, garnish)
- [x] Makeable/not-makeable computation core: server-side, computed once from live inventory, exact missing-ingredient reporting — Validated in Phase 2 (`computeMakeable()` + recipes API); extended to tri-state (green/yellow/substitution-available/red) with per-line specific-ingredient locking in Phase 2.1; surfacing this on Patron/Bartender screens is still Active (Phase 3+)
- [x] Barback navigation and data-entry UX: persistent bottom tab bar, full-screen add/edit/detail flows (no modal-on-modal), unified autocomplete-with-inline-create pickers for categories/glassware/ingredients — Validated in Phase 2.1
- [x] Patron interface (iPad): browse cocktails by category, view recipe/flavor/photo detail (dark-neon cocktail-menu aesthetic), and either just browse or submit an order — browsing validated in Phase 3; order submission ("who's this for" prompt, Order CTA gated on makeable status) validated in Phase 4
- [x] Bartender interface (iPad/Echo Show 8): recipe lookup with full ingredient/method detail, live order queue/tickets from the Patron screen — Validated in Phase 4 (new `apps/bartender` app, two-tab Recipes/Orders shell, batched ticket queue with new → in progress → done lifecycle)
- [x] Makeable/not-makeable status surfaced on Patron and Bartender screens — Patron's 2-state collapse validated in Phase 3; Bartender's full tri-state (green/yellow/red) validated in Phase 4
- [x] Runs on a local home server on the home network; no login/accounts — open kiosk-style access for all three interfaces — Patron kiosk lockdown (fullscreen, wake-lock, 90s inactivity timeout back to browse grid) validated in Phase 4; Bartender/Barback already open-access with no lockdown needed

### Active

- [ ] Barback interface (phone-first, responsive): inventory tracking — add/edit bottles and ingredients, see stock levels
- [ ] Live shared inventory: all three interfaces reflect the same real-time stock state
- [ ] UPC barcode scanning via device camera (browser-based) to add bottles to inventory without manual typing
- [ ] AI-assisted patron recommendations: when a requested/desired drink can't be made, suggest a makeable alternative the patron would likely enjoy, using Claude API
- [ ] AI-assisted substitution suggestions for the bartender/barback: when a recipe is missing an ingredient, suggest a reasonable substitution from what's in stock
- [ ] AI-assisted recipe import: photograph or screenshot a recipe, Claude extracts structured recipe data (name, ingredients, steps) for user review/confirmation before saving

### Out of Scope

- User accounts / authentication — home network only, trusted users, adds friction with no real benefit — reconsider only if the app is ever exposed outside the home network
- Payments / billing — friends and family, not a commercial bar
- Seeded/imported open cocktail dataset (e.g. TheCocktailDB) — owner wants to build their own curated recipe collection, possibly revisit later if manual entry proves too slow
- Dedicated physical barcode scanner hardware — camera-based scanning in-browser covers this; revisit only if camera scanning proves unreliable

## Context

- Reference design: two photos of an existing tablet cocktail-menu app (dark navy background, orange neon accents, left icon rail for categories like Cocktails/Wine/Beer/Spirits/Luxury, drink cards with name/price/flavor-tag triplet, tap-through detail view with photo, description, and origin story). This is the direct visual/UX reference for the Patron interface.
- Collection size: roughly medium — ~50-100 bottles/ingredients, ~100+ cocktail recipes expected over time.
- Hardware: Patron interface on an iPad (likely wall-mounted or bar-mounted), Bartender interface on a second iPad behind the bar, Barback/inventory tasks (including UPC scanning) done from the owner's phone. All interfaces are browser-based to stay flexible across these devices.
- AI: Claude API is the chosen provider for all AI-assisted features (recommendations, substitutions, recipe-image parsing).
- Deployment: intended to run on a local home server (e.g. always-on PC, NAS, or Raspberry Pi) on the home network — no dependency on internet access for core features to work; AI features will need internet access for the Claude API specifically.

## Constraints

- **Tech stack**: Browser-based UI across all three interfaces (iPad Safari + phone browser) — no native app builds
- **Network**: Runs on local home network; local server must be reachable from all three devices without needing internet, except for AI calls
- **AI provider**: Claude API only, for recommendations, substitutions, and recipe-image parsing
- **Access model**: No authentication anywhere — must not require login friction for guests using the Patron screen

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three separate interfaces (Patron, Bartender, Barback) sharing one inventory backend | Matches the three real roles/devices in use; keeps each screen focused on its job | — Pending |
| No user accounts/login | Home network, trusted friends/family, no commercial concerns | — Pending |
| Build recipe collection manually (no seeded dataset) | Owner wants a curated, personal recipe set rather than a generic imported database | Validated in Phase 2 |
| Camera-based UPC scanning in-browser, no dedicated scanner hardware | Avoids extra hardware purchase/setup; modern phone/tablet cameras handle this well | — Pending |
| Claude API for all AI features | Chosen provider for recommendations, substitutions, and recipe photo/screenshot parsing | — Pending |
| Local home server deployment | No need for internet dependency on core features; keeps data private and on-premises | — Pending |
| Patron order flow supports both browsing-only and full order submission to bartender queue | Owner wants flexibility — sometimes just look up a drink, sometimes place a real order | Validated in Phase 4 |
| Recipe ingredient lines can lock to one specific, non-substitutable ingredient (not just a category) | Booze categories are naturally substitutable, but mixers like lemon vs. lime juice are not — a plain category match was too coarse | Validated in Phase 2.1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-18 — Phase 4 (Bartender Console & Order Workflow) complete, verified: 45/45 must-haves, 333/333 tests green*
