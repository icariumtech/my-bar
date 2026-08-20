---
phase: 05-docker-containerization
reviewed: 2026-08-20T17:21:15Z
depth: quick
files_reviewed: 9
files_reviewed_list:
  - .dockerignore
  - .env.example
  - .github/workflows/docker-publish.yml
  - .gitignore
  - Dockerfile
  - README.md
  - apps/server/src/index.test.ts
  - apps/server/src/index.ts
  - compose.yml
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-08-20T17:21:15Z
**Depth:** quick
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed the Docker containerization phase: `Dockerfile`, `compose.yml`, the GitHub Actions publish workflow, the new `GET /health` route, `.env.example`/`.dockerignore`/`.gitignore`, and `README.md`. Pattern-matching for secrets, dangerous functions, debug artifacts, and empty catches across all changed files returned nothing — `.env.example` contains only a placeholder value, no `ANTHROPIC_API_KEY` (or any secret) is baked into the `Dockerfile` as `ARG`/`ENV`, and the GitHub Actions workflow does not interpolate any untrusted input (PR title/body, branch names, etc.) into a `run:` step, so there is no discovered injection vector there. Workflow permissions are least-privilege (top-level `contents: read`, `packages: write` scoped only to the publish job) and GHCR login/push are correctly gated to `push` events on `main`, matching the documented D-03/D-04 decisions.

No Critical findings. Four Warning-level robustness/hardening gaps and three Info-level notes were found — mainly around the container running as root, the Dockerfile having no self-contained `HEALTHCHECK`, the health endpoint being liveness-only, and the published image only ever existing under a mutable `:latest` tag.

## Warnings

### WR-01: Runtime container runs as root — no `USER` directive

**File:** `Dockerfile:44-59`
**Issue:** The `runtime` stage (`FROM node:22-slim AS runtime`) never switches off the default root user before `CMD ["node", "apps/server/dist/index.js"]` runs. The official `node:*-slim` images ship a built-in non-root `node` user (uid 1000) specifically for this purpose, but it's unused here — the Fastify server, and anything an attacker could get it to execute (e.g. via a future dependency RCE), runs as root inside the container.
**Fix:**
```dockerfile
FROM node:22-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app /app
RUN chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "apps/server/dist/index.js"]
```
Note: since `./data` is bind-mounted from the host (`compose.yml:15`), switching to `USER node` also requires the host `./data` directory to be writable by uid 1000, or an explicit `chown`/`chmod` step — verify this doesn't break the `better-sqlite3` write path before shipping.

### WR-02: No `HEALTHCHECK` instruction in the Dockerfile itself

**File:** `Dockerfile:44-59`
**Issue:** The only health check is defined in `compose.yml:16-30`. If the image is ever run outside this specific `compose.yml` (plain `docker run`, a different orchestrator, a future `docker stack deploy`, etc.), there is no health signal at all — `docker ps` will show the container as running even if the Fastify process has hung. Baking a `HEALTHCHECK` into the image itself makes the health contract travel with the image rather than living only in one consumer's compose file.
**Fix:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```
`compose.yml`'s existing `healthcheck:` block can stay as an override/documentation, but the image should be self-sufficient.

### WR-03: `/health` is liveness-only — cannot detect a hung or broken database

**File:** `apps/server/src/index.ts:35-37`
**Issue:** The handler returns a static `{ status: 'ok', timestamp }` without touching the database or any other dependency. `compose.yml:18-19`'s comment explicitly states the healthcheck exists so `restart: unless-stopped` "can recover from a hang, not just a crash" — but a hang in `better-sqlite3` (locked file, corrupted WAL, disk full on `./data`) would leave `/health` reporting `ok` indefinitely, since the route never reaches the DB layer. Given this project's stated core value ("the inventory must be the single source of truth"), a DB-level outage silently reporting healthy is a meaningful gap.
**Fix:**
```typescript
app.get('/health', async (_req, reply) => {
  try {
    db.prepare('SELECT 1').get() // cheap DB liveness probe
    return { status: 'ok', timestamp: new Date().toISOString() }
  } catch {
    reply.code(503)
    return { status: 'error', timestamp: new Date().toISOString() }
  }
})
```
Keep the response body minimal (no error messages/stack traces) to preserve the existing "never leak internals" comment at line 34.

### WR-04: Published image only ever exists under the mutable `:latest` tag

**File:** `.github/workflows/docker-publish.yml:79`
**Issue:** `tags: ghcr.io/icariumtech/my-bar:latest` is the only tag pushed. Every successful push to `main` overwrites the previous `:latest` reference in the registry — there is no immutable/versioned tag (git SHA, date, semver) retained. If a bad build passes CI (tests can pass while still shipping a runtime regression CI doesn't cover) and gets published, there is no way to `docker compose pull` back to the last known-good image; the only rollback path is rebuilding from an older git commit locally.
**Fix:**
```yaml
tags: |
  ghcr.io/icariumtech/my-bar:latest
  ghcr.io/icariumtech/my-bar:${{ github.sha }}
```
This costs nothing extra to publish and gives an explicit pinned reference for manual rollback (`docker compose pull ghcr.io/icariumtech/my-bar:<sha>`).

## Info

### IN-01: Test doesn't close the Fastify instance

**File:** `apps/server/src/index.test.ts:6-14`
**Issue:** `buildApp()` is called and injected against, but `app.close()` is never called. Fastify instances hold open resources (loggers, registered plugins/decorators); leaving them unclosed across a growing test suite is a minor hygiene gap and can produce vitest "did not exit" warnings as more suites accumulate.
**Fix:**
```typescript
it('returns 200 with status ok and a timestamp string', async () => {
  const app = buildApp()
  try {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ status: 'ok' })
    expect(typeof body.timestamp).toBe('string')
  } finally {
    await app.close()
  }
})
```

### IN-02: README asserts GHCR image is public without the workflow guaranteeing it

**File:** `README.md:22`
**Issue:** "the image is public on GHCR, so no `docker login` is needed for a first-time pull" is a documentation claim, not something `docker-publish.yml` enforces. GHCR package visibility is a separate, manually-configured setting in the package's own settings (Package settings → Change visibility) — it is not automatically inherited from the repo being public in all cases, and a brand-new package published via `GITHUB_TOKEN` can land as private depending on org/repo defaults. If that step is skipped, a first-time user's `docker compose pull` will fail with an authentication error, contradicting the Quickstart.
**Fix:** Either confirm and document the one-time manual step ("after first publish, go to the package settings on GHCR and set visibility to Public"), or add a workflow step / note verifying visibility so the README claim can't silently go stale.

### IN-03: `.dockerignore` test-file exclusion pattern is naming-convention-specific

**File:** `.dockerignore:13-14`
**Issue:** Only `**/*.test.ts` and `**/*.test.tsx` are excluded from the build context. If the project ever adopts `*.spec.ts`/`*.spec.tsx` naming (common with some test runners/generators) alongside or instead of `*.test.ts`, those files would silently get copied into the build context and, unless also excluded from the final `COPY --from=builder /app /app`, ship inside the runtime image. No such files exist today, so there is no active leak — this is a forward-looking maintenance trap.
**Fix:**
```
**/*.test.ts
**/*.test.tsx
**/*.spec.ts
**/*.spec.tsx
```

---

_Reviewed: 2026-08-20T17:21:15Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
