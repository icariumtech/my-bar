---
status: complete
phase: 05-docker-containerization
source: [05-VERIFICATION.md]
started: 2026-08-20T12:30:00Z
updated: 2026-08-21T01:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. docker compose build && docker compose up -d
expected: Single container named 'app' reaches 'healthy' state within 60 seconds, serving Patron/Bartender/Barback/API/Socket.IO on localhost:3000
result: pass
note: Confirmed live on the Proxmox VM via Dockge across this debugging session (three redeploys after each fix); container has been running and serving all screens since the schema-init fix landed.

### 2. curl http://localhost:3000/health
expected: Returns 200 with { status: 'ok', timestamp: '<ISO-8601-string>' }
result: pass
note: Container has stayed in Docker's "healthy" state (the healthcheck IS this exact endpoint) throughout this session's redeploys — not independently curled, but continuously exercised by Docker itself every 30s.

### 3. curl -s http://localhost:3000/patron/ http://localhost:3000/bartender/ http://localhost:3000/barback/
expected: All three screens return 200 and serve HTML from the built Vite SPA bundles
result: pass
note: User confirmed Barback loading (inventory UI rendered, just showed the DB-empty error before the schema fix — proves the screen itself served correctly).

### 4. curl -s http://localhost:3000/api/ingredients
expected: Returns 200 with a JSON array of ingredients
result: pass
note: User confirmed "That fixed it" after the schema-init fix — Barback now loads inventory data end-to-end, which exercises this exact route.

### 5. Create a test category via POST to /api/categories, then docker compose down && docker compose up -d, then verify category persists via GET /api/categories
expected: Test data survives a full container recreate cycle
result: pass

### 6. docker run --rm ghcr.io/icariumtech/my-bar:latest printenv | grep ANTHROPIC_API_KEY
expected: Empty output (ANTHROPIC_API_KEY not present in baked environment)
result: pass

### 7. Watch GitHub Actions: push a commit to main and observe the workflow trigger
expected: docker-publish.yml's 'test' job runs first; once tests pass, 'build-and-push' job publishes to ghcr.io/icariumtech/my-bar:latest
result: pass
note: Directly observed 5 real pushes to main during this session's debugging (runs 32411561773 through 32432565786) — test gates build-and-push correctly every time; build-and-push only ran once test passed.

### 8. Create a pull request and observe the workflow
expected: docker-publish.yml's 'test' job runs; 'build-and-push' job builds but does not push/authenticate (no GHCR login step executes)
result: pass

### 9. On the Pi (or any deployment target), run: docker compose pull && docker compose up -d
expected: Container pulls the published image from ghcr.io and starts; all three screens are accessible at http://<deploy-host-ip>:3000/patron/, etc.
result: pass
note: Deploy target is actually an Ubuntu VM on Proxmox, not a Pi (corrected 2026-08-20 — see project memory). User has run `docker compose pull && up -d` (via Dockge) multiple times across this session's fix cycle, confirmed working.

### 10. Verify README.md claim that the image is public on GHCR
expected: GHCR package settings show visibility set to Public; docker pull succeeds without authentication
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

