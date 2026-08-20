# Stack Research

**Domain:** Home bar management/ordering web app — self-hosted, local-network, multi-interface, real-time inventory, AI-assisted (Claude API)
**Researched:** 2026-08-09 (initial), 2026-08-19 (v1.1 features: Docker, Claude Vision, MCP)
**Confidence:** MEDIUM-HIGH (package versions verified live against npm registry = HIGH; Claude API details verified against current Anthropic skill docs = HIGH; ecosystem/pattern claims from web search, cross-checked across multiple independent sources = MEDIUM)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 22.x (LTS) | Runtime for backend + build tooling | Current Active LTS, official ARM64/armv7 builds — runs natively on Raspberry Pi OS. One runtime for backend and frontend build removes a whole category of "does this work on the Pi" risk. |
| TypeScript | 5.x | Language for backend + all 3 frontends | Three separate UIs sharing one data model (drink, ingredient, order) is exactly the case where a shared `packages/shared` types package pays off — catches a schema drift between Patron/Bartender/Barback at compile time instead of at 11pm during a party. |
| Vite | 8.x | Build tool for all 3 frontend apps | Fast HMR, zero-config TS/JSX, first-party Tailwind v4 plugin. Used as a **plain SPA bundler**, not a meta-framework — see "Why not SvelteKit/Next.js" below. |
| React | 19.x | UI library for Patron, Bartender, Barback apps | Deliberately **not** SvelteKit/Next.js (see rationale below). React + TanStack Query is the most battle-tested pattern for "REST is truth, WebSocket just says 'go refetch'" — exactly the architecture this app needs for its inventory-consistency requirement. Larger ecosystem also means more Stack Overflow / forum coverage for a solo dev working alone. |
| Fastify | 5.x | Backend API server | ~3x Express throughput, native TypeScript-friendly, built-in JSON schema validation, lower resource footprint than Express — matters on a Pi 4/5 running everything (API, static file serving, WebSocket, SQLite) in one process. |
| better-sqlite3 | 13.x | Database driver | Synchronous, embedded, zero-server-process SQLite driver. At this project's scale (~50-100 bottles, ~100+ recipes, single-digit concurrent kiosk clients) a separate Postgres server is pure overhead — extra process, extra RAM, extra thing to keep running on a Pi. WAL mode gives concurrent reads across all 3 screens with no contention at this write volume. |
| Drizzle ORM | 0.45.x | Type-safe SQL layer over better-sqlite3 | No codegen step, TypeScript-native schema-as-code, thin runtime, first-class `better-sqlite3` driver support, and `drizzle-kit` handles migrations. Lighter than Prisma both in bundle size and in what runs on the Pi at request time. |
| Socket.IO | 4.8.x | Real-time push (server → all 3 clients) | Kiosk iPads/phones sleep, lock, and hop wifi — Socket.IO's built-in reconnection/heartbeat handling is the difference between "inventory silently goes stale until someone notices" and "it just works." Raw `ws` is lighter but you'd be re-implementing exactly the reconnect logic Socket.IO already solved. |
| @tanstack/react-query | 5.x | Client-side data fetching/cache | Pairs with the Socket.IO push: WS events carry no payload, just "something changed" — TanStack Query re-fetches the REST endpoint as the single source of truth. This avoids ever trying to keep a hand-rolled client cache in sync with partial WS deltas, which is the #1 way "makeable/not-makeable" logic silently disagrees across screens. |
| Tailwind CSS | 4.3.x | Styling | Matches the dark-neon custom aesthetic the Patron screen needs (no fighting a component library's default look). v4's Vite plugin needs zero PostCSS config. |
| @anthropic-ai/sdk | 0.116.x | Claude API client (Node) | Official SDK; supports image input, structured outputs via `messages.parse()` + Zod schema, and both models used below. |
| Zod | 4.x | Runtime schema validation + Claude structured-output schemas | One library does double duty: validates API request bodies at the Fastify boundary, and defines the JSON schema Claude's `output_config.format` is constrained to for recipe extraction — one source of truth for "what does a recipe object look like." |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| html5-qrcode | 2.3.x | In-browser camera barcode scanning | **Required**, not optional — see Pitfalls below: `BarcodeDetector` (the native browser API) is unsupported on Safari/iOS entirely, and both iPads and the owner's phone (if iPhone) are Safari-based. html5-qrcode wraps the native API where available and falls back to a JS/WASM decoder, and is specifically documented as handling iOS camera quirks (orientation, permission re-prompts) better than alternatives. |
| zxing-wasm | 3.1.x | Fallback/alternative barcode decoder | Swap in only if html5-qrcode's scan reliability proves insufficient in testing — it's more actively maintained (html5-qrcode itself has low maintenance activity) but has less documented iOS-specific handling. Don't reach for it up front; it's the "if scanning is flaky" escape hatch called out in `PITFALLS.md`. |
| @fastify/websocket | current | Socket.IO alternative binding, or raw WS if you go that route | Not needed if using Socket.IO (it has its own transport). Only relevant if you deliberately choose the lighter raw-`ws` path instead — see Alternatives table. |
| @fastify/static | current | Serve built frontend bundles from the same Fastify process | Lets one Node process on the Pi serve all 3 built SPAs (`/patron`, `/bartender`, `/barback`) plus the API plus the WebSocket — no reverse proxy needed for a LAN-only app. |
| pino | current (Fastify default) | Structured logging | Ships with Fastify by default; low overhead, useful for debugging "why did the order queue not update" issues after the fact on a headless Pi. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm (workspaces) | Monorepo package manager | `apps/patron`, `apps/bartender`, `apps/barback`, `apps/server`, `packages/shared` — standard structure for "one backend, several frontends" in 2026. pnpm's content-addressed store also keeps `node_modules` disk usage down, relevant if the Pi's SD card/eMMC is small. |
| systemd | Process supervision on the Pi | **Preferred over PM2** for this project: it's already on Raspberry Pi OS / any Linux server, no extra dependency, and `systemctl enable --now my-bar.service` with `Restart=on-failure` gives you exactly what's needed (auto-start on boot, auto-restart on crash) with one fewer moving part for a solo dev to maintain. |
| PM2 | Alternative process manager | Use instead of systemd only if you want `pm2 logs`/`pm2 monit` convenience and don't mind the extra npm-global dependency. Functionally equivalent for this use case. |
| drizzle-kit | Schema migrations | Companion CLI to Drizzle ORM; generates and applies SQL migrations from the TypeScript schema. |

## Installation

```bash
# Monorepo root
pnpm init
pnpm add -D typescript vite

# Backend (apps/server)
pnpm add fastify @fastify/static @fastify/cors better-sqlite3 drizzle-orm zod @anthropic-ai/sdk socket.io
pnpm add -D drizzle-kit @types/better-sqlite3

# Each frontend app (apps/patron, apps/bartender, apps/barback)
pnpm add react react-dom @tanstack/react-query socket.io-client html5-qrcode
pnpm add -D @vitejs/plugin-react tailwindcss @tailwindcss/vite

# Shared package (packages/shared)
pnpm add zod
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Vite + React (plain SPA) | SvelteKit | If you want smaller client bundles and don't mind SvelteKit's SSR Node server running on the Pi. Generic "smallest bundle" comparisons favor SvelteKit, but this app has no SEO/public-page need to justify SSR — a plain client-rendered SPA already sidesteps the SSR-on-a-Pi resource question entirely, which matters more here than a few KB of JS on a LAN. |
| Fastify | Express | If you specifically want the largest middleware ecosystem, or the team already knows Express well. Slower and heavier per request than Fastify, but "slower" is relative — at this app's traffic (a handful of kiosk devices), either works; Fastify is simply the better default going in fresh. |
| better-sqlite3 + Drizzle | Postgres | Only reconsider if this ever becomes multi-location/multi-tenant, needs real concurrent-write throughput, or you want managed backups/replication. Not justified for a single home bar. |
| Socket.IO | Server-Sent Events (SSE) | If you want one fewer dependency and are comfortable hand-rolling reconnect/backoff logic yourself. SSE is simpler and genuinely sufficient here since all pushes are server→client one-way — the tradeoff is you own the reconnection reliability that Socket.IO gives for free, which matters more given kiosk devices sleep/lock/roam wifi. |
| html5-qrcode | Native `BarcodeDetector` API | Never as the primary path — see Pitfalls. Only usable as a fast-path optimization on Chrome/Android where it *is* supported, with html5-qrcode as the fallback (which is effectively what html5-qrcode already does internally). |
| Drizzle ORM | Prisma | If you strongly prefer an abstracted, "generated client" ORM experience and don't mind the codegen step and larger runtime. Prisma 7 closed most of the gap (WASM engine, smaller bundle) but Drizzle remains the lighter, more SQL-transparent choice, which suits a solo dev who wants to see exactly what query runs. |
| Claude Sonnet 5 (recipe extraction) | Claude Opus 5 | If extraction accuracy on messy/handwritten photographed recipes proves inconsistent on Sonnet in testing, step up to Opus 5 for that one call site — cost difference is negligible at this app's volume (a handful of recipe imports total, not per-request). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Browser `BarcodeDetector` API as your only scanning path | **Not implemented in Safari on iOS/iPadOS at all** — a web app relying on it will silently fail to scan on every iPad and every iPhone, which is most of this project's target hardware. This is not a minor gap; it's a hard blocker for the two Safari-based devices in the plan. | html5-qrcode (wraps `BarcodeDetector` where present, falls back to JS/WASM decode everywhere else, including Safari) |
| SvelteKit or Next.js with SSR | Pulls a full server-rendering runtime onto the Pi for pages that have no SEO or cold-load-latency need (LAN-only, kiosk-only, always-warm). Adds deployment complexity (adapters, server process per framework convention) with no payoff for this use case. | Plain Vite SPA build, served as static files by the same Fastify process that serves the API |
| Postgres | A second server process, more RAM, and operational overhead (backups, connection pooling) for a dataset that's a few hundred rows total and a handful of concurrent clients. Meaningful cost on a Pi 4/5-class device, zero benefit at this scale. | better-sqlite3 (single file, trivial backup = copy the file) |
| Raw `ws` library with no reconnect handling, or a "just poll every N seconds" approach | Bare `ws` gives you no reconnection/backoff — you'd rebuild what Socket.IO already ships, and get it wrong on the exact failure modes (device sleep, wifi roam) this app will hit constantly on kiosk iPads. Plain polling either lags (long interval) or wastes battery/bandwidth and still lags briefly (short interval) — worse UX for "is this drink makeable right now" than either WS option. | Socket.IO (or SSE if deliberately trading reliability for fewer deps — see Alternatives) |
| `temperature`/`top_p`/`top_k` sampling parameters on Claude Sonnet 5 / Opus 5 / Haiku 4.5 requests | These are rejected outright (400 error) on current-generation Claude models when set to non-default values — a holdover from older model code that will break, not just underperform. | Omit them; steer output via prompting and `output_config.effort` instead |
| Storing `ANTHROPIC_API_KEY` in any frontend code or shipping it to the browser | The Patron/Bartender/Barback apps run in kiosk browsers on shared devices with no auth — any client-side secret is trivially exposed. | Keep the key server-side only, in the Fastify backend's environment; frontends call your own `/api/recommend`, `/api/substitute`, `/api/parse-recipe` endpoints, which then call Claude server-to-server |
| Assistant-message "prefill" tricks to force JSON output | Returns a 400 error on current Claude models (Sonnet 5, Opus 5, Haiku 4.5 included) — this old pattern is not just deprecated, it hard-fails. | `client.messages.parse()` with a Zod schema via `output_config.format` (structured outputs) |

## Stack Patterns by Variant

**If barcode scan accuracy is unreliable with html5-qrcode in practice:**
- Fall back to zxing-wasm, or accept manual entry as the primary path for spirits/wine (which have historically spotty UPC database coverage anyway — see `PITFALLS.md`)
- Because camera scanning is explicitly a convenience feature per the PROJECT.md scope, not a hard requirement — the app must work fully via manual entry regardless

**If the home server is a Raspberry Pi 4 (not 5) or otherwise memory-constrained:**
- Keep better-sqlite3 (already the lightest DB option) and avoid running a reverse proxy (Caddy/nginx) as a separate process — Fastify serving static files directly is one fewer resident process
- Avoid SvelteKit/Next.js SSR even more strongly (their Node SSR runtime is the first thing to feel tight RAM)

**If you later expose this outside the home network (per PROJECT.md's "revisit only if..." note on auth):**
- This changes the security model significantly — the "no auth" and "no reverse proxy / no TLS" decisions in this document are predicated on trusted-LAN-only access. Revisit both the auth and reverse-proxy (TLS termination) recommendations before exposing the server to the internet.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| better-sqlite3@13.x | Node 22.x | better-sqlite3 ships prebuilt native bindings; confirm an ARM64 prebuild exists for your Node version when installing on the Pi, or ensure build tools are present for a from-source compile |
| Tailwind CSS v4.x | Vite 5.0+ (Vite 8.x used here is well above the floor) | v4's `@tailwindcss/vite` plugin replaces the old PostCSS config path entirely — don't mix v3-style `tailwind.config.js` conventions in |
| @anthropic-ai/sdk@0.116.x | Node 22.x, TypeScript 5.x | Current SDK version as of this research; structured outputs (`messages.parse()` + Zod) require this or a recent prior version — don't pin to an old cached SDK version from tutorials written before late 2025 |
| Socket.IO server 4.8.x | socket.io-client 4.8.x | Keep server and client major+minor versions in lockstep across all 3 frontend apps and the backend — mismatched Socket.IO versions are a common source of silent connection failures |

---

## v1.1 New Features Stack

**Milestone context:** Adding Docker containerization, AI bottle-photo recognition (Claude Vision), and MCP server to v1.0 codebase.

### 1. Docker Containerization

#### Recommended Base Image
| Component | Image | Version | Why |
|-----------|-------|---------|-----|
| Build stage (Vite SPAs) | `node:22-slim` | 22.x (latest) | Official ARM64-native image, active CVE patching, 180MB footprint |
| Runtime stage (Fastify server) | `node:22-slim` | 22.x (latest) | Same image throughout; avoids architecture mismatch (don't use alpine or full node for this use case) |

#### Multi-Stage Dockerfile Pattern
```dockerfile
# Stage 1: Build all 3 Vite SPAs (patron, bartender, barback)
FROM node:22-slim AS build
WORKDIR /build
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY apps apps/
COPY packages packages/
RUN pnpm --filter apps/patron build
RUN pnpm --filter apps/bartender build
RUN pnpm --filter apps/barback build

# Stage 2: Runtime (Fastify + built SPAs)
FROM node:22-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# This is where better-sqlite3 native bindings compile for ARM64
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

COPY --from=build /build/apps/server/dist ./apps/server/dist
COPY --from=build /build/apps/patron/dist ./apps/patron/dist
COPY --from=build /build/apps/bartender/dist ./apps/bartender/dist
COPY --from=build /build/apps/barback/dist ./apps/barback/dist
COPY --from=build /build/packages/shared/dist ./packages/shared/dist

EXPOSE 3000
CMD ["node", "apps/server/dist/index.js"]
```

#### Key Caveat: better-sqlite3 Native Bindings
- **Always** run `npm install` inside the container for the runtime stage — better-sqlite3's install script downloads prebuilt ARM64 binaries or compiles from source
- **Never** copy node_modules from host into container — host CPU (likely x86-64 or Apple Silicon) binaries won't run in ARM64 Linux
- If prebuild for your Node version doesn't exist, the container build will automatically compile from source (requires C toolchain, included in node:22-slim)

**Result:** Final image ~500–600MB including all 3 SPA bundles + Fastify server; acceptable for Raspberry Pi 4+ with 4GB RAM.

### 2. Claude Vision for Bottle Recognition

#### Recommended Model
| Model | Version | Use Case | Rationale |
|-------|---------|----------|-----------|
| Claude Sonnet 5 | claude-sonnet-5-20250514 | Primary bottle identification | 4,784 visual tokens (vs Haiku's 1,568) ensure reliable multi-label extraction; `messages.parse()` + Zod works with vision; cost negligible at homelab scale (~$0.001 per extraction) |
| Claude Haiku 4.5 | claude-3-5-haiku-20241022 | Cost-optimized fallback | If testing shows Haiku accuracy is 90%+ on clear bottle photos, swap for 3x cost savings; structured extraction (pattern matching) is equivalent to Sonnet for simple tasks |

#### Implementation Pattern
```typescript
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Server-side only
});

// Schema for bottle identification
const BottleSchema = z.object({
  name: z.string().describe("Bottle brand/product name (e.g., 'Tito's Vodka')"),
  category: z.enum(["spirit", "wine", "beer", "liqueur", "mixer", "other"]),
  abv: z.number().optional().describe("ABV if visible"),
  volume_ml: z.number().optional().describe("Volume in mL if visible"),
});

// Endpoint: POST /api/bottle-recognize
app.post("/api/bottle-recognize", async (req, res) => {
  const { base64Image, mimeType } = req.body;
  
  const result = await client.messages.parse({
    model: "claude-sonnet-5-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: "Identify this bottle. Extract brand, category, ABV, and volume if visible.",
          },
        ],
      },
    ],
    output_config: {
      type: "text",
      json_schema: {
        name: "BottleInfo",
        schema: BottleSchema,
        strict: true,
      },
    },
  });

  res.send(result.content[0].parsed);
});
```

#### Flow
1. Barback phone app: camera input → submit image (multipart form POST)
2. Fastify backend: calls Claude Vision, gets typed response via messages.parse()
3. Response sent to frontend as pre-filled add-ingredient form
4. Owner reviews/confirms before saving

#### Why messages.parse() with vision works
- `messages.parse()` + Zod works identically for vision input as text input
- Output guaranteed to match schema; no JSON parsing failures
- Type-safe in TypeScript: `result.content[0].parsed` is typed as BottleSchema

### 3. MCP Server (TypeScript)

#### Recommended Stack
| Component | Version | Notes |
|-----------|---------|-------|
| @modelcontextprotocol/sdk | 1.30.0 (stable) | Current production-ready; v2 beta available but not stable; 1.30.0 sufficient for homelab |
| Transport | stdio (default) | Single-user, local subprocess; simplest setup; no reverse proxy/TLS needed for home LAN |
| Hosting | Standalone Node process or same as Fastify | Spawned by Claude Code as child process via stdio |

#### Why stdio for homelab
- **Single-user:** Claude Code on one machine runs the MCP server as a spawned subprocess
- **No network exposure:** Local inter-process communication, not HTTP
- **No TLS/reverse-proxy:** Trusted home network only
- **Debugging:** Errors stream to stderr, easier to troubleshoot
- **Config:** Claude Code reads mcpServers config, handles spawn/lifecycle automatically

#### Minimal MCP Server Example
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({
  name: "my-bar-mcp",
  version: "1.0.0",
});

const tools = [
  {
    name: "add_recipe",
    description: "Create a cocktail recipe from a link, text, or image",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Recipe URL or video link" },
        text: { type: "string", description: "Pasted recipe text" },
      },
      required: ["url"],
    },
  },
  {
    name: "add_ingredient",
    description: "Add or update an ingredient in inventory",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        category: { type: "string", enum: ["spirit", "wine", "beer", "liqueur", "mixer"] },
        quantity: { type: "number" },
        unit: { type: "string" },
      },
      required: ["name", "category"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Delegate to Fastify backend
  const response = await fetch(
    `http://localhost:3000/api/mcp/${request.params.name}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request.params.arguments),
    }
  );
  const result = await response.json();
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

#### Claude Code Configuration (mcpServers)
```json
{
  "mcpServers": {
    "my-bar": {
      "command": "node",
      "args": [
        "/path/to/my-bar/apps/mcp-server/dist/index.js"
      ],
      "env": {
        "FASTIFY_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

Claude Code will spawn the server, expose its tools in the MCP sidebar, and route calls back through stdio JSON-RPC.

#### When to use HTTP transport instead
- **Only if** multiple users/devices need concurrent access (rare for homelab)
- Requires: Streamable HTTP + reverse proxy (Caddy/nginx) + TLS
- Much more operational complexity, not needed here

## What NOT to Use (v1.1 additions)

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| `node:latest` in Docker | Breaks reproducibility; "why did this build fail in production" becomes impossible | `node:22-slim` (pinned major.minor) |
| `node:22-alpine` for better-sqlite3 | Alpine uses musl, not glibc — binaries built for Debian won't load | `node:22-slim` (glibc compatible) |
| Copying host node_modules into Docker | Host CPU ≠ container CPU; native bindings fail silently | Run `npm install` inside container for ARM64 target |
| Claude Opus 5 for routine bottle photos | Overkill; ~10x Sonnet cost with minimal accuracy gain on straightforward labels | Claude Sonnet 5 |
| HTTP MCP transport for single-user homelab | Reverse proxy + TLS + auth overhead for zero benefit on trusted LAN | stdio transport (default) |
| MCP SDK v2 beta in production | API still settling; stable release lands 2026-07-28 | v1.30.0 stable |

---

## Sources

- npm registry (`npm view <pkg> version`) — live version numbers for every package listed above, checked 2026-08-09 (HIGH confidence)
- Bundled Anthropic `claude-api` skill documentation (current as of 2026-06-24 model cache, cross-checked live) — model IDs, pricing, structured outputs, vision input, SDK patterns (HIGH confidence — official/authoritative)
- Web search, multiple independent sources cross-checked — SvelteKit/Next.js/Vite comparison, Fastify/Express/Hono comparison, WebSocket/SSE/polling comparison, Socket.IO vs `ws`, barcode library comparison, `BarcodeDetector` Safari support status, Drizzle vs Prisma, UPC database coverage for alcohol, Raspberry Pi self-hosting patterns, Tailwind v4 setup (MEDIUM confidence — consistent across sources but not primary/official docs for most)
- Docker Hub official Node images: [node - Official Image](https://hub.docker.com/_/node), [arm64v8/node](https://hub.docker.com/r/arm64v8/node) — verified 2026-08-19 for ARM64 support and current tag availability (HIGH confidence)
- Anthropic platform docs: [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Vision](https://platform.claude.com/docs/en/build-with-claude/vision) — verified 2026-08-19 for messages.parse() with vision input (HIGH confidence)
- GitHub: [Model Context Protocol TypeScript SDK releases](https://github.com/modelcontextprotocol/typescript-sdk/releases) — verified 2026-08-19 for v1.30.0 stable, v2 beta status (HIGH confidence)
- better-sqlite3 Docker/ARM64 considerations: GitHub issues cross-referenced, web search on native bindings compilation in Docker — verified 2026-08-19 (MEDIUM-HIGH confidence)

---
*Stack research for: home bar management and ordering web app (self-hosted, local-network, multi-interface, AI-assisted)*
*Initial research: 2026-08-09 | v1.1 updates (Docker, Claude Vision, MCP): 2026-08-19*
