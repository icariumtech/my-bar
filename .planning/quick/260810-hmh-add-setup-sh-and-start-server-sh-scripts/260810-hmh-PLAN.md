---
phase: quick/260810-hmh-add-setup-sh-and-start-server-sh-scripts
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - setup.sh
  - start_server.sh
autonomous: true
requirements: []

must_haves:
  truths:
    - "Running ./setup.sh on a fresh clone checks for Node.js and pnpm (installing pnpm via corepack if missing), installs dependencies, builds all workspace packages, applies the database schema, offers an interactive optional seed step, and ends with a SETUP COMPLETE banner pointing at ./start_server.sh"
    - "Running ./start_server.sh builds the Barback SPA and/or server first only if their dist output is missing, then starts the compiled server (not the dev/hot-reload server) and prints both a localhost URL and a LAN URL for the Barback screen before it starts listening"
    - "Neither script references a route for a screen that does not exist yet — only /barback/ and existing pnpm scripts are referenced"
    - "Both scripts are executable (chmod +x) and setup.sh exits non-zero (set -e) on any failed step"
  artifacts:
    - "setup.sh — new file at repo root"
    - "start_server.sh — new file at repo root"
  key_links:
    - "setup.sh -> pnpm --filter server db:push (applies Drizzle schema to ./data/my-bar.db)"
    - "start_server.sh -> pnpm --filter server start (runs compiled apps/server/dist/index.js, already bound to 0.0.0.0 and reading PORT from env)"
---

<objective>
Add two convenience shell scripts at the my-bar repo root — `setup.sh` (one-time, run after
cloning) and `start_server.sh` (every run) — modeled on the UX pattern of the owner's sister
project janus-console's scripts, but adapted to my-bar's actual stack (pnpm workspaces,
Fastify + better-sqlite3 + Drizzle, Vite/React Barback SPA). Translate the *pattern* only:
banner-style output, version checks, "build if missing" guards, LAN-IP-detection banner —
not any Python/Django-specific step (no venv, no `.env` copy, no `manage.py`).

Purpose: today the only way to get this project running is to know the exact sequence of
`pnpm` filter commands (install, build, db:push, start) and to know that the server binds
`0.0.0.0:3000` and serves the Barback SPA under `/barback/`. These scripts turn that tribal
knowledge into two commands (`./setup.sh` once, `./start_server.sh` every session) that also
print the LAN URL the owner's phone/iPad actually needs, matching this project's kiosk/LAN
access model from CLAUDE.md.

Output: `setup.sh` and `start_server.sh`, both executable, at the repo root. No other files
are touched.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.claude/CLAUDE.md
@package.json
@apps/server/package.json
@apps/barback/package.json
@apps/server/src/index.ts
@/home/gjohnson/src/janus-console/setup.sh
@/home/gjohnson/src/janus-console/start_server.sh
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create setup.sh (one-time project setup)</name>
  <files>setup.sh</files>
  <action>
Create a new file `setup.sh` at the repo root. Start with a `#!/bin/bash` shebang, a two-line
header comment (`# My Bar - Setup Script` and `# Run this script once after cloning the
repository`), then `set -e` on its own line so the script exits on any failed step, matching
janus-console's `setup.sh` pattern — but do not port any Python/Django-specific step (no venv
creation, no `requirements.txt`, no `.env`/`SECRET_KEY` generation, no `manage.py migrate`
or `createsuperuser`) — none of that applies to this Node/pnpm stack, and no `.env` file
exists in this project yet.

Print an opening banner: three `echo` lines reading `========================================`,
`MY BAR SETUP`, `========================================`, then a blank `echo`.

Version checks, in order: (1) echo `Checking Node.js version...`; guard with
`if ! command -v node &> /dev/null; then` printing `ERROR: Node.js is not installed!` and
`Please install Node.js 22 or higher`, then `exit 1`; `fi`. After the guard, capture
`NODE_VERSION=$(node --version)` and echo `Found Node.js $NODE_VERSION`, then a blank echo.
(2) echo `Checking pnpm...`; guard `if ! command -v pnpm &> /dev/null; then` printing
`pnpm not found — installing via corepack...` and running `corepack enable pnpm`; `fi`.
After the guard, capture `PNPM_VERSION=$(pnpm --version)` and echo `Found pnpm $PNPM_VERSION`,
then a blank echo.

Step 1/4 — install: echo `Step 1/4: Installing dependencies...`; run `pnpm install`; echo
`✓ Dependencies installed`; blank echo.

Step 2/4 — build: echo `Step 2/4: Building shared package, server, and Barback app...`; run
the root `pnpm build` script (this is `pnpm -r build`, which pnpm already runs in
workspace-topological order — `packages/shared` builds before `apps/server`/`apps/barback`
consume it — so there is no need to call each `--filter` separately); echo
`✓ Build complete`; blank echo.

Step 3/4 — DB schema: echo `Step 3/4: Applying database schema...`; run
`pnpm --filter server db:push`; echo `✓ Database schema applied`; blank echo. No manual data
directory creation is needed — `apps/server/drizzle.config.ts` and the app's own startup code
already create `./data` if it's missing.

Step 4/4 — optional seed, interactive: echo `Step 4/4: Example data seed (optional)...`; then
`read -p "Seed the database with example ingredients/categories? [y/N] " -n 1 -r` followed by
a bare `echo` to move off the prompt line; then
`if [[ $REPLY =~ ^[Yy]$ ]]; then` run `pnpm --filter server db:seed` and echo
`✓ Example data seeded`; `else` echo
`Skipped seeding — run 'pnpm --filter server db:seed' later if you want it`; `fi`. Declining
must be a normal path — the `else` branch must not call `exit`. Blank echo after the `fi`.

Close with a completion banner: `========================================`,
`SETUP COMPLETE!`, `========================================`, blank echo, `Next steps:`,
blank echo, `1. Start the server:`, `   ./start_server.sh`, blank echo,
`2. Access the Barback screen from this machine or any device on the LAN`,
`   (start_server.sh prints the exact URLs)`, trailing blank echo.

After writing the file, run `chmod +x setup.sh` so it is directly executable. This script
must not reference a route for any screen beyond Barback — the other two planned screens
don't exist yet in this project.
  </action>
  <verify>
    <automated>bash -n setup.sh && test -x setup.sh</automated>
  </verify>
  <done>
`setup.sh` exists at the repo root, is executable, passes `bash -n` syntax validation, and
implements all four numbered steps (install, build, db:push, optional interactive seed) plus
the Node/pnpm version checks and corepack fallback, using `set -e` and ending in a
SETUP COMPLETE banner that points at `./start_server.sh`. No `.env`, venv, or Django-specific
step was ported from the janus-console reference.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create start_server.sh (run the built app)</name>
  <files>start_server.sh</files>
  <action>
Create a new file `start_server.sh` at the repo root. Start with a `#!/bin/bash` shebang and a
one-line header comment `# My Bar - Start Server Script`. Do not add `set -e` here — match
janus-console's `start_server.sh`, which relies on explicit conditional guards (below) rather
than exit-on-any-error, since this script's job is to build-if-missing then hand off to the
long-running server process.

Print an opening banner: `================================`, `MY BAR`,
`================================`, then a blank `echo`.

Immediately after the banner, set `PORT="${PORT:-3000}"` and `export PORT`, so the printed
URLs below and the server process launched at the end of the script agree on the same port —
`apps/server/src/index.ts` already reads `process.env.PORT` (falling back to 3000) and binds
to host `0.0.0.0`.

Guard 1 — build the Barback SPA if its output is missing or empty: test with
`if [ ! -d "apps/barback/dist" ] || [ -z "$(ls -A apps/barback/dist 2>/dev/null)" ]; then`,
echo `Barback app not built yet (first run, or dist was cleaned) — building...`, run
`pnpm --filter barback build`, echo `✓ Barback app built`, blank echo, `fi`.

Guard 2 — build the server if its output is missing: test with
`if [ ! -d "apps/server/dist" ]; then`, echo `Server not built yet — building...`, run
`pnpm --filter server build`, echo `✓ Server built`, blank echo, `fi`.

Echo `Starting server...`, echo `Detecting network configuration...`, blank echo.

Detect the LAN IP the same way as the janus-console reference (Linux-only — acceptable since
this project targets a Raspberry Pi deployment per project CLAUDE.md, matching the
reference's same non-portability):
`LOCAL_IP=$(hostname -I | awk '{print $1}')`.

Print the access banner: echo `Server will be accessible at:`; echo
`  Local:   http://127.0.0.1:$PORT/barback/`; echo
`  Network: http://$LOCAL_IP:$PORT/barback/   <- use this from a phone or iPad on the same LAN`;
blank echo; echo `Press Ctrl+C to stop the server`; blank echo. This script must not print or
reference a route for any screen beyond Barback — the other two planned screens don't exist
yet in this project.

End the script with `pnpm --filter server start` as the final line (this runs the compiled
`node dist/index.js`, NOT the `dev`/`tsx watch` path — this script runs the built app, not a
hot-reload dev server). Since `PORT` was exported above, the server process picks it up
automatically.

After writing the file, run `chmod +x start_server.sh` so it is directly executable.
  </action>
  <verify>
    <automated>bash -n start_server.sh && test -x start_server.sh && ! grep -Eq '/bartender/|/patron/' start_server.sh</automated>
  </verify>
  <done>
`start_server.sh` exists at the repo root, is executable, passes `bash -n` syntax validation,
conditionally builds the Barback SPA and/or server only when their `dist` output is missing,
detects and prints both a `127.0.0.1` and a LAN URL under `/barback/` reflecting the `PORT`
env var (default 3000), and starts the compiled server via `pnpm --filter server start`. No
route for a screen other than Barback appears anywhere in the file.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Developer's local shell running `./setup.sh` / `./start_server.sh` | Both scripts are thin wrappers that only invoke existing, already-reviewed project scripts (`pnpm install`, `pnpm build`, `pnpm --filter server db:push`, `pnpm --filter server start`) and standard shell builtins (`hostname -I`, `read -p`). No new trust boundary, network listener, or code path is introduced beyond what `apps/server/src/index.ts` already exposes on the LAN. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-Q260810hmh-01 | Tampering | `corepack enable pnpm` fallback in setup.sh | low | accept | Corepack fetches pnpm from the same npm-registry trust chain every other project dependency already comes from; this mirrors janus-console's identical existing fallback and introduces no new install source. |
| T-Q260810hmh-02 | Information Disclosure | LAN IP printed in start_server.sh's banner | low | accept | Printing the LAN IP to the operator's own terminal is the intended behavior per CLAUDE.md's "no auth, LAN-only" access model — the server already binds `0.0.0.0` unconditionally in `apps/server/src/index.ts`; the banner only tells the operator the address other devices on the same LAN already reach it at, and reveals nothing that a `hostname -I` run by that same operator wouldn't. |
</threat_model>

<verification>
Run `bash -n setup.sh && bash -n start_server.sh` from the repo root (both must exit 0), and
`test -x setup.sh && test -x start_server.sh` (both must be executable). Optionally, run
`./setup.sh` once on a clean checkout and confirm it completes through the SETUP COMPLETE
banner, then run `./start_server.sh` and confirm it prints a `127.0.0.1` and a LAN URL under
`/barback/` before starting the server (manual — not required for automated pass/fail).
</verification>

<success_criteria>
- `setup.sh` and `start_server.sh` exist at the repo root, both executable, both pass `bash -n`.
- `setup.sh` covers: Node/pnpm version checks with corepack fallback, `pnpm install`,
  `pnpm build`, `pnpm --filter server db:push`, an interactive optional
  `pnpm --filter server db:seed`, and a SETUP COMPLETE banner — using `set -e`.
- `start_server.sh` builds Barback/server dist output only if missing, detects the LAN IP via
  `hostname -I | awk '{print $1}'`, prints local + network `/barback/` URLs honoring `PORT`,
  and starts the compiled server via `pnpm --filter server start` (not the dev server).
- Neither script references any route beyond `/barback/`.
- No other files are modified; no `.env` step is invented; no Python/Django-specific logic is
  ported from the janus-console reference scripts.
</success_criteria>

<output>
Create `.planning/quick/260810-hmh-add-setup-sh-and-start-server-sh-scripts/260810-hmh-SUMMARY.md` when done.
</output>
