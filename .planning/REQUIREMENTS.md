# Requirements: My Bar

**Defined:** 2026-08-20
**Core Value:** The inventory must be the single source of truth: at any moment, the Patron and Bartender screens must correctly show which drinks are makeable right now, and which are missing ingredients.

## v1.1 Requirements

Requirements for the v1.1 milestone (Docker deployment, AI bottle photo recognition, MCP server). Each maps to roadmap phases.

### Docker Containerization

- [x] **DOCK-01**: The full stack (Fastify server + all three built frontend bundles) builds into a single Docker image via a multi-stage Dockerfile (`node:22-slim` for both build and runtime stages, matching janus-console's pattern — no ARM-specific handling needed)
- [x] **DOCK-02**: A `compose.yml` defines the service (port mapping, `restart: unless-stopped`, environment variables including `ANTHROPIC_API_KEY` and `DB_PATH`)
- [x] **DOCK-03**: The SQLite database persists across container restarts and image updates via a bind-mounted host directory (`./data` → `/app/data`, not a single `.db` file), matching `apps/server/src/db/client.ts`'s existing `DB_PATH` env var support and avoiding WAL sidecar-file corruption
- [x] **DOCK-04**: `.env.example` documents required and optional environment variables
- [x] **DOCK-05**: README documents first-time setup (`docker compose pull && docker compose up -d`) and update steps
- [x] **DOCK-06**: A GitHub Actions workflow builds the Docker image on every push/PR and pushes it to GHCR (`ghcr.io/icariumtech/my-bar`) on pushes to main, mirroring janus-console's `docker-publish.yml` — `compose.yml` pulls the published image rather than building on-device

### AI Bottle Photo Recognition

- [ ] **BOTTLE-01**: Owner can take or upload a bottle photo from the Barback add-ingredient flow
- [ ] **BOTTLE-02**: A server-side endpoint sends the photo to Claude Vision (Sonnet 5) and returns structured data (name, category, and other identifiable label details) via a Zod-validated schema — the Claude API key never reaches the browser
- [ ] **BOTTLE-03**: Extracted data prefills the add-ingredient form for review/edit before saving — the app never auto-saves an AI-extracted result
- [ ] **BOTTLE-04**: If recognition fails, is low-confidence, or the photo is unusable, the owner can fall back to manual entry without losing form progress
- [ ] **BOTTLE-05**: HEIC photos (the iPhone camera default) are converted client-side to a Claude-Vision-compatible format (JPEG) with correct EXIF orientation preserved before upload

### MCP Server

- [ ] **MCP-01**: A standalone MCP server (new workspace, TypeScript SDK) exposes tools that call the existing Fastify REST API only — no direct database access
- [ ] **MCP-02**: A tool creates a recipe from a URL, a video link, or pasted text — Claude extracts structured recipe data (name, ingredients with quantity/unit/category, method, glassware, garnish) for confirmation before the MCP server writes it via the recipes API
- [ ] **MCP-03**: Tools add and edit ingredients and categories via chat, delegating to the existing ingredients/categories API
- [ ] **MCP-04**: Tools list and query current recipes and inventory (including live makeable status) for context
- [ ] **MCP-05**: Destructive operations (deleting a recipe or ingredient) require explicit confirmation before executing
- [ ] **MCP-06**: The server runs over stdio transport for local Claude Code invocation, unauthenticated — matches the rest of the app's LAN-only, no-auth trust model

## v2 Requirements

Deferred to a future milestone.

### AI Features (from v1.0's original backlog, still not built)

- **AI-01**: When a patron's desired drink can't be made, AI suggests a makeable alternative from current stock
- **AI-02**: When a recipe is missing an ingredient, AI suggests a flavor-appropriate substitution from current stock
- **AI-03**: Owner can photograph or screenshot a recipe; AI extracts structured recipe data (name, ingredients, method, glass, garnish) for review and confirmation before saving

### Future Consideration

- **STOCK-01**: Coarse fractional stock level (full/¾/½/¼/empty) per ingredient, decoupled from makeable-check logic
- **STOCK-02**: Auto-generated low-stock shopping list based on fractional stock levels
- **PATR-09**: Flavor-profile tag browsing/filtering on the Patron screen
- **MCP-07**: Natural-language recipe search via MCP ("show me recipes with gin")
- **MCP-08**: Substitution suggestions via MCP ("I don't have tequila for the Margarita")
- **BOTTLE-06**: Retake-photo flow without losing form context
- **BOTTLE-07**: Multi-photo batch bottle recognition (photograph a whole shelf)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / login / authentication | Home network, trusted friends/family use only; adds friction with no benefit |
| Payments / tabs / pricing / checkout | Not a commercial bar — no transaction exists to support |
| UPC barcode scanning / UPC database lookup | Most UPC databases with usable alcohol coverage are paid/rate-limited; replaced entirely by AI photo-based bottle recognition (this milestone) |
| Dedicated physical barcode scanner hardware | Superseded along with UPC scanning |
| TLS/HTTPS termination, reverse proxy in the Docker setup | LAN-only traffic; only relevant if the app is ever exposed outside the home network |
| Multi-container Docker Compose (separate DB/API/proxy containers) | Single container keeps this simple for a solo-dev home deployment; SQLite is in-process, not a separate service |
| Kubernetes / orchestration platforms | One Pi, one owner — no scaling problem to solve |
| Multi-arch Docker builds beyond what GHCR/buildx handles automatically | CI publishing (DOCK-06) covers deployment needs without hand-rolled multi-arch tooling |
| MCP authentication / multi-user access control | No auth anywhere in this app; MCP server is LAN-only and trusted, matching the rest of the system |
| AI photo batch/bulk bottle import (photograph a whole shelf at once) | One-photo-per-ingredient is the right scope for MVP; batch import multiplies cost and error surface |
| Storing/retaining bottle or recipe-source photos after processing | No current benefit; adds storage and privacy complexity for zero payoff |

## Traceability

Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOCK-01 | Phase 5 | Complete |
| DOCK-02 | Phase 5 | Complete |
| DOCK-03 | Phase 5 | Complete |
| DOCK-04 | Phase 5 | Complete |
| DOCK-05 | Phase 5 | Complete |
| DOCK-06 | Phase 5 | Complete |
| BOTTLE-01 | Phase 6 | Pending |
| BOTTLE-02 | Phase 6 | Pending |
| BOTTLE-03 | Phase 6 | Pending |
| BOTTLE-04 | Phase 6 | Pending |
| BOTTLE-05 | Phase 6 | Pending |
| MCP-01 | Phase 7 | Pending |
| MCP-02 | Phase 7 | Pending |
| MCP-03 | Phase 7 | Pending |
| MCP-04 | Phase 7 | Pending |
| MCP-05 | Phase 7 | Pending |
| MCP-06 | Phase 7 | Pending |

**Coverage:**

- v1.1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-20*
*Last updated: 2026-08-20*
