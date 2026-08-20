---
status: testing
phase: 05-docker-containerization
source: [05-VERIFICATION.md]
started: 2026-08-20T12:30:00Z
updated: 2026-08-20T12:30:00Z
---

## Current Test

number: 1
name: docker compose build && docker compose up -d
expected: |
  Single container named 'app' reaches 'healthy' state within 60 seconds,
  serving Patron/Bartender/Barback/API/Socket.IO on localhost:3000
awaiting: user response

## Tests

### 1. docker compose build && docker compose up -d
expected: Single container named 'app' reaches 'healthy' state within 60 seconds, serving Patron/Bartender/Barback/API/Socket.IO on localhost:3000
result: [pending]

### 2. curl http://localhost:3000/health
expected: Returns 200 with { status: 'ok', timestamp: '<ISO-8601-string>' }
result: [pending]

### 3. curl -s http://localhost:3000/patron/ http://localhost:3000/bartender/ http://localhost:3000/barback/
expected: All three screens return 200 and serve HTML from the built Vite SPA bundles
result: [pending]

### 4. curl -s http://localhost:3000/api/ingredients
expected: Returns 200 with a JSON array of ingredients
result: [pending]

### 5. Create a test category via POST to /api/categories, then docker compose down && docker compose up -d, then verify category persists via GET /api/categories
expected: Test data survives a full container recreate cycle
result: [pending]

### 6. docker run --rm ghcr.io/icariumtech/my-bar:latest printenv | grep ANTHROPIC_API_KEY
expected: Empty output (ANTHROPIC_API_KEY not present in baked environment)
result: [pending]

### 7. Watch GitHub Actions: push a commit to main and observe the workflow trigger
expected: docker-publish.yml's 'test' job runs first; once tests pass, 'build-and-push' job publishes to ghcr.io/icariumtech/my-bar:latest
result: [pending]

### 8. Create a pull request and observe the workflow
expected: docker-publish.yml's 'test' job runs; 'build-and-push' job builds but does not push/authenticate (no GHCR login step executes)
result: [pending]

### 9. On the Pi (or any deployment target), run: docker compose pull && docker compose up -d
expected: Container pulls the published image from ghcr.io and starts; all three screens are accessible at http://<pi-ip>:3000/patron/, etc.
result: [pending]

### 10. Verify README.md claim that the image is public on GHCR
expected: GHCR package settings show visibility set to Public; docker pull succeeds without authentication
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0
blocked: 0

## Gaps
