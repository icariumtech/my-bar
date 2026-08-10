---
phase: quick/260810-hmh-add-setup-sh-and-start-server-sh-scripts
plan: 1
subsystem: infra
tags: [shell-script, pnpm, developer-experience, deployment]

requires:
  - phase: 01-barback-inventory-foundation
    provides: pnpm monorepo (apps/server, apps/barback, packages/shared) with build/db:push/db:seed/start scripts already defined in package.json
provides:
  - setup.sh — one-time project setup (Node/pnpm version checks, pnpm install, pnpm build, db:push, optional db:seed)
  - start_server.sh — run-time launcher for the built app, LAN IP detection, prints Barback screen URLs for phone/iPad access
affects: [developer-experience, raspberry-pi-deployment]

actuals:
  tokens: 700
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Convenience shell scripts at repo root that only orchestrate existing package.json scripts — no logic duplicated between the scripts and pnpm workspace commands"
    - "LAN IP banner pattern (hostname -I | awk '{print $1}') mirrored from a sister project (janus-console) for consistent operator UX across the owner's self-hosted apps"

key-files:
  created:
    - setup.sh
    - start_server.sh
  modified: []

key-decisions:
  - "start_server.sh runs the compiled app via `pnpm --filter server start` (node dist/index.js), not `pnpm dev`/tsx watch — this script models running the deployed app on the LAN (e.g. the Raspberry Pi target from CLAUDE.md), not hot-reload development"
  - "Scripts only reference the /barback/ screen and PORT env var — Bartender and Patron screens don't exist yet (later phases), so no placeholder URLs for unbuilt screens"
  - "No .env handling ported from the janus-console reference — my-bar has no .env yet (ANTHROPIC_API_KEY is a later AI-integration phase, server-side only per CLAUDE.md); inventing one prematurely would be scope creep"

patterns-established:
  - "Root-level setup.sh / start_server.sh convenience pair for self-hosted LAN deployment, matching the UX pattern of the owner's other self-hosted project"

requirements-completed: []

coverage:
  - id: D1
    description: "setup.sh performs one-time project setup: Node/pnpm version checks (with corepack fallback), pnpm install, pnpm build, db:push, and an optional interactive db:seed prompt"
    requirement: null
    verification:
      - kind: unit
        ref: "bash -n setup.sh (syntax check), executable bit confirmed"
        status: pass
    human_judgment: true
    rationale: "A full end-to-end run (fresh clone, real pnpm install/build/db:push) needs a human to actually execute it once outside a worktree sandbox to confirm the real-world flow, per the plan's <verification> section."
  - id: D2
    description: "start_server.sh builds missing dist output if needed, detects the LAN IP, prints the Barback screen URL for phone/iPad access, and starts the compiled server"
    requirement: null
    verification:
      - kind: unit
        ref: "bash -n start_server.sh (syntax check), executable bit confirmed, negative-grep for premature /bartender//patron/ references (none found)"
        status: pass
    human_judgment: true
    rationale: "Confirming the printed LAN URL is actually reachable from a phone/iPad on the network requires a human on that network, per the plan's <verification> section."

duration: ~10min
completed: 2026-08-10
status: complete
---

# Quick Task 260810-hmh: Add setup.sh and start_server.sh scripts Summary

**Added two convenience shell scripts at the repo root — `setup.sh` for one-time project setup and `start_server.sh` to build-if-needed and launch the compiled app with a LAN-IP banner — modeled on the UX pattern of the owner's sister project (janus-console), adapted from Django/venv specifics to this project's pnpm/Fastify/SQLite stack.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- `setup.sh`: checks Node.js and pnpm are installed (installs pnpm via `corepack enable pnpm` if missing), runs `pnpm install`, `pnpm build` (builds `packages/shared` → `apps/server` → `apps/barback` via the workspace dependency graph), `pnpm --filter server db:push` to apply the DB schema, then interactively offers (`read -p`, skippable) to run `pnpm --filter server db:seed`. Uses `set -e` so it exits on the first failure. Ends with a "SETUP COMPLETE" banner pointing at `./start_server.sh`.
- `start_server.sh`: builds `apps/barback/dist` and/or `apps/server/dist` first if either is missing or empty, detects the LAN IP via `hostname -I | awk '{print $1}'`, prints both the localhost and network URLs for the Barback screen (`http://127.0.0.1:$PORT/barback/` and `http://$LOCAL_IP:$PORT/barback/`, calling out the network URL as the one to use from a phone/iPad), respects a `PORT` env var (default 3000), and starts the compiled server via `pnpm --filter server start`.
- Both scripts made executable (`chmod +x`) and verified with `bash -n` syntax checks.
- Neither script references `/bartender/` or `/patron/` — only the Barback screen exists in the codebase today (Phase 1 of 4).

## Task Commits

1. **Task 1: Add setup.sh for one-time project setup** - `f43a09a` (feat)
2. **Task 2: Add start_server.sh to run the built app** - `5f111fa` (feat)

**Plan metadata:** committed separately by the orchestrator (docs commit, not part of this SUMMARY's task commits).

## Files Created/Modified
- `setup.sh` (created) - One-time setup: version checks, install, build, db:push, optional seed
- `start_server.sh` (created) - Build-if-missing + start the compiled server with a LAN-IP access banner

## Decisions Made
- Ported the *pattern* of janus-console's scripts (version checks → install → build → DB setup → completion banner; LAN IP detection → banner → start server) rather than any Python/Django-specific logic (no venv, no `manage.py`, no `.env` copy step — none of those apply to this stack or exist yet in this project).
- `start_server.sh` deliberately runs the production build (`pnpm --filter server start`) rather than the `pnpm dev` hot-reload script, since its purpose is running the deployed app the way it would run on the target Raspberry Pi, not local development.

## Deviations from Plan

None - plan executed exactly as written by both tasks.

## Issues Encountered
- The executor agent that ran this task hit a session usage limit immediately after committing both tasks, before it could write this SUMMARY.md. The orchestrator (this session) inspected the completed worktree (both commits present, both files syntax-checked, executable, and free of premature Bartender/Patron references) and wrote this SUMMARY.md directly to close out the task — no code changes were needed or made.

## User Setup Required
- Run `./setup.sh` once after pulling this change to verify it against a real environment (the worktree sandbox only syntax-checked the scripts; it did not execute a live `pnpm install`/`build`/`db:push` run).
- Run `./start_server.sh` and confirm the printed network URL is actually reachable from a phone or iPad on the same LAN.

## Next Phase Readiness
- No blockers introduced. These are standalone operational scripts with no dependency on future phases; they'll keep working as-is once the Bartender and Patron screens exist (the LAN-IP/banner pattern in `start_server.sh` can be extended with additional URL lines when those screens ship, but that's out of scope for this task).

## Self-Check: PASSED
- FOUND: setup.sh (executable, syntax-valid)
- FOUND: start_server.sh (executable, syntax-valid)
- FOUND: f43a09a (commit exists in git log)
- FOUND: 5f111fa (commit exists in git log)
- FOUND: no /bartender/ or /patron/ references in either script

---
*Quick task: 260810-hmh-add-setup-sh-and-start-server-sh-scripts*
*Completed: 2026-08-10*
