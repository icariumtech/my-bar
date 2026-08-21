---
phase: 5
slug: docker-containerization
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-21
---

# Phase 5 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| GitHub build context → image layers | The Docker build context is the whole repo tree; a missing `.dockerignore` entry could bake a secret file into a published layer | Source files, potentially `.env` |
| Public GHCR image → anyone with `docker pull` | Per D-01 the published image is public — anyone on the internet can pull and inspect its layers/binaries | Application code, compiled frontend bundles |
| Host filesystem `./data` ↔ container `/app/data` | The bind mount gives the container write access to a host directory | SQLite database (inventory/recipe data) |
| GitHub Actions runner → GHCR | The CI workflow authenticates and pushes a public image; if the push step ran on untrusted input (a fork PR), an attacker could get a malicious image published as `:latest` | GITHUB_TOKEN (scoped), image layers |
| `pull_request` trigger → forked PRs | A PR from a fork triggers the `test`/build jobs against untrusted code | Untrusted source code |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01 | Information Disclosure | Dockerfile / .dockerignore | high | mitigate | `.dockerignore` excludes `.env` (never `COPY`'d); `ANTHROPIC_API_KEY` reaches the container only via compose's `env_file: .env` at runtime, never as a Dockerfile `ENV`/`ARG` baked into a layer. Verified: no `ENV`/`ARG ANTHROPIC_API_KEY` in Dockerfile (code review 05-REVIEW.md); `docker run --rm ghcr.io/icariumtech/my-bar:latest printenv \| grep ANTHROPIC_API_KEY` returns empty (UAT Test 6, passed 2026-08-21 against the real published image). | closed |
| T-05-03 | Tampering | GHCR image / CI publish pipeline | high | mitigate | Top-level workflow `permissions: contents: read`; `build-and-push` job additionally scopes only `packages: write` (never `write-all`); GHCR login and the `push:` input on `docker/build-push-action` are both gated on `github.event_name == 'push' && github.ref == 'refs/heads/main'`, so a `pull_request` event (including from a fork, which GitHub already runs with a read-only `GITHUB_TOKEN`) can never publish. Verified: a real PR against this repo ran `test` + `build-and-push` build-only, no GHCR login step executed (UAT Test 8, passed 2026-08-21). | closed |
| T-05-04 | Elevation of Privilege / Tampering | Host `./data` bind mount | medium | accept | Container runs as root (base image default) inside a single-container, no-multi-tenant, LAN-only deployment matching the project's existing no-auth trust model (CLAUDE.md) — same risk profile already accepted for the non-Docker deployment. | closed |
| T-05-05 | Information Disclosure | Public GHCR image (D-01) | low | accept | Image contains only application code and compiled frontend bundles, no secrets or user data (see T-05-01's mitigation) — public visibility is an explicit, intentional decision (D-01) for a home-hobby project. Verified public via UAT Test 10. | closed |
| T-05-SC | Tampering | npm/pnpm dependency installs | low | accept | Dockerfile/compose reuse only already-locked dependencies from `pnpm-lock.yaml`; `pnpm install --frozen-lockfile` prevents silent dependency substitution during the image build. The one exception — `drizzle-kit` installed globally via `npm install -g drizzle-kit@0.31.10` for the schema-auto-init entrypoint (added post-plan-time during live-deployment debugging) — is version-pinned to match `apps/server/package.json`'s locked devDependency, keeping the same supply-chain posture. | closed |
| T-05-06 | Denial of Service | `restart: unless-stopped` + no alerting | low | accept | A crash-looping container restarts indefinitely without alerting; acceptable for a single-owner home deployment where README's Troubleshooting section (`docker compose logs -f`) is the expected debugging path — no additional alerting infrastructure is in scope (D-06). | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-05-01 | T-05-04 | Root container process, no chown coordination added — disproportionate complexity for a single-owner LAN-only deployment; matches project's existing no-auth trust model | Gabe Johnson | 2026-08-21 |
| R-05-02 | T-05-05 | Public GHCR image is an explicit locked decision (D-01); image contains no secrets or user data | Gabe Johnson | 2026-08-21 |
| R-05-03 | T-05-SC | No new npm packages beyond version-pinned drizzle-kit CLI; frozen-lockfile install elsewhere | Gabe Johnson | 2026-08-21 |
| R-05-04 | T-05-06 | No alerting infra in scope for a hobby single-owner deployment (D-06); `docker compose logs -f` is the documented debugging path | Gabe Johnson | 2026-08-21 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-21 | 6 | 6 | 0 | Claude (orchestrator, short-circuit: register authored at plan time, threats_open: 0, ASVS L1 — mitigate-disposition evidence directly confirmed via UAT Tests 6 and 8 against the real deployed image/pipeline) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-21
