# My Bar

## What This Is

My Bar is a home bar management and ordering system for a personal home bar, used by the owner and their friends/family (not paying customers). It has three linked interfaces — a Patron screen for browsing/ordering drinks, a Bartender screen for recipe lookup, and a Barback screen for inventory tracking — all sharing one live view of what's actually in stock, so every screen agrees on what can and can't currently be made.

## Core Value

The inventory must be the single source of truth: at any moment, the Patron and Bartender screens must correctly show which drinks are makeable right now, and which are missing ingredients — this is what makes the whole system trustworthy.

## Current Milestone: v1.1 AI Vision & Deploy

**Goal:** Ship containerized deployment, replace UPC scanning with AI photo-based bottle recognition, and add an MCP server so recipes and inventory can be managed via chat.

**Target features:**
- Docker Containerization — single-container deploy (multi-stage Dockerfile + compose.yml, same-repo, modeled on the janus-console pattern)
- AI Bottle Photo Recognition — photograph a bottle, Claude Vision identifies it and prefills the add-ingredient form, fully replacing UPC scanning
- MCP Server — standalone TypeScript MCP server delegating to the existing REST API, so recipes can be created from a link/pasted text/video and inventory can be managed via chat

## Requirements

### Validated

- [x] Manual recipe entry/editing (owner builds the recipe collection from scratch, no seeded dataset) — Validated in Phase 2: Barback recipe CRUD (name, ingredients, method, glassware, garnish)
- [x] Makeable/not-makeable computation core: server-side, computed once from live inventory, exact missing-ingredient reporting — Validated in Phase 2 (`computeMakeable()` + recipes API); extended to tri-state (green/yellow/substitution-available/red) with per-line specific-ingredient locking in Phase 2.1; surfacing this on Patron/Bartender screens is still Active (Phase 3+)
- [x] Barback navigation and data-entry UX: persistent bottom tab bar, full-screen add/edit/detail flows (no modal-on-modal), unified autocomplete-with-inline-create pickers for categories/glassware/ingredients — Validated in Phase 2.1
- [x] Patron interface (iPad): browse cocktails by category, view recipe/flavor/photo detail (dark-neon cocktail-menu aesthetic), and either just browse or submit an order — browsing validated in Phase 3; order submission ("who's this for" prompt, Order CTA gated on makeable status) validated in Phase 4
- [x] Bartender interface (iPad/Echo Show 8): recipe lookup with full ingredient/method detail, live order queue/tickets from the Patron screen — Validated in Phase 4 (new `apps/bartender` app, two-tab Recipes/Orders shell, batched ticket queue with new → in progress → done lifecycle)
- [x] Makeable/not-makeable status surfaced on Patron and Bartender screens — Patron's 2-state collapse validated in Phase 3; Bartender's full tri-state (green/yellow/red) validated in Phase 4
- [x] Runs on a local home server on the home network; no login/accounts — open kiosk-style access for all three interfaces — Patron kiosk lockdown (fullscreen, wake-lock, 90s inactivity timeout back to browse grid) validated in Phase 4; Bartender/Barback already open-access with no lockdown needed

- [x] Live shared inventory across all three interfaces via Socket.IO push + TanStack Query invalidation — inventory changes and order status changes propagate without manual refresh — Validated in Phase 3 (SYNC-01) and Phase 4 (SYNC-02)
- [x] Containerized deployment: Dockerfile + docker compose file so the server (and all three built frontend bundles) run as a single container on the home server — Validated in Phase 5; deployed and confirmed live on the actual production target (Ubuntu VM on Proxmox) via 10/10 passing UAT tests, including a real container recreate persistence check and a real GHCR CI publish

### Active

- [ ] AI-assisted bottle photo recognition: owner photographs a bottle from their phone, Claude Vision identifies it (name, category, and other identifiable details) and prefills the add-ingredient form for review/confirmation before saving — replaces UPC barcode scanning
- [ ] AI-assisted patron recommendations: when a requested/desired drink can't be made, suggest a makeable alternative the patron would likely enjoy, using Claude API
- [ ] AI-assisted substitution suggestions for the bartender/barback: when a recipe is missing an ingredient, suggest a reasonable substitution from what's in stock
- [ ] AI-assisted recipe import: photograph or screenshot a recipe, Claude extracts structured recipe data (name, ingredients, steps) for user review/confirmation before saving
- [ ] MCP server exposing the recipe/ingredient/category/glassware API to Claude Code (or any MCP client), so the owner can send a recipe link, pasted recipe, or YouTube video and have a recipe created, or add/edit ingredients, without opening the Barback UI

### Out of Scope

- User accounts / authentication — home network only, trusted users, adds friction with no real benefit — reconsider only if the app is ever exposed outside the home network
- Payments / billing — friends and family, not a commercial bar
- Seeded/imported open cocktail dataset (e.g. TheCocktailDB) — owner wants to build their own curated recipe collection, possibly revisit later if manual entry proves too slow
- Dedicated physical barcode scanner hardware — camera-based scanning in-browser covers this; revisit only if camera scanning proves unreliable
- UPC barcode scanning / UPC database lookup — most UPC databases with usable alcohol coverage are paid/rate-limited; replaced with AI photo-based bottle recognition (Claude Vision), which needs no third-party database at all

## Context

- Reference design: two photos of an existing tablet cocktail-menu app (dark navy background, orange neon accents, left icon rail for categories like Cocktails/Wine/Beer/Spirits/Luxury, drink cards with name/price/flavor-tag triplet, tap-through detail view with photo, description, and origin story). This is the direct visual/UX reference for the Patron interface.
- Collection size: roughly medium — ~50-100 bottles/ingredients, ~100+ cocktail recipes expected over time.
- Hardware: Patron interface on an iPad (likely wall-mounted or bar-mounted), Bartender interface on a second iPad behind the bar, Barback/inventory tasks (including AI-assisted bottle photo capture) done from the owner's phone. All interfaces are browser-based to stay flexible across these devices.
- AI: Claude API is the chosen provider for all AI-assisted features (recommendations, substitutions, recipe-image parsing).
- Deployment: runs on a local home server on the home network — no dependency on internet access for core features to work; AI features will need internet access for the Claude API specifically. Confirmed production target (as of Phase 5): an Ubuntu VM on a Proxmox host, managed via Dockge — not a Raspberry Pi, despite "Pi" being used as shorthand in earlier planning docs (ROADMAP.md/CLAUDE.md). This means no ARM64/cross-compilation concerns; the single-arch `linux/amd64` GHCR image already matches the deploy target.

### v1.0 Shipped State (2026-08-19)

- Codebase: pnpm monorepo — `apps/server` (Fastify + Drizzle/better-sqlite3 + Socket.IO), `apps/barback`, `apps/patron`, `apps/bartender` (React 19 + Vite + antd, dark theme), `packages/shared` (Zod contracts). ~15,900 LOC TypeScript across 338 commits over 10 days (2026-08-09 → 2026-08-19).
- All 31 v1 requirements shipped and verified across 5 phases (4 integer + 1 inserted urgent phase, 31 plans, 69 tasks).
- Known tech debt: an intermittent WAL-lock race in `pnpm --filter server test` (parallel test workers sharing the production db-file's module-level `journal_mode` pragma) — non-blocking, documented in STATE.md Deferred Items, fix is to make `apps/server/src/db/client.ts`'s db connection lazy.
- Two debug sessions from Phase 2 (recipe-save 400 on every save; stale makeable badge after stock toggle) were root-caused during Phase 2 and fixed in later gap-closure plans (02-07, 02-08) — confirmed still fixed in the shipped code at milestone close.

## Constraints

- **Tech stack**: Browser-based UI across all three interfaces (iPad Safari + phone browser) — no native app builds
- **Network**: Runs on local home network; local server must be reachable from all three devices without needing internet, except for AI calls
- **AI provider**: Claude API only, for recommendations, substitutions, recipe-image parsing, and bottle-photo recognition
- **Access model**: No authentication anywhere — must not require login friction for guests using the Patron screen

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three separate interfaces (Patron, Bartender, Barback) sharing one inventory backend | Matches the three real roles/devices in use; keeps each screen focused on its job | ✓ Good — shipped v1.0, all three apps share one Fastify/SQLite backend cleanly |
| No user accounts/login | Home network, trusted friends/family, no commercial concerns | ✓ Good — kiosk-style access worked as intended, no friction reported |
| Build recipe collection manually (no seeded dataset) | Owner wants a curated, personal recipe set rather than a generic imported database | ✓ Good — Validated in Phase 2 |
| Camera-based UPC scanning in-browser, no dedicated scanner hardware | Avoids extra hardware purchase/setup; modern phone/tablet cameras handle this well | ⚠️ Revisit — superseded before build: most UPC databases with usable alcohol coverage are paid/rate-limited, so this was replaced with AI photo-based bottle recognition instead of ever being built |
| AI photo-based bottle recognition (Claude Vision) replaces UPC scanning for adding inventory | UPC database coverage for alcohol is poor and mostly paywalled; Claude Vision needs no third-party database and the app already uses Claude for recipe-photo parsing, so this reuses an established pattern | — Pending (planned for v1.x) |
| Claude API for all AI features | Chosen provider for recommendations, substitutions, recipe photo/screenshot parsing, and bottle-photo recognition | — Pending (deferred to v1.x, not built in v1.0) |
| Local home server deployment | No need for internet dependency on core features; keeps data private and on-premises | ✓ Good — no internet dependency for any core v1.0 feature |
| Patron order flow supports both browsing-only and full order submission to bartender queue | Owner wants flexibility — sometimes just look up a drink, sometimes place a real order | ✓ Good — Validated in Phase 4 |
| Recipe ingredient lines can lock to one specific, non-substitutable ingredient (not just a category) | Booze categories are naturally substitutable, but mixers like lemon vs. lime juice are not — a plain category match was too coarse | ✓ Good — Validated in Phase 2.1, tri-state (green/yellow/red) makeable status works as intended |
| Bottom tab bar + full-screen add/edit/detail flows replacing modal-on-modal navigation (Barback) | Stacked modals became unwieldy as Barback's flows grew; a persistent bottom tab bar with full-screen views is a clearer mobile navigation model | ✓ Good — Validated in Phase 2.1 |
| Socket.IO for live cross-screen sync (inventory + order status) rather than polling | Kiosk iPads sleep/lock/roam wifi — Socket.IO's reconnect handling avoids silent staleness that plain polling risks | ✓ Good — Validated in Phase 3 (SYNC-01) and Phase 4 (SYNC-02) |
| Patron screen runs kiosk-locked (fullscreen + wake-lock + inactivity timeout back to browse) | Wall-mounted, unauthenticated tablet needs to behave like an appliance, not a browser tab that can be backgrounded or left on a stale screen | ✓ Good — Validated in Phase 4 |
| Multi-stage Dockerfile: fresh `pnpm install --prod --filter` in the runtime stage, not `pnpm prune --prod` + cross-stage `node_modules` copy | The prune+copy approach (original Phase 5 plan) silently dropped `fastify` at runtime on first real deployment (`ERR_MODULE_NOT_FOUND`) — pnpm's workspace symlink tree didn't survive the prune+copy reliably. A fresh scoped install in the runtime stage avoids the whole class of cross-stage symlink-integrity risk | ✓ Good — fixed and confirmed working via live Dockge deployment |
| `docker-entrypoint.sh` auto-runs `drizzle-kit push --force` on container start, but only when the database has zero tables | A fresh `docker compose up -d` created an empty SQLite file but never initialized its schema — every query failed ("Couldn't load inventory"). Scoped strictly to the empty-DB case so it never risks altering/losing data on an already-initialized deployment; schema evolution on existing data stays a manual step, same as local dev | ✓ Good — fixed and confirmed working live; new image self-initializes on a genuinely fresh deploy |
| CI test-server sockets bind explicitly to `host: '127.0.0.1'` | `app.listen({ port: 0 })` with no host can bind IPv6-only on a GitHub Actions runner while the test client hardcodes `127.0.0.1`, hanging past any hook timeout instead of failing fast — root cause of the first two failed CI runs | ✓ Good — fixed, CI green since |
| Production deploy target is an Ubuntu VM on Proxmox, not a Raspberry Pi | User corrected this directly after Phase 5 shipped; earlier planning docs used "Pi" as shorthand from the janus-console pattern this phase was modeled on | ✓ Confirmed — no ARM/cross-compile handling needed, matches the single-arch amd64 image already built |

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
*Last updated: 2026-08-21 after Phase 5*
