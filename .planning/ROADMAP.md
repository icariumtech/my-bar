# Roadmap: My Bar

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (incl. 2.1) (shipped 2026-08-19)
- 🚧 **v1.1 AI Vision & Deploy** — Phases 5-7 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4, incl. 2.1) — SHIPPED 2026-08-19</summary>

- [x] Phase 1: Barback Inventory Foundation (6/6 plans) — completed 2026-08-10
- [x] Phase 2: Recipe Collection & Makeable Engine (8/8 plans) — completed 2026-08-11
- [x] Phase 02.1: Recipe UI cleanup (INSERTED) (7/7 plans) — completed 2026-08-12
- [x] Phase 3: Patron Browse Experience (5/5 plans) — completed 2026-08-12
- [x] Phase 4: Bartender Console & Order Workflow (5/5 plans) — completed 2026-08-18

Full detail archived in `.planning/milestones/v1.0-ROADMAP.md`.

</details>

- [ ] **Phase 5: Docker Containerization** - Single-container deploy so the full stack runs on the home server/Pi via `docker compose up`
- [ ] **Phase 6: AI Bottle Photo Recognition** - Owner photographs a bottle and Claude Vision prefills the add-ingredient form, replacing UPC scanning entirely
- [ ] **Phase 7: MCP Server for Recipe/Inventory Management** - Claude Code (or any MCP client) manages recipes/inventory via chat, delegating to the existing REST API

### Phase 5: Docker Containerization

**Goal**: The full my-bar stack (server + all three built frontend bundles) runs as a single Docker container via `docker compose up`, so it can be deployed to the home server/Pi without a manual Node/pnpm setup
**Depends on**: Phase 4
**Requirements**: DOCK-01, DOCK-02, DOCK-03, DOCK-04, DOCK-05, DOCK-06
**Success Criteria** (what must be TRUE):

  1. Owner runs `docker compose up -d` on the home server and reaches all three interfaces (Patron/Bartender/Barback) plus the API and Socket.IO from one running container — no separate reverse proxy or manual build step
  2. Restarting the container, or pulling an updated image, does not lose any inventory or recipe data — data persists in the bind-mounted `./data` host directory
  3. A fresh checkout with `.env.example` copied to `.env` and filled in (`ANTHROPIC_API_KEY`, `DB_PATH`, etc.) has everything the container needs to start
  4. Owner can follow README instructions alone to do first-time setup (`docker compose pull && docker compose up -d`) and later updates, without reading source code
  5. Every push to `main` automatically builds and publishes an updated image to GHCR (`ghcr.io/icariumtech/my-bar`), so `docker compose pull` fetches the latest build without building on-device

**Notes**: Modeled on the janus-console/janus-deploy pattern — multi-stage Dockerfile: `node:22-slim` build stage produces the 3 Vite SPA bundles, then a `node:22-slim` runtime stage runs the Fastify server, which serves the bundles + API + Socket.IO in one process (no reverse proxy). No ARM-specific base image or cross-compilation handling needed. Same-repo layout (Dockerfile + `compose.yml` in `my-bar` itself, not a split deploy repo). Database persistence: bind-mount the whole host `./data` directory to `/app/data` (not a single `.db` file) and set `DB_PATH=/app/data/my-bar.db` — `apps/server/src/db/client.ts` already reads `DB_PATH` from env, so no app-code change is needed; this also keeps SQLite's WAL-mode `.db-shm`/`.db-wal` sidecar files on the same persisted volume as the `.db` file, avoiding partial-mount corruption. CI (DOCK-06): a GitHub Actions workflow builds and pushes the image to GHCR on pushes to main, mirroring janus-console's `docker-publish.yml` — `compose.yml` pulls the published image rather than building on-device.

**Plans**: 2 plans

Plans:

- [ ] 05-01-PLAN.md — Containerize the full stack end-to-end (Dockerfile, compose.yml, health check, .env.example, data persistence)
- [ ] 05-02-PLAN.md — README docs and GitHub Actions CI/GHCR publish

### Phase 6: AI Bottle Photo Recognition

**Goal**: Owner can photograph a bottle from their phone and have Claude Vision identify it and prefill the add-ingredient form, replacing UPC barcode scanning entirely
**Depends on**: Phase 1 (Barback Inventory Foundation — needs the ingredient API)
**Requirements**: BOTTLE-01, BOTTLE-02, BOTTLE-03, BOTTLE-04, BOTTLE-05
**Success Criteria** (what must be TRUE):

  1. Owner can take or upload a bottle photo directly from the Barback add-ingredient flow on their phone
  2. Submitting a photo prefills the add-ingredient form with Claude Vision's extracted name/category/label details, shown for review — the app never auto-saves an AI-extracted result
  3. Owner can edit any prefilled field before saving, or discard the AI suggestion entirely
  4. If recognition fails, is low-confidence, or the photo is unusable, owner can fall back to manual entry without losing any progress already in the form
  5. A photo taken on an iPhone (HEIC) uploads and is recognized correctly with proper orientation — no format error is ever shown to the owner

**Notes**: Replaces UPC barcode scanning entirely (moved to Out of Scope in REQUIREMENTS.md — most UPC databases with usable alcohol coverage are paid/rate-limited). Uses Claude Sonnet 5 + Zod structured output via `messages.parse()`; the Claude API key stays server-side only, never reaching the browser. Review-before-save is a hard requirement, not a stretch goal — Claude Vision can hallucinate a confident-but-wrong bottle identification. HEIC→JPEG client-side conversion (with EXIF orientation preserved) is required for iPhone photos, since Claude Vision doesn't accept HEIC. This phase establishes a reusable Claude Vision/structured-extraction + Zod schema pattern that Phase 7's MCP-02 (text/URL-based recipe extraction) can reuse, since this phase ships first.

**Plans**: 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 6 to break down)

**UI hint**: yes

### Phase 7: MCP Server for Recipe/Inventory Management

**Goal**: Claude Code (or any MCP client) can manage the bar directly — send a recipe link, video link, or pasted text and have Claude create the recipe, or add/edit ingredients and categories — without opening the Barback UI
**Depends on**: Phase 1 (Barback Inventory Foundation — needs the ingredient/category API), Phase 2 (Recipe Collection & Makeable Engine — needs the recipe API)
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05, MCP-06
**Success Criteria** (what must be TRUE):

  1. Owner can connect an MCP client (e.g. Claude Code) to the server over stdio and see recipe/ingredient/category tools available, with every tool call delegating to the existing Fastify REST API rather than touching the database directly
  2. Owner can send a recipe URL, video link, or pasted text in chat and have Claude extract structured recipe data (name, ingredients with quantity/unit/category, method, glassware, garnish), show it for confirmation, then create the recipe via the API
  3. Owner can add or edit an ingredient or category via chat without opening the Barback UI
  4. Owner can ask for current recipes or inventory (including live makeable status) and get an answer that reflects the live database, not stale/cached data
  5. Deleting a recipe or ingredient via chat always requires an explicit confirmation step before the MCP server executes the delete

**Notes**: Modeled on janus-console's `mcp_server.py`: a standalone MCP server (new workspace, e.g. `apps/mcp`, TypeScript SDK `@modelcontextprotocol/sdk` v1.x, stdio transport) that delegates all reads/writes to the existing Fastify REST API rather than touching the DB directly — no new business logic, just an MCP tool surface over `/api/recipes`, `/api/ingredients`, `/api/categories`, `/api/glassware`. Runs unauthenticated, LAN-only, matching the rest of the app's no-auth trust model. Recipe creation (MCP-02) supports URL, video link, or pasted text — full link support is explicitly in scope, not just paste-text (confirmed in milestone discussion) — and can reuse Phase 6's Claude structured-extraction + Zod pattern rather than building a second one from scratch, since Phase 6 ships first. Every MCP-driven recipe/ingredient write should validate against the live category/ingredient list before writing, per the research's schema-mismatch pitfall.

**Plans**: 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 7 to break down)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 2.1 → 3 → 4 → 5 → 6 → 7

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Barback Inventory Foundation | v1.0 | 6/6 | Complete | 2026-08-10 |
| 2. Recipe Collection & Makeable Engine | v1.0 | 8/8 | Complete | 2026-08-11 |
| 02.1. Recipe UI cleanup (INSERTED) | v1.0 | 7/7 | Complete | 2026-08-12 |
| 3. Patron Browse Experience | v1.0 | 5/5 | Complete | 2026-08-12 |
| 4. Bartender Console & Order Workflow | v1.0 | 5/5 | Complete | 2026-08-18 |
| 5. Docker Containerization | v1.1 | 0/TBD | Not started | - |
| 6. AI Bottle Photo Recognition | v1.1 | 0/TBD | Not started | - |
| 7. MCP Server for Recipe/Inventory Management | v1.1 | 0/TBD | Not started | - |
