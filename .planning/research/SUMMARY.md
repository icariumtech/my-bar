# Project Research Summary

**Project:** my-bar — home bar management/ordering web app
**Domain:** Self-hosted, local-network, multi-interface (Patron/Bartender/Barback), AI-assisted (Claude API) home bar system
**Researched:** 2026-08-09
**Confidence:** MEDIUM-HIGH

## Executive Summary

This is a three-role, local-network web app — a Patron ordering kiosk, a Bartender queue/recipe console, and a Barback mobile inventory tool — that sits at the intersection of three normally-separate product categories (consumer cocktail apps, restaurant KDS systems, and commercial bar-inventory software), none of which combine into one connected live-inventory system. That combination is the project's actual differentiator, not something to copy feature-for-feature from any single competitor. The core trust guarantee — "makeable/not-makeable must agree across all three screens" — is both the stated core value and the single biggest architectural risk in the research: it must be computed once, server-side, and pushed to clients via WebSocket, never computed independently per client from a potentially-stale cache.

The recommended approach is a TypeScript monorepo (pnpm workspaces) with a single Fastify + better-sqlite3 + Drizzle backend serving three plain Vite/React SPAs, using Socket.IO for push-only "something changed, refetch" signaling paired with TanStack Query as the actual data layer. This deliberately avoids SSR frameworks (SvelteKit/Next.js) and Postgres — both are overkill for a Raspberry-Pi-class device serving a handful of kiosk clients on a LAN. AI features (patron recommendations, bartender substitutions, recipe-photo import) are three independent, stateless Claude API calls behind a single server-side façade, never exposed client-side, and never a direct write path to the database — recipe-photo import in particular must always route through explicit human review before saving, per the project's own stated requirement.

The main risks are: (1) building sync as polling or client-side computation instead of server-authoritative WebSocket push, which breaks the core trust guarantee under real multi-client conditions; (2) treating camera barcode scanning and UPC lookup as guaranteed happy paths rather than best-effort accelerators with mandatory manual-entry fallback (critical since iPad/iPhone are Safari-based, where native `BarcodeDetector` is unsupported); (3) over-literal ingredient matching (exact name/unit equality) that makes genuinely makeable drinks show as not-makeable; and (4) treating Claude API calls as fast/reliable/synchronous in the core UX path when they are none of those things. All four are addressable by decisions already implied by the research (category-based ingredient modeling, boolean-not-volumetric makeable logic, additive/gracefully-degrading AI features) rather than requiring novel invention.

## Key Findings

### Recommended Stack

Node.js 22 LTS + TypeScript 5 across the board, in a pnpm-workspace monorepo (`apps/patron`, `apps/bartender`, `apps/barback`, `apps/server`, `packages/shared`) so the three frontends and backend share one type-checked data model. Fastify + better-sqlite3 + Drizzle ORM form the backend (SQLite in WAL mode is sufficient and appropriate at this scale — a few hundred rows, single-digit concurrent clients; Postgres is explicitly not justified). Vite + React 19 + TanStack Query build all three frontends as plain client-rendered SPAs (not SvelteKit/Next.js — no SSR need, and SSR adds unwarranted resource cost on a Pi). Socket.IO handles push (with its built-in reconnect/heartbeat handling, important for kiosk devices that sleep/lock/roam wifi) while TanStack Query owns the actual client cache, refetching REST as the source of truth on each WS signal. html5-qrcode is required (not optional) for barcode scanning because the native `BarcodeDetector` API is unsupported on Safari/iOS entirely. `@anthropic-ai/sdk` + Zod handle Claude integration and structured-output schemas server-side only.

**Core technologies:**
- Fastify + better-sqlite3 + Drizzle ORM: lightweight, single-process, Pi-appropriate backend with type-safe SQL and zero extra server processes
- Vite + React + TanStack Query: plain SPA bundler + battle-tested "REST is truth, WS says refetch" pattern, avoiding SSR overhead with no SEO need
- Socket.IO: reconnect/heartbeat handling that raw `ws` would require hand-rolling, critical for kiosk devices that sleep and roam wifi
- html5-qrcode: only viable in-browser scanner that works reliably on Safari/iPadOS, where native `BarcodeDetector` is entirely absent
- `@anthropic-ai/sdk` + Zod: server-side-only Claude integration with structured outputs (`messages.parse()` + Zod schema) for recipe extraction

### Expected Features

The domain splits sharply by role: Patron ≈ consumer cocktail apps + self-order kiosks, Bartender ≈ lightweight KDS + recipe reference app, Barback ≈ scaled-down commercial bar-inventory tool. The algorithmic core is the "makeable-from-stock" logic: ship boolean presence matching + partial/"almost makeable" diff + category-based substitution matching (e.g., "orange liqueur" not "Cointreau") as v1. Explicitly do NOT attempt volumetric pour-depletion tracking — no researched competitor does this at this scale, and informal units (dash, splash) have no fixed volume even in professional bartending, making exact math meaningless and a near-certain rewrite trap.

**Must have (table stakes):**
- Barback: add/edit ingredient (name, category, boolean in-stock toggle) — everything else depends on this
- Patron: browse by category, drink detail, makeable/not-makeable badge with missing-ingredient list
- Order submission (optional "who's this for" field) to a live bartender queue
- Bartender: full recipe detail, live queue with new→in-progress→done lifecycle
- Kiosk-lock/fullscreen + idle timeout on Patron screen (unauthenticated wall-mounted tablet)
- Manual recipe entry (owner needs to seed ~100 recipes regardless of what else ships)
- Category-based substitution matching (Pattern 3) — cheap once taxonomy exists, needed for AI substitution quality

**Should have (competitive differentiators):**
- AI recommendation when a desired drink can't be made (no researched competitor does live LLM reasoning here)
- AI substitution suggestions from actual current stock (competitors only do static rule-based charts)
- AI recipe-photo import (not found in any researched competitor)
- In-browser camera UPC scanning without dedicated hardware

**Defer (v2+):**
- Coarse fractional stock level (full/¾/½/¼/empty) — only once boolean in/out proves insufficient
- Auto-generated low-stock shopping list — depends on fractional stock levels existing first
- Flavor-tag browsing/filtering — needs ~50+ recipes to matter
- Explicitly not planned: volumetric depletion tracking, accounts/loyalty, payments/pricing, multi-station KDS, seeded cocktail database, allergen filtering, dedicated scanner hardware

### Architecture Approach

Three browser SPA clients talk to one Node backend over two channels: HTTP REST for all writes (validated and persisted server-side before anything else happens) and WebSocket for server-to-client push only (clients never message each other). The backend owns a single "makeable-status engine" — a pure, testable function computing recipe-vs-stock status — that recomputes and broadcasts on every relevant mutation; clients only ever render what the server most recently pushed, never compute makeable status themselves. AI features live behind one façade module (`services/claude.ts`) as three independent, stateless, single-turn Claude calls (recommend, substitute, import) — not an agent loop — with recipe-image import specifically using forced tool-use/structured output and always requiring human review before it becomes a real database row.

**Major components:**
1. HTTP API (Fastify REST routes) — source of truth for all state mutations, each ending in a WebSocket broadcast
2. WebSocket hub — broadcast-only fan-out of specific typed events (`inventory.changed`, `order.created`, `order.statusChanged`), never a generic "state.changed" catch-all
3. Makeable-status engine — isolated pure function (recipe ingredients × inventory stock → makeable/missing), the core trust guarantee, called synchronously after any relevant mutation
4. AI integration façade — single wrapper around `@anthropic-ai/sdk`, one function per feature, server-side only, API key never exposed to clients
5. SQLite (WAL mode) — single-file store for bottles/ingredients, recipes, recipe_ingredients join, orders

### Critical Pitfalls

1. **Naive polling or client-side makeable computation breaks the single-source-of-truth guarantee** — always compute makeable status server-side once per change and broadcast; never let clients compute it locally from a cache.
2. **Camera barcode scanning treated as a guaranteed happy path** — Safari/iPadOS has no native `BarcodeDetector` support; use html5-qrcode/ZXing with manual entry as the mandatory baseline, not a fallback bolted on after failure.
3. **Ingredient/recipe matching too literal** (exact name/unit equality) — model ingredients as categories with brand-specific bottles linked underneath, normalize units to ml at entry time, and explicitly decide "not enough volume" is out of scope (presence-only, not quantity-tracked).
4. **Claude API calls treated as fast/cheap/always-available in the core UX path** — AI features must be additive and gracefully degrading; core makeable/order logic must work 100% locally with zero AI/internet dependency, with explicit loading/error/fallback states.
5. **AI recipe-photo parsing auto-saved without review** — structured output guarantees schema validity, not factual correctness; the review/confirm step (original photo shown alongside extracted fields) is a core safety mechanism, not optional polish, and must be in the MVP scope of that phase.

Two additional pitfalls worth carrying into infrastructure/backend phases: SD-card storage corruption risk on Raspberry Pi under sustained SQLite WAL writes (use external SSD + scheduled backups), and conflating "no auth" with "no server-side validation" (every write endpoint must validate regardless of login state, and AI-triggering endpoints specifically need rate-limiting to avoid cost spikes from a buggy client or curious guest).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Data Layer & Sync Foundation
**Rationale:** Pitfall 1 (state desync) is explicitly called out as an architectural-backbone risk that must not be bolted on after screens exist; the makeable-status engine and WebSocket broadcast pipeline is the dependency root for every other feature.
**Delivers:** SQLite schema (bottles/ingredients, recipes, recipe_ingredients, orders) with WAL mode, Drizzle setup, Fastify server skeleton, WebSocket hub with typed events, and the core makeable-status engine as a pure/tested function.
**Addresses:** Boolean in-stock toggle + ingredient CRUD, category taxonomy foundation (from FEATURES.md dependency graph)
**Avoids:** Pitfall 1 (desync), Pitfall 8 (no-auth-as-no-validation) as a standing rule from day one

### Phase 2: Barback Inventory Interface
**Rationale:** Everything else (makeable logic, ordering, bartender queue) depends on trustworthy inventory data existing; the category taxonomy decision here is foundational and hard to retrofit per FEATURES.md dependency notes.
**Delivers:** Barback mobile-responsive CRUD UI, manual ingredient entry (name/category/in-stock toggle) as the primary path, UPC camera scan via html5-qrcode as an accelerator with mandatory manual fallback, server-side UPC lookup proxy with graceful "not found" handling.
**Uses:** html5-qrcode, Fastify UPC proxy endpoint
**Implements:** UPC lookup layer, Barback client component from ARCHITECTURE.md

### Phase 3: Makeable Logic & Patron Interface
**Rationale:** This is the project's stated Core Value; Pitfall 4 explicitly calls for a dedicated design pass using real early recipes as test cases, not synthetic examples, before building the UI on top.
**Delivers:** Patterns 1-3 (boolean presence, partial/"almost" match, category-based substitution) fully implemented and broadcast live; Patron browse/detail views, makeable/not-makeable badges with missing-ingredient detail, kiosk-lock/fullscreen + idle timeout.
**Addresses:** Patron table-stakes features, category-based substitution matching
**Avoids:** Pitfall 4 (over-literal matching)

### Phase 4: Ordering & Bartender Queue
**Rationale:** Depends on makeable logic being solid (Phase 3) since the bartender queue reuses the same shared matching logic per FEATURES.md — "do not duplicate the algorithm."
**Delivers:** Order submission from Patron (with optional "who's this for" field) into a live bartender queue; ticket lifecycle (new→in-progress→done); elapsed-time indicator; bartender recipe detail view and search/filter.
**Uses:** WebSocket hub `order.created`/`order.statusChanged` events
**Implements:** Order lifecycle data flow from ARCHITECTURE.md

### Phase 5: AI Features (Recommendations, Substitutions, Recipe Import)
**Rationale:** FEATURES.md explicitly recommends deferring these until the manual/deterministic flows they sit on top of are proven trustworthy — "an AI recommendation on top of buggy matching logic will just erode trust faster." Each AI feature also needs its own error/latency/cost-handling design per Pitfall 5.
**Delivers:** Server-side Claude façade (`services/claude.ts`); patron recommendation and bartender substitution calls (additive, gracefully degrading); recipe-photo import with forced structured output and a mandatory review/confirm UI (original photo shown alongside extracted fields).
**Addresses:** All three AI differentiator features from FEATURES.md
**Avoids:** Pitfall 5 (AI treated as fast/reliable), Pitfall 6 (auto-saved AI output)

### Phase 6: Deployment & Hardening
**Rationale:** Infrastructure decisions (hardware, storage, backups, process supervision) are called out as needing explicit documentation before "going live," not implicit fallback to whatever hardware is on hand.
**Delivers:** systemd service for process supervision, external SSD (not microSD) if on Raspberry Pi, scheduled SQLite backups, rate-limiting on AI-triggering endpoints, validation audit across all write endpoints.
**Avoids:** Pitfall 7 (SD-card corruption), Pitfall 8 (no server-side validation)

### Phase Ordering Rationale

- Data layer and sync must come first because every other feature (makeable logic, orders, inventory) depends on the server-authoritative broadcast pipeline being correct from the start — retrofitting it later is explicitly flagged as HIGH recovery cost in PITFALLS.md.
- Barback (inventory) precedes Patron (ordering) because makeable logic has nothing to compute against without inventory data, and the category taxonomy decided here shapes both matching quality and later AI prompt design.
- Makeable logic + Patron precedes Bartender queue because the queue reuses the exact same matching computation — building it twice would violate the "one inventory, one truth" architecture.
- All three AI features are grouped into one phase (rather than scattered across earlier phases) because FEATURES.md explicitly recommends validating the manual/deterministic flows first, and because they share one façade module and one set of error/latency/cost patterns per ARCHITECTURE.md and PITFALLS.md.
- Deployment/hardening comes last but its decisions (storage, backups, supervision) should be documented early and revisited at each phase, not treated as pure afterthought — PITFALLS.md frames this as a standing rule more than a single phase.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Barback inventory):** UPC lookup API selection/coverage for niche liquor products is a real, cross-checked gap (MEDIUM confidence only) — worth validating against the owner's actual bottle collection early, not assumed from vendor claims.
- **Phase 3 (Makeable logic):** Unit normalization and category-taxonomy granularity is called out as foundational and hard to retrofit — worth a dedicated `--research-phase` pass on ingredient-substitution modeling patterns before implementation.
- **Phase 5 (AI features):** Each of the three AI call sites (recommend, substitute, import) needs its own structured-output schema design, retry/backoff policy, and cost-guardrail research — PITFALLS.md explicitly flags this per AI-integration skill guidance.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Data layer/sync):** WebSocket push + server-authoritative derived state is a well-documented, mainstream pattern (Fastify/Socket.IO/SQLite WAL) with HIGH-confidence stack sourcing.
- **Phase 4 (Ordering/queue):** Standard KDS ticket-lifecycle pattern, well-precedented across restaurant self-order systems.
- **Phase 6 (Deployment):** systemd/backup/storage guidance is standard sysadmin practice, not novel to this domain.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Package versions verified live against npm registry; Claude API/SDK details verified against current Anthropic docs; ecosystem/pattern claims (framework comparisons) cross-checked but web-sourced (MEDIUM within an overall HIGH-anchored file) |
| Features | MEDIUM | Web search only, no official vendor docs or SDKs involved — this is a product/UX domain synthesis, cross-checked across multiple independent competitor sources per topic |
| Architecture | MEDIUM | Web-sourced, cross-checked across multiple independent sources; no official case study for this exact niche exists, but every component maps to well-documented mainstream patterns; Claude API specifics HIGH (official SDK docs) |
| Pitfalls | MEDIUM | Web-sourced, cross-checked; no official case study for this exact feature combination exists, but each individual pitfall (SQLite concurrency, Safari BarcodeDetector gaps, Claude rate limits) is independently well-documented |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- UPC/barcode database coverage for craft/niche liquor products is genuinely uncertain until tested against the owner's real ~50-100 bottle collection — treat the Phase 2 hit-rate as an early validation checkpoint, not an assumption.
- Exact ingredient-category granularity (e.g., "orange liqueur" vs. "triple sec" vs. brand-pinned) is a product decision, not purely technical — resolve with the owner during Phase 3 discussion, using early real recipes as test cases per Pitfall 4.
- Whether "not enough volume" should ever count as not-makeable (vs. staying purely presence-based) is flagged in PITFALLS.md as a product decision to make explicitly before building matching logic — currently research recommends presence-only for v1, but confirm with the owner.
- Actual hardware target (Raspberry Pi model, SD card vs. SSD) isn't yet finalized in PROJECT.md context available to this research — Phase 6 planning should confirm this before committing to specific deployment guidance.

## Sources

### Primary (HIGH confidence)
- npm registry live version checks (2026-08-09) — all core package versions
- Bundled Anthropic `claude-api` skill documentation — model IDs, pricing, structured outputs, vision input, SDK patterns, rate limits, error handling
- Anthropic official docs (platform.claude.com) — structured outputs, rate limits, API errors

### Secondary (MEDIUM confidence)
- Web search, cross-checked across multiple independent sources — SvelteKit/Next.js/Vite comparisons, Fastify/Express comparisons, WebSocket/SSE/polling comparisons, Socket.IO vs `ws`, barcode library comparisons and Safari `BarcodeDetector` support status, Drizzle vs Prisma, UPC database coverage for alcohol, Raspberry Pi self-hosting and SD-card corruption patterns, SQLite WAL/concurrency behavior, competitor feature analysis (WISK, Backbar, BinWise, Mixel, Cocktail Party, My Cocktail Bar, and others — see FEATURES.md for full list), kiosk-mode/guided-access patterns, cocktail measurement/substitution conventions

### Tertiary (LOW confidence)
- None flagged — all findings were cross-checked across at least two independent sources per topic

---
*Research completed: 2026-08-09*
*Ready for roadmap: yes*
