# Project Research Summary

**Project:** My Bar
**Domain:** Home bar management and ordering system — self-hosted, local-network, multi-interface, real-time inventory, AI-assisted
**Researched:** 2026-08-20 (v1.1 milestone: Docker, AI Bottle Photo Recognition, MCP Server)
**Confidence:** HIGH (stack and patterns) / MEDIUM-HIGH (feature scope) / MEDIUM (Docker/MCP pitfalls need hands-on validation)

---

## Executive Summary

v1.0 shipped the core three-interface system (Patron ordering kiosk, Bartender recipe/queue console, Barback mobile inventory) unified by a single source-of-truth Fastify REST API and real-time sync via Socket.IO. v1.1 adds three features that all deliberately preserve that single-source-of-truth guarantee: Docker containerization for real deployment, AI bottle photo recognition (Claude Vision) replacing UPC scanning, and an MCP server so recipes/inventory can be managed via chat.

**Recommended approach:** All three v1.1 features are additive and delegate to the existing Fastify REST API rather than introducing new data paths. Docker containerization is pure packaging (multi-stage Dockerfile + compose.yml, no app code changes). AI bottle recognition adds one new endpoint using the same Claude Vision + Zod structured-output pattern already planned for AI recipe-photo import. The MCP server is a new, mostly-standalone process that calls the existing REST API — never the database directly — preserving the "REST is truth" architecture that makes the makeable-status guarantee trustworthy.

**Key risks & mitigations:**
- **better-sqlite3 native bindings on ARM64 in Docker:** pnpm 10+ blocks postinstall scripts by default, and Pi may lack prebuilt ARM64 binaries — enable build-from-source in `.npmrc`, include build tools in the Docker image, and test on real Pi hardware before shipping.
- **SQLite WAL corruption with Docker bind mounts:** mount the entire `data/` directory (not just the `.db` file) so `.db-shm`/`.db-wal` live on the same persistent volume; avoid network filesystems.
- **Claude Vision hallucination on bottle photos:** never auto-save — always show the extracted data for review/confirmation before writing, with a confidence signal and manual-entry fallback.
- **MCP schema mismatch / unauthenticated write access:** validate every recipe/ingredient write against the live database (exact category/ingredient list), and keep the MCP server LAN-only per this project's existing no-auth trust model — document that boundary rather than trying to bolt on auth.

---

## Key Findings

### Stack Additions for v1.1

- **Docker base image: `node:22-slim`** — official ARM64-native image, matches the existing Node 22 stack, small footprint. Use the *same* image for the build and runtime stages to avoid libc mismatches between build-time and run-time native bindings.
- **better-sqlite3 on ARM64:** must compile its native `.node` binding **inside** the container for the target architecture — never copy a host-built `node_modules` in. Enable pnpm's `postinstall` scripts (blocked by default in pnpm 10+) via `.npmrc`, and include a build toolchain (or verify a prebuilt ARM64 binary exists for the pinned better-sqlite3 version) in the image.
- **Claude Vision model: Sonnet 5** for bottle-photo → structured-JSON extraction — meaningfully more visual tokens/reliability than Haiku for this kind of multi-label recognition task, at negligible cost for this project's volume (≈$0.001/extraction). `messages.parse()` + Zod works identically for vision input as for text input — no new SDK pattern needed. Haiku 4.5 is a viable cheaper fallback if real-world accuracy testing shows it's sufficient.
- **MCP TypeScript SDK: `@modelcontextprotocol/sdk` v1.30.0 (stable)** — v2 is beta/pre-GA, stick with v1 for now. **Transport: stdio** for the primary use case (Claude Code invoking it locally/via SSH) — simplest, no auth/TLS surface to manage. HTTP/SSE transport is only worth adding later if a second, non-Claude-Code MCP client needs LAN-wide access.

### Feature Scope for v1.1

**Docker Containerization**
- Table stakes: multi-stage Dockerfile, `compose.yml`, persistent SQLite storage via bind mount, `restart: unless-stopped`.
- Deliberately out of scope for this project's scale: TLS/reverse proxy, splitting into multiple containers, Kubernetes, multi-arch CI publishing, secrets baked into the image. (Matches the already-decided "same repo, no split deploy repo, no CI image publish" call made earlier in this milestone's planning.)
- Rough complexity: small — this is packaging, not new functionality.

**AI Bottle Photo Recognition**
- Table stakes: camera capture from the Barback client, a server-side Claude Vision call with structured output, a review-before-save step showing the extracted data in the add-ingredient form, and a manual-entry fallback if recognition fails or confidence is low.
- Worth adding: a confidence signal and a "retry photo" affordance so a bad photo doesn't dead-end the flow into manual entry immediately.
- Explicitly not needed: barcode/UPC handling of any kind (superseded), or any attempt to identify exact fill level/proof from the photo — name, category, and other clearly visible label details are enough to prefill the form.

**MCP Server**
- Table stakes: recipe creation from a link/pasted text/video description, and ingredient/category add-edit tools — all going through the existing REST API, with a confirmation step before any write that a human should see (matches this project's existing "review before save" pattern from AI recipe-photo import).
- Worth deferring past the first MCP pass: URL-scraping robustness for arbitrary recipe sites and YouTube transcript extraction are genuinely variable in reliability — start with "paste the text/description yourself, or give me a link and I'll try to fetch it" rather than building a bespoke scraper up front.
- Architecture: standalone Node process (new workspace, e.g. `apps/mcp`), stdio transport, zero direct database access — every tool call goes through `/api/recipes`, `/api/ingredients`, `/api/categories`, `/api/glassware`.

### Architecture Integration

All three features integrate without touching the "REST is truth" architecture:

- **Docker** is pure packaging: a multi-stage build that installs the pnpm workspace once, builds `packages/shared` then all three Vite SPAs then the server, and produces one runtime image that serves everything exactly as the Fastify process already does locally (static bundles + API + Socket.IO, no reverse proxy). No app-code changes required.
- **AI bottle recognition** adds one new Fastify route (e.g. `POST /api/ingredients/recognize-photo`) that accepts an image from the Barback client, calls Claude server-side (the API key never reaches the browser, consistent with this project's existing constraint), and returns structured data for the client to prefill. This is the same Claude Vision + Zod pattern the already-planned AI recipe-photo-import feature will use — worth building the extraction helper once and reusing it for both.
- **MCP server** is a stateless protocol translator: a new workspace that implements MCP tools which call the existing REST endpoints and return their results. No new business logic, no direct database access — mirrors janus-console's `mcp_server.py` pattern (a standalone process delegating everything to the main app's REST API), but in TypeScript to match this project's stack.

**Suggested build order within v1.1:** AI bottle recognition first (establishes the shared Claude Vision + Zod extraction pattern, no dependency on the other two), then the MCP server (can reuse that pattern for recipe extraction from text/links), then Docker last (pure packaging of whatever exists at that point — no reason to containerize before the other two features are done).

### Critical Pitfalls

1. **better-sqlite3 native bindings not compiled for the container's architecture (Docker).** pnpm 10+ blocks postinstall scripts by default, so the native `.node` binding may never get built inside the image. Enable postinstall scripts explicitly, include build tools in the Dockerfile, and test the actual built image on ARM64 (real Pi hardware or `docker buildx --platform linux/arm64`) before considering this done — don't assume x86 dev-machine success carries over.
2. **SQLite WAL file corruption from a partial bind mount (Docker).** WAL mode uses sidecar `.db-shm`/`.db-wal` files for coordination; mounting only the `.db` file (not the whole `data/` directory) leaves those sidecars in the container's ephemeral layer, risking corruption on restart. Mount the entire data directory as one volume, and avoid network filesystems (NFS/CIFS) for the mount target.
3. **Claude Vision rejects HEIC (iPhone default photo format) and can mis-orient converted images.** If the Barback client is used from an iPhone, photos may arrive as HEIC (unsupported by Claude Vision, which wants JPEG/PNG/GIF/WebP) or lose correct EXIF rotation on conversion. Convert client-side to JPEG with rotation preserved before upload.
4. **Confident hallucination on bottle identification.** Claude can return a plausible-looking but wrong bottle identification with no explicit uncertainty flag. The review-before-save gate already planned for this feature is the correct mitigation — treat it as non-negotiable, not a nice-to-have.
5. **MCP schema mismatch between unstructured recipe input and the app's structured schema.** Real-world recipes/videos describe ingredients in free text; the app requires referential integrity (ingredient/category IDs that actually exist). Validate every MCP-driven recipe creation against the live ingredient/category list before writing, and confirm with the user rather than silently creating orphaned or mismatched references.
6. **Unauthenticated MCP write access with no guardrails.** This project's no-auth model is an accepted, deliberate constraint (LAN-only, trusted users) — but a write-capable MCP tool with no rate limiting or audit trail could still let a misfiring agent loop and create many duplicate/bad records. A lightweight safeguard (confirm-before-write, and/or a simple rate limit) is worth including even without full authentication.

---

## Implications for Roadmap

The three already-drafted phases (5: Docker, 6: AI Bottle Photo Recognition, 7: MCP Server) map cleanly onto this research, with one adjustment worth considering: **build order**. The roadmap currently sequences Docker (5) → AI Bottle Recognition (6) → MCP Server (7), but this research suggests AI Bottle Recognition and MCP Server share a Claude Vision/structured-extraction pattern worth building once, and neither depends on Docker at all — Docker only depends on whatever code exists being ready to package. Consider building AI Bottle Recognition and/or MCP Server before Docker, or explicitly building the shared "Claude structured-extraction" helper as part of whichever ships first so the other can reuse it.

**Suggested phase-level flags for planning:**
- **Docker phase:** flag ARM64/Pi-hardware validation as a required verification step, not just a "should work" assumption — better-sqlite3 native bindings and WAL-on-bind-mount are both real, documented failure modes at this exact intersection (Node + SQLite + ARM64 + Docker).
- **AI Bottle Recognition phase:** require the review-before-save UI as a hard requirement, not a stretch goal — confident hallucination is a documented Claude Vision failure mode, not a hypothetical.
- **MCP Server phase:** require validation-against-live-data before any write, and decide explicitly whether a lightweight rate limit or confirmation step is in scope for v1.1 or deferred.

**Genuinely open questions to resolve during requirements/planning (not answerable from research alone):**
- Real-world Claude Vision accuracy on actual bottle photos (label wear, backlighting, generic/house-brand bottles) — no substitute for testing on real bottles once built.
- Whether "send a link" for MCP recipe creation should attempt to fetch/parse the URL server-side, or simply ask the user to paste the relevant text — research suggests starting simple (paste text) and treating URL-fetching as a stretch goal, not a hard requirement.

---

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| Stack | HIGH | Version-pinned choices cross-checked against npm registry and official docs |
| Features | MEDIUM-HIGH | Scope and complexity estimates reasonable, but real-world accuracy (Vision) and reliability (MCP over home network) are untested |
| Architecture | HIGH | All three features slot into the existing "REST is truth" pattern with no structural changes |
| Pitfalls | MEDIUM | SQLite/Docker interaction risks are well-documented; Claude Vision and MCP-specific pitfalls are directionally correct but benefit from hands-on validation during implementation |

---

## Sources

- npm registry (`@modelcontextprotocol/sdk` version history), Docker Hub (`node:22-slim`, ARM64 image tags)
- Anthropic Platform Docs — structured outputs (`messages.parse()` + Zod), Vision API, current model recommendations
- Official SQLite documentation on WAL mode and known corruption modes (partial bind mounts, network filesystems)
- GitHub issues — better-sqlite3 native binding builds under pnpm 10+ postinstall restrictions, ARM64 compilation
- janus-console (`mcp_server.py`) and janus-deploy (`compose.yml`) — sibling-project reference patterns for MCP server delegation and Docker Compose homelab deployment, already reviewed directly in this project's own repo tree
