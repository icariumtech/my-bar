# Architecture Integration: v1.1 Docker, AI Bottle Recognition, MCP Server

**Domain:** Home bar management system (existing pnpm monorepo, Fastify + Drizzle/better-sqlite3 + Socket.IO, three React SPAs)
**Researched:** 2026-08-20
**Features Integrated:** Docker containerization, AI bottle photo recognition, MCP server delegation
**Overall Confidence:** HIGH

## Executive Summary

Adding Docker packaging, AI bottle photo recognition, and an MCP server to the existing My Bar architecture requires **minimal changes to existing components** but introduces **three new layers** that all delegate to the single Fastify REST API. Docker is purely an operations change; both AI bottle recognition and the MCP server are new endpoints/services that call existing or new REST endpoints. The architecture remains clear: **one Fastify server is the single source of truth**, three React frontends read and write through its REST API, and Socket.IO synchronizes state across all three clients. The new MCP server is stateless and does the same—it proxies requests to the REST API, never directly to the database.

This design preserves the current inventory-synchronization guarantees: all three interfaces (Patron, Bartender, Barback) + the new MCP server all converge on the same source of truth (the REST API), so there is no way for any two clients to disagree about what's in stock.

---

## System Architecture

### Current State (v1.0 shipped)

```
┌─────────────────────────────────────────────────────────────┐
│                      Deployed Instance                       │
│  (Home Server / Raspberry Pi, one Node process)             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  apps/server (Fastify)                                       │
│  ├─ REST API routes: /api/recipes, /api/ingredients, etc.  │
│  ├─ Static file serving: /patron/, /bartender/, /barback/  │
│  ├─ Socket.IO server for real-time updates                 │
│  ├─ Drizzle ORM layer                                       │
│  └─ better-sqlite3 connection → db.sqlite (file on disk)   │
│                                                               │
│  Built SPA bundles (served at runtime):                     │
│  ├─ /patron/index.html + dist/ → React + TanStack Query   │
│  ├─ /bartender/index.html + dist/ → React + TanStack Query│
│  └─ /barback/index.html + dist/ → React + TanStack Query  │
│                                                               │
│  packages/shared (Zod contracts)                            │
│  └─ TypeScript types compiled to .d.ts, Zod schemas       │
│     used at runtime in Fastify for validation              │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Three browser clients (iPad/phone):
├─ Patron (iPad at bar): /patron/ → browse & order
├─ Bartender (iPad behind bar): /bartender/ → recipes & queue
└─ Barback (owner's phone): /barback/ → inventory management

Real-time: Socket.IO connects each client → server → server broadcasts
```

### After v1.1: Adding Docker, AI Bottle Photo, MCP Server

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Container                          │
│                  (docker-compose.yml)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  apps/server (Fastify) — unchanged core, 2 new routes       │
│  ├─ [existing] REST API: /api/recipes, /api/ingredients    │
│  ├─ [existing] Socket.IO server                            │
│  ├─ [NEW] POST /api/ingredients/recognize-photo            │
│  │  └─ Accepts image file, calls Claude Vision, validates  │
│  │     response via Zod schema, returns ingredient preview │
│  ├─ [NEW] POST /api/recipes/extract-from-image             │
│  │  └─ Accepts recipe photo/screenshot, extracts via Claude│
│  ├─ Drizzle ORM + better-sqlite3                           │
│  └─ db.sqlite → /data/db.sqlite (bind-mounted volume)      │
│                                                               │
│  Built SPA bundles (static, served by Fastify):            │
│  ├─ /patron/, /bartender/, /barback/                       │
│  └─ [unchanged] React + TanStack Query                     │
│                                                               │
│  packages/shared (Zod schemas, extended):                  │
│  ├─ [existing] Recipe, Ingredient, Order types            │
│  └─ [NEW] BottlePhotoRecognition, RecipeExtraction schemas │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Three browser clients (unchanged):
├─ Patron, Bartender, Barback — all call REST API + Socket.IO
│  and now Barback can also call POST /api/ingredients/recognize-photo
└─ No changes to client code needed (endpoint is opt-in)

New: MCP Server (separate stateless process, same LAN):
├─ apps/mcp (TypeScript, @modelcontextprotocol/sdk)
├─ Registers MCP tools: createRecipe, addIngredient, listRecipes, etc.
├─ Delegating MCP handler → calls REST API (http://server:3000/api/...)
├─ Transport: stdio (for Claude Code via claude_desktop_config.json)
│           OR HTTP on port 3001 (for LAN-wide access via MCP HTTP)
└─ No database connection, no authentication (trusted LAN)
   → This is the API delegation pattern

New: Dockerfile + docker-compose.yml (deployment):
├─ Multi-stage Dockerfile:
│  Stage 1: pnpm install (monorepo root, all workspaces)
│  Stage 2: build packages/shared
│  Stage 3: build apps/patron, apps/bartender, apps/barback (parallel)
│  Stage 4: build apps/server (depends on Stage 3)
│  Stage 5: runtime (minimal, Node 22, only runtime deps)
├─ docker-compose.yml:
│  Service: my-bar-server
│  ├─ Image: built from Dockerfile above
│  ├─ Ports: 3000 (REST API + static files)
│  ├─ Volumes: ./data/db.sqlite:/data/db.sqlite (persisted on host)
│  └─ Environment: NODE_ENV=production, ANTHROPIC_API_KEY=...
└─ [OPTIONAL] Service: my-bar-mcp (if running MCP as separate container)
```

---

## Component Boundaries & Responsibilities

### Fastify Server (apps/server) — Single Source of Truth

**Responsibility:** Serve REST API, static frontends, WebSocket, manage SQLite

**New routes (v1.1):**
- `POST /api/ingredients/recognize-photo` ← **AI Bottle Photo Recognition endpoint**
  - Request: multipart/form-data with image file
  - Handler: decode image → Claude Vision with Zod schema → validate → return `{ name, category, bottleSize?, alcoholContent? }`
  
- `POST /api/recipes/extract-from-image` ← **Recipe extraction from photo/screenshot**
  - Request: multipart/form-data with image file
  - Handler: similar to above, returns `{ name, ingredients, method, glassware }`

**Socket.IO behavior:**
- Unchanged: server broadcasts inventory/order updates to all connected clients
- In Docker: bind-mounted SQLite file means only one container writes at a time

---

### MCP Server (apps/mcp) — Stateless REST API Proxy

**Responsibility:** Wrap the existing REST API in MCP tools

**What it is:**
- TypeScript server using `@modelcontextprotocol/sdk`
- Registers MCP tools: `createRecipe()`, `addIngredient()`, `listRecipes()`, etc.
- Each tool: call Fastify REST API → validate response → return result
- Transport: stdio (local Claude Code use) + HTTP on :3001 (LAN-wide)

**Key principle:** No database connection, no direct writes—everything goes through REST API.

---

## New and Modified Components

### New Files/Directories

| Path | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for containerization |
| `docker-compose.yml` | Orchestration, volume mounts |
| `.dockerignore` | Build context exclusions |
| `apps/mcp/` | MCP server workspace (new) |
| `apps/mcp/src/stdio-server.ts` | Stdio transport |
| `apps/mcp/src/http-server.ts` | HTTP transport |
| `apps/mcp/src/tools/*.ts` | Tool implementations |
| `apps/mcp/src/rest-client.ts` | REST API client |
| `packages/shared/src/schemas/bottlePhoto.ts` | Zod schema for recognition |

### Modified Files

| Path | Change |
|------|--------|
| `apps/server/src/index.ts` | Add bottle-photo & recipe-extraction routes |
| `apps/server/src/services/claude.ts` | New Claude Vision helpers |
| `packages/shared/src/index.ts` | Export new Zod schemas |
| `pnpm-workspace.yaml` | Add `apps/mcp` workspace |

---

## Build Order & Dependencies

### Phase 1: AI Bottle Photo Recognition

**Why first:** Simplest, no other features depend on it.

**Tasks:**
1. Add `BottlePhotoRecognitionSchema` to `packages/shared`
2. Create `apps/server/src/services/claude.ts` with Claude Vision helpers
3. Add `POST /api/ingredients/recognize-photo` route
4. Test with real photos
5. (Optional) Add "Photograph bottle" button to Barback

---

### Phase 2: MCP Server

**Why second:** Needs stable REST API (Phase 1 done).

**Tasks:**
1. Create `apps/mcp` workspace
2. Set up `@modelcontextprotocol/sdk`, HTTP client
3. Implement tool definitions (createRecipe, addIngredient, etc.)
4. Implement stdio transport (Claude Desktop)
5. Implement HTTP transport (LAN sharing)
6. Test tool invocations
7. Document `claude_desktop_config.json` setup

---

### Phase 3: Docker Containerization

**Why last:** Packaging; can run in parallel with Phase 2 once API is frozen.

**Tasks:**
1. Create `Dockerfile` with multi-stage build
2. Create `docker-compose.yml` with volume mounts
3. Create `.dockerignore`
4. Test locally: build, run, verify persistence
5. Document deployment (Pi setup, systemd, etc.)

---

## Architecture Patterns

### Pattern 1: Claude Vision + Structured Outputs via Zod

Both bottle recognition and recipe extraction use:
- Zod schema definition in `packages/shared`
- Claude API call with `messages.parse()` + schema
- Response guaranteed to match schema

Benefits:
- Type safety compile-time + runtime
- Single schema used by server, MCP, clients
- No parsing errors

### Pattern 2: MCP Tool Delegation to REST API

Each MCP tool:
- Receives input (validated by schema)
- Calls REST API endpoint
- Validates response
- Returns result

Benefits:
- No database access in MCP server (stateless)
- All writes through REST API (consistency)
- MCP is just a protocol translator
- Reusable across all tools

### Pattern 3: Socket.IO Broadcast → TanStack Query Invalidation

Existing pattern (no changes):
- REST API write → Fastify broadcasts Socket.IO event
- Browser clients receive event → TanStack Query invalidates → refetch
- MCP server doesn't listen to Socket.IO (not needed; calls REST)

---

## Pitfalls & Mitigations

### Pitfall 1: Claude Vision accuracy on poor images

**Prevention:**
- Show extracted data to user before saving
- Add `confidence` field; warn if low
- Implement manual entry fallback
- Good camera UI guidance

### Pitfall 2: MCP server REST API calls fail

**Prevention:**
- Retry logic (exponential backoff, 3 retries)
- Timeout handling (5 seconds)
- Defensive response validation

### Pitfall 3: Docker build includes secrets (.env)

**Prevention:**
- `.dockerignore` excludes `.env`
- Use runtime environment variables, not build-time
- Review Dockerfile for accidental COPY of sensitive files

### Pitfall 4: SQLite WAL lock in Docker

**Prevention:**
- Use local bind mount (not NFS/network)
- Validate locking with tests
- Document: "Use local disk for SQLite"

### Pitfall 5: MCP HTTP server exposed to internet

**Prevention:**
- Deploy guide: "LAN only, no authentication"
- Document: do not expose to internet
- Recommend firewall rules

### Pitfall 6: Socket.IO reconnect after container restart

**Prevention:**
- Already handled by v1.0 reconnection logic
- Users see brief connection loss, auto-recovers
- No code changes needed

---

## Sources

- [Optimized multi-stage Docker builds with TurboRepo and PNPM for NodeJS microservices in a monorepo](https://fintlabs.medium.com/optimized-multi-stage-docker-builds-with-turborepo-and-pnpm-for-nodejs-microservices-in-a-monorepo-c686fdcf051f)
- [How to Build Multi-Stage Dockerfiles for Monorepos](https://oneuptime.com/blog/post/2026-01-30-docker-multi-stage-monorepos/view)
- [Build a Docker Container from a pnpm monorepo](https://www.captaincodeman.com/build-a-docker-container-from-a-pnpm-monorepo)
- [Working with Docker | pnpm](https://pnpm.io/docker)
- [Tackling MCP security challenges with the MCP API delegation pattern](https://www.thoughtworks.com/insights/blog/generative-ai/Tackling-MCP-security-challenges-with-the-MCP-API-delegation-pattern)
- [API MCP Server Architecture Guide for API Providers](https://www.stainless.com/mcp/api-mcp-server-architecture-guide/)
- [How to Run SQLite in Docker](https://oneuptime.com/blog/post/2026-02-08-how-to-run-sqlite-in-docker-when-and-how/view)
- [Claude Structured Outputs in TypeScript with Zod (2026)](https://nerdleveltech.com/claude-structured-outputs-typescript-zod-tutorial)
- [Structured outputs - Claude API Docs](https://docs.claude.com/en/docs/build-with-claude/structured-outputs)
- [Claude Vision API: Image Analysis At Production Scale](https://www.developersdigest.tech/blog/claude-vision-api-production-guide)
- [Node/TypeScript MCP Server Implementation Guide](https://github.com/anthropics/skills/blob/main/skills/mcp-builder/reference/node_mcp_server.md)
- [Server Guide | MCP TypeScript SDK (V2)](https://ts.sdk.modelcontextprotocol.io/v2/documents/Documents.Server_Guide.html)
- [Build an MCP Server in TypeScript: From Scratch 2026](https://www.digitalapplied.com/blog/build-mcp-server-typescript-tutorial-from-scratch-2026)
