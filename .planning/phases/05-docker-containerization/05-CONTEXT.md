# Phase 5: Docker Containerization - Context

**Gathered:** 2026-08-20
**Status:** Ready for planning

<domain>
## Phase Boundary

The full my-bar stack (Fastify server + all three built frontend bundles — Patron, Bartender, Barback) runs as a single Docker container via `docker compose up`, deployable to the home server/Pi without a manual Node/pnpm setup. Covers: multi-stage Dockerfile, compose.yml, bind-mounted data persistence, `.env.example`, README setup/update docs, and a GitHub Actions CI workflow that tests, builds, and publishes the image to GHCR. No reverse proxy, no TLS, no multi-container split, no auth — matches the project's existing LAN-only, no-auth trust model.

</domain>

<decisions>
## Implementation Decisions

### GHCR Image Access & Tagging
- **D-01:** GHCR package `ghcr.io/icariumtech/my-bar` is public — `docker compose pull` on the Pi needs no `docker login`/auth setup.
- **D-02:** CI pushes only a `latest` tag on main-branch builds — no semver or git-sha tags. Single-owner home deploy has no rollback-pinning need.
- **D-03:** CI builds (but does not push) the image on pull requests too, per DOCK-06's "every push/PR" wording — catches a broken Dockerfile before merge. Only pushes to GHCR happen on pushes to `main`.

### CI Gate Before Publish
- **D-04:** The GitHub Actions workflow runs `pnpm -r test` (and typecheck) before building/pushing the image — a failing test suite blocks the image from reaching `latest`/GHCR entirely.
- **D-05:** The workflow uses a `paths-ignore` filter (or equivalent) to skip CI on pushes that only touch docs (README.md, `.planning/**`) — avoids rebuilding/republishing an identical image for doc-only commits, which this repo does frequently.
- **D-06:** Build/test failure notification relies on GitHub Actions' default behavior (email/UI to the repo owner) — no additional notification integration in this phase.

### Port & Compose Ergonomics
- **D-07:** `compose.yml` maps host port 3000 → container port 3000, matching the server's existing `PORT=3000` default (`apps/server/src/index.ts`) — no port remapping.
- **D-08:** `compose.yml` includes a `healthcheck:` block (HTTP check on an interval) so `docker ps` shows unhealthy state and `restart: unless-stopped` can recover from a hang, not just a crash. **Note for research/planner:** no dedicated health endpoint currently exists in `apps/server/src/index.ts` — determine whether to add a lightweight one (e.g. `GET /health`) or reuse an existing cheap `GET /api/...` route for the healthcheck target.
- **D-09:** `compose.yml` defines only the single app container — no watchtower-style auto-updater or other services. Updates are manual (`docker compose pull && docker compose up -d`), matching REQUIREMENTS.md's explicit single-container scope.

### README First-Run Experience
- **D-10:** README includes a copy-paste quickstart (clone → copy `.env.example` → fill in → `docker compose up -d`) plus a brief one-line-per-variable table (what each `.env` var does, where to get `ANTHROPIC_API_KEY`).
- **D-11:** README includes a brief troubleshooting section: `docker compose logs -f` for viewing logs, plus the 1-2 known failure modes already identified in `.planning/research/PITFALLS.md` (better-sqlite3 native bindings on ARM64, WAL bind-mount corruption) so a stuck deploy is self-serviceable.
- **D-12:** README includes a short, separate "Updating" section — `docker compose pull && docker compose up -d`, with a one-line note that `./data` persists untouched — satisfying DOCK-05's explicit requirement to document update steps distinctly from first-time setup.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Domain research (already completed for this milestone)
- `.planning/research/PITFALLS.md` — Docker-specific pitfalls: better-sqlite3 native binding compilation in pnpm Docker builds (Pitfall 1), SQLite WAL bind-mount corruption (Pitfall 2), pnpm store layer-cache misses (Pitfall 7), oversized final image (image-size pitfall) — all directly actionable for this phase's Dockerfile/CI design
- `.planning/research/ARCHITECTURE.md` — architecture context for how Docker fits the existing monorepo
- `.planning/research/STACK.md` — stack rationale, including the Docker/Fastify/pnpm choices already locked in `.claude/CLAUDE.md`
- `.planning/research/SUMMARY.md` — milestone-level research summary

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §"Docker Containerization" — DOCK-01 through DOCK-06, locked acceptance criteria
- `.planning/ROADMAP.md` §"Phase 5: Docker Containerization" — goal, success criteria, and notes (janus-console/janus-deploy pattern reference, node:22-slim multi-stage build, `./data` bind-mount rationale)

No project-specific ADRs exist yet for this milestone beyond the above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/server/src/db/client.ts` — already reads `DB_PATH` from `process.env` (defaults to `./data/my-bar.db`) and creates the parent directory if missing — no app-code change needed for DOCK-03's bind-mount requirement.
- `apps/server/src/index.ts` — already registers `@fastify/static` three times (`decorateReply: false` on the 2nd/3rd registrations) serving `../../barback/dist`, `../../patron/dist`, `../../bartender/dist` relative to `apps/server/dist/index.js` — the Docker build stage must preserve this monorepo-relative directory layout (`apps/server/dist`, `apps/barback/dist`, `apps/patron/dist`, `apps/bartender/dist`) in the runtime image, not flatten output into a single dir.
- `apps/server/src/index.ts` — reads `PORT` from env, defaults to 3000, binds `host: '0.0.0.0'` — already container-friendly.
- Root `package.json` — `"build": "pnpm -r build"` and `"test": "pnpm -r test"` already work across the whole monorepo; the Dockerfile build stage and CI workflow can shell out to these directly rather than re-implementing per-package build steps.
- `apps/server/src/staticBundleFreshness.test.ts` — existing test asserting the built frontend bundles are present/fresh; useful signal that the Docker build stage output should satisfy this test's expectations too.

### Established Patterns
- pnpm workspace monorepo (`apps/server`, `apps/barback`, `apps/patron`, `apps/bartender`, `packages/shared`) — Dockerfile must run `pnpm install` at the workspace root, not per-package, to resolve `workspace:*` deps like `@my-bar/shared`.
- No existing Dockerfile, compose.yml, `.env.example`, or `.github/workflows/` — this phase starts from zero, no legacy config to reconcile.

### Integration Points
- CI workflow (DOCK-06) needs to build/test the same monorepo the Dockerfile builds — reuse root `pnpm -r test` / `pnpm -r build` scripts as the CI test/build steps to avoid drift between what CI validates and what the Dockerfile actually does.
- Healthcheck target (D-08) needs a route decision — likely a new lightweight endpoint or reuse of an existing GET route under `/api/*`; not yet decided, flagged for research/planner.

</code_context>

<specifics>
## Specific Ideas

- Modeled on the janus-console/janus-deploy pattern (per ROADMAP.md notes): multi-stage Dockerfile, `node:22-slim` for both build and runtime stages, no ARM-specific base image or cross-compilation handling needed.
- Same-repo layout — Dockerfile + compose.yml live in `my-bar` itself, not a split deploy repo.
- GHCR image: `ghcr.io/icariumtech/my-bar`, public, `latest` tag only.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. No scope-creep items were raised.

</deferred>

---

*Phase: 5-Docker Containerization*
*Context gathered: 2026-08-20*
