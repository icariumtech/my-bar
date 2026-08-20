# Roadmap: My Bar

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (incl. 2.1) (shipped 2026-08-19)

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

### Phase 5: Docker Containerization

**Goal:** The full my-bar stack (server + all three built frontend bundles) runs as a single Docker container via `docker compose up`, so it can be deployed to the home server/Pi without a manual Node/pnpm setup
**Requirements**: TBD (defined during /gsd-new-milestone)
**Depends on:** Phase 4
**Notes:** Modeled on the janus-console/janus-deploy pattern (multi-stage Dockerfile: Node builder stage for the 3 Vite SPA bundles, then a slim Node runtime stage running the Fastify server which serves the bundles + API + Socket.IO in one process — no reverse proxy). Same-repo layout (Dockerfile + docker/ + compose.yml in `my-bar` itself, not a split deploy repo). Both build and runtime stages use `node:22-slim` (same image janus-console already uses for its frontend-builder stage) — no ARM-specific base image or cross-compilation handling needed. **Database persistence:** bind-mount the whole host `./data` directory to `/app/data` in the container (not a single `.db` file) and set `DB_PATH=/app/data/my-bar.db` — `apps/server/src/db/client.ts` already reads `DB_PATH` from env, defaulting to `./data/my-bar.db`, so no code change needed. A directory mount (vs. janus-deploy's single-file `db.sqlite3` bind mount, which needs a `touch db.sqlite3` workaround) also keeps SQLite's WAL-mode `.db-shm`/`.db-wal` sidecar files on the same persisted volume as the `.db` file itself. **CI (DOCK-06):** a GitHub Actions workflow builds the image on every push/PR and pushes to GHCR (`ghcr.io/icariumtech/my-bar`) on pushes to main, mirroring janus-console's `docker-publish.yml` — `compose.yml` pulls the published image rather than building on-device.
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 5 to break down)

### Phase 6: AI Bottle Photo Recognition

**Goal:** Owner can photograph a bottle from their phone and have Claude Vision identify it and prefill the add-ingredient form, replacing UPC barcode scanning entirely
**Requirements**: TBD (defined during /gsd-new-milestone)
**Depends on:** Phase 1 (Barback Inventory Foundation)
**Notes:** Replaces the original UPC-scanning plan (SCAN-01/SCAN-02 in the archived v1.0 requirements) — most UPC databases with usable alcohol coverage are paid/rate-limited, so this reuses the same Claude Vision + structured-output pattern already planned for AI-assisted recipe photo import, applied to bottle photos instead.
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 6 to break down)

### Phase 7: MCP Server for Recipe/Inventory Management

**Goal:** Claude Code (or any MCP client) can manage the bar directly — send a recipe link or a YouTube video and have Claude create the recipe, or add/edit ingredients — without opening the Barback UI
**Requirements**: TBD (defined during /gsd-new-milestone)
**Depends on:** Phase 2 (Recipe Collection & Makeable Engine — needs the recipe API), Phase 1 (Barback Inventory Foundation — needs the ingredient API)
**Notes:** Modeled on janus-console's `mcp_server.py`: a standalone MCP server (TypeScript SDK, since this stack is Node not Python) that delegates all writes/reads to the existing Fastify REST API rather than touching the DB directly — no new business logic, just an MCP tool surface over `/api/recipes`, `/api/ingredients`, `/api/categories`, `/api/glassware`. Runs unauthenticated on the trust-network model (same as the rest of the app — no login anywhere), reachable only from the home network / wherever Claude Code runs. Tool needs: create/edit a recipe from unstructured input (a URL, a pasted recipe, a video transcript/description) via Claude extracting structured recipe data — same structured-output pattern as the already-planned AI recipe-photo-import feature (Phase 6 territory) but text/URL-sourced instead of image-sourced; add/edit ingredients and categories; list current inventory and recipes for context.
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 7 to break down)
