# Phase 5: Docker Containerization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-20
**Phase:** 5-Docker Containerization
**Areas discussed:** GHCR image access & tagging, CI gate before publish, Port & compose ergonomics, README first-run experience

---

## GHCR Image Access & Tagging

| Option | Description | Selected |
|--------|-------------|----------|
| Public | No auth needed on the Pi to pull; no proprietary code exposed | ✓ |
| Private | Requires `docker login ghcr.io` with a PAT before every pull | |

**User's choice:** Public
**Notes:** Simplest for a solo-dev home deploy; nothing sensitive lives in the image itself.

| Option | Description | Selected |
|--------|-------------|----------|
| latest only | Simplest, no version bookkeeping | ✓ |
| latest + git-sha | Adds a rollback pin, more clutter in GHCR | |

**User's choice:** latest only

| Option | Description | Selected |
|--------|-------------|----------|
| Build-only on PRs | Catches broken Dockerfile before merge; matches DOCK-06's "every push/PR" wording | ✓ |
| Only build on main | Simpler workflow, but PR could merge a broken Dockerfile | |

**User's choice:** Build-only on PRs (push to GHCR only on main)

---

## CI Gate Before Publish

| Option | Description | Selected |
|--------|-------------|----------|
| Test then build | `pnpm -r test` gates the build; never publishes a broken image | ✓ |
| Build only | Faster, but a failing suite doesn't block `latest` | |

**User's choice:** Test then build

| Option | Description | Selected |
|--------|-------------|----------|
| Skip doc-only changes | `paths-ignore` for README/.planning/** avoids redundant rebuilds | ✓ |
| Run on every push | Simpler, but wastes CI minutes on doc commits | |

**User's choice:** Skip doc-only changes

| Option | Description | Selected |
|--------|-------------|----------|
| GitHub's default notification | No extra integration needed for solo dev | ✓ |
| You decide later | Leave notification wiring out of scope | |

**User's choice:** GitHub's default notification

---

## Port & Compose Ergonomics

| Option | Description | Selected |
|--------|-------------|----------|
| 3000:3000 | Matches server's existing PORT=3000 default | ✓ |
| 80:3000 | No-port-in-URL for kiosk bookmarks, needs elevated privilege on host | |

**User's choice:** 3000:3000

| Option | Description | Selected |
|--------|-------------|----------|
| Simple HTTP healthcheck | Lets Docker detect a hung (not just crashed) container and auto-restart | ✓ |
| No healthcheck | Simpler compose.yml, relies only on process-crash restarts | |

**User's choice:** Yes — simple HTTP healthcheck
**Notes:** No dedicated health endpoint currently exists in `apps/server/src/index.ts`; flagged in CONTEXT.md for research/planner to resolve (add a lightweight route, or reuse an existing cheap GET).

| Option | Description | Selected |
|--------|-------------|----------|
| Just the app container | Matches REQUIREMENTS.md's single-container scope; manual pull for updates | ✓ |
| You decide later | Leave open for a future auto-updater | |

**User's choice:** Just the app container

---

## README First-Run Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Copy-paste quickstart + brief var table | Numbered setup steps plus a one-line-per-var explanation | ✓ |
| Minimal — just the commands | Relies on `.env.example` comments to explain vars | |

**User's choice:** Copy-paste quickstart + brief var table

| Option | Description | Selected |
|--------|-------------|----------|
| Brief troubleshooting section | Covers `docker compose logs -f` plus 1-2 known failure modes from PITFALLS.md | ✓ |
| No troubleshooting section | Leaner README, troubleshooting stays in PITFALLS.md/commit history | |

**User's choice:** Brief troubleshooting section

| Option | Description | Selected |
|--------|-------------|----------|
| Short Updating section | Separate heading: pull + up -d, note that data persists | ✓ |
| Fold into setup section | Combine setup and update into one flow | |

**User's choice:** Short Updating section

---

## Claude's Discretion

None — every question had an explicit selection.

## Deferred Ideas

None — discussion stayed within phase scope.
