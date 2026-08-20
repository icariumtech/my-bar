---
phase: 05-docker-containerization
plan: 02
subsystem: infra
tags: [docker, github-actions, ci, ghcr, documentation]

requires:
  - phase: 05-01
    provides: Dockerfile, compose.yml, .dockerignore, .env.example, GET /health endpoint — this plan documents and CI-wraps that work
provides:
  - Full README.md (Quickstart, Environment Variables, Accessing the App, Updating, Troubleshooting, Local Development)
  - .github/workflows/docker-publish.yml — test-gated CI pipeline that builds and publishes ghcr.io/icariumtech/my-bar:latest on push to main
affects: [any future phase touching Dockerfile/compose.yml (CI's Dockerfile build must stay in sync), README.md (future env vars must be documented here)]

actuals:
  tokens: 1458
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "GitHub Actions two-job workflow (test → build-and-push via needs:) with a top-level concurrency group keyed on github.ref (cancel-in-progress: true) to prevent racing publishes on the same ref"
    - "Push-vs-PR gating pattern: docker/login-action and build-push-action's push: input both conditioned on github.event_name == 'push' && github.ref == 'refs/heads/main', so PRs (including forks, which already run with a read-only GITHUB_TOKEN) build but never authenticate or publish"

key-files:
  created:
    - .github/workflows/docker-publish.yml
  modified:
    - README.md

key-decisions:
  - "paths-ignore applied identically to both push and pull_request triggers (README.md, .planning/**) so doc-only commits never trigger CI on either event type, satisfying D-05"
  - "build-and-push job scopes permissions to exactly contents: read, packages: write (never write-all) — least privilege for GHCR publish per D-06 and threat T-05-03's mitigation plan"
  - "pnpm/action-setup pinned to version 11.17.0 to match the Dockerfile builder stage's corepack-pinned pnpm version — documented inline as a comment so future changes to either must update both"

patterns-established:
  - "CI test job reuses root pnpm -r build for typecheck (each package's build script runs tsc) rather than adding a separate typecheck step — matches D-04's 'test (and typecheck)' gate with no duplicate command"

requirements-completed: [DOCK-05, DOCK-06]

coverage:
  - id: D1
    description: "README.md documents Quickstart, Environment Variables (all four vars), Accessing the App, Updating, Troubleshooting (both PITFALLS.md failure modes), and Local Development — owner can complete setup/updates without reading source"
    requirement: "DOCK-05"
    verification:
      - kind: other
        ref: "grep checks for all six ## section headers, 2x occurrence of 'docker compose pull && docker compose up -d', ANTHROPIC_API_KEY, and console.anthropic.com — all pass (see Task 1 verify block)"
        status: pass
    human_judgment: false
  - id: D2
    description: ".github/workflows/docker-publish.yml exists, triggers on push/pull_request to main with paths-ignore, gates GHCR login+push to main-only pushes, publishes only :latest, and scopes permissions to contents:read + packages:write"
    requirement: "DOCK-06"
    verification:
      - kind: other
        ref: "grep checks for paths-ignore(2x), packages: write, ghcr.io/icariumtech/my-bar:latest, pnpm -r test, cancel-in-progress: true, event-name/ref gate(2x), needs: test — all pass (see Task 2 verify block); YAML syntax validated via python3 yaml.safe_load"
        status: pass
    human_judgment: true
    rationale: "The workflow's actual execution (a real push to main triggering the test job then build-and-push, publishing to GHCR, and a real PR building-but-not-pushing) cannot be exercised inside this sandboxed executor — no GitHub Actions runner or GHCR credentials are available here. Static structure/gating was verified exhaustively via grep and YAML parsing, but a human must confirm the workflow fires correctly on the first real push to main and the first real PR before this phase is considered shippable."

duration: 4min
completed: 2026-08-20
status: complete
---

# Phase 5 Plan 2: Docker Containerization — README & CI Publish Summary

**Full setup/update/troubleshooting README plus a two-job GitHub Actions workflow (test → build-and-push) that publishes ghcr.io/icariumtech/my-bar:latest on push to main, gated on tests passing and never publishing from pull requests.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-20T12:09:45-05:00
- **Completed:** 2026-08-20T12:13:39-05:00
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Rewrote `README.md` from a one-line placeholder into a full operator-facing document: Quickstart (clone → `.env.example` → fill `ANTHROPIC_API_KEY` → `docker compose pull && docker compose up -d`), an Environment Variables table for all four vars from Plan 05-01's `.env.example`, an Accessing the App section covering all three screens with a LAN-IP note for kiosk devices, a distinct Updating section, a Troubleshooting section citing both `PITFALLS.md` failure modes (better-sqlite3 native binding, WAL bind-mount corruption), and a Local Development pointer to `setup.sh`/`start_server.sh`
- Wrote `.github/workflows/docker-publish.yml`: a `test` job (checkout, pnpm/action-setup pinned to 11.17.0, setup-node with pnpm cache, `pnpm install --frozen-lockfile`, `pnpm -r build` for typecheck, `pnpm -r test`) gating a `build-and-push` job (`needs: test`, `contents: read`/`packages: write` only) that logs into GHCR and builds+pushes `ghcr.io/icariumtech/my-bar:latest` — both the login step and the push condition gated on `github.event_name == 'push' && github.ref == 'refs/heads/main'`
- Top-level `paths-ignore: [README.md, .planning/**]` on both the `push` and `pull_request` triggers, plus a `concurrency: { group: docker-publish-${{ github.ref }}, cancel-in-progress: true }` block so doc-only commits skip CI entirely and back-to-back pushes to main never race on which build lands as `:latest`

## Task Commits

Each task was committed atomically:

1. **Task 1: README — Quickstart, env vars, accessing the app, updating, troubleshooting** - `8e6ef93` (docs)
2. **Task 2: GitHub Actions — test-gated build and GHCR publish on main** - `34d8e15` (feat)

## Files Created/Modified
- `README.md` - Replaced placeholder title with full setup/operate documentation (six `##` sections)
- `.github/workflows/docker-publish.yml` - New: two-job CI/CD pipeline (test, build-and-push)

## Decisions Made
- `paths-ignore` applied to both the `push` and `pull_request` triggers identically (not just `push`) — a PR that only touches docs also shouldn't spend CI minutes re-testing/re-building
- pnpm version in `pnpm/action-setup@v4` hardcoded to `11.17.0` with an inline comment linking it to the Dockerfile's `corepack prepare pnpm@11.17.0` pin, so a future version bump in one place is a visible prompt to update the other
- No separate typecheck step added — `pnpm -r build` already runs `tsc` per package (confirmed via `apps/server/package.json`'s `"build": "pnpm --filter @my-bar/shared build && tsc -p tsconfig.json"`), satisfying D-04's "test (and typecheck)" gate without a duplicate command

## Deviations from Plan

None - plan executed exactly as written; both tasks matched their `<action>` blocks and all `<verify><automated>` grep checks passed on the first attempt.

## Issues Encountered

**GitHub Actions workflow execution could not be run end-to-end in this sandbox.** No GitHub Actions runner, `GITHUB_TOKEN`, or GHCR credentials are available in this executor environment, so the actual triggering/running of `test` and `build-and-push` (a real push to main publishing an image, a real PR building-but-not-pushing) has not been exercised. All static verification (file existence, grep-based structural checks for triggers/permissions/gating/tags, and YAML syntax validation via `python3 -c "import yaml; yaml.safe_load(...)"`) passed. This is logged as `D2`'s `human_judgment: true` coverage entry above — a human should confirm the workflow fires correctly on the first real push to main and the first real PR before relying on it for shipping.

## User Setup Required

None - no external service configuration required for this plan. (The GitHub repository must have Actions enabled and the default `GITHUB_TOKEN` must have package-write permission at the repo/org level for the publish step to succeed on the first real run — this is a one-time GitHub repo setting, not a code change.)

## Next Phase Readiness

- README.md and `.github/workflows/docker-publish.yml` are both complete and ready for the phase's overall verification.
- Combined with Plan 05-01's Dockerfile/compose.yml/health endpoint, Phase 5's full deliverable set (DOCK-01 through DOCK-06) is now written and statically verified.
- **Carried-over blocker (from 05-01, still open):** the Docker build/run/persistence smoke test (`docker compose build && docker compose up -d`, health poll, curl all four surfaces, data-persistence cycle, env-leak check) has still not been executed anywhere — Docker is unavailable in this sandbox. A human (or an executor with Docker access) must run it before this phase ships. Tracked in `.planning/WINDOWS.md`.
- **New item for this plan:** the CI workflow's real-world trigger behavior (first push to main, first PR) has not been observed — recommend watching the Actions tab after the next merge to main.

---
*Phase: 05-docker-containerization*
*Completed: 2026-08-20*

## Self-Check: PASSED
