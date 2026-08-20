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
**Notes:** Modeled on the janus-console/janus-deploy pattern (multi-stage Dockerfile: Node builder stage for the 3 Vite SPA bundles, then a slim Node runtime stage running the Fastify server which serves the bundles + API + Socket.IO in one process — no reverse proxy). Same-repo layout (Dockerfile + docker/ + compose.yml in `my-bar` itself, not a split deploy repo) — no CI image publish needed at this project's scale.
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
