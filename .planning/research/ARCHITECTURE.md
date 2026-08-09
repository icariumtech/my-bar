# Architecture Research

**Domain:** Home bar management / ordering system — 3 browser-based kiosk clients + local server + AI integration
**Researched:** 2026-08-09
**Confidence:** MEDIUM (web-sourced, cross-checked across multiple independent sources; no official case study exists for this exact niche, but every component maps to well-documented, mainstream patterns)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (browsers)                       │
├───────────────────┬───────────────────────┬───────────────────────────┤
│  Patron (iPad)     │  Bartender (iPad)      │  Barback (phone)         │
│  - Browse/order     │  - Recipe lookup       │  - Inventory CRUD        │
│  - Makeable status  │  - Order queue/tickets │  - UPC scan → add stock  │
│  - Recommendations  │  - Makeable status     │  - Manual bottle entry   │
└─────────┬───────────┴───────────┬────────────┴─────────┬───────────────┘
          │  WebSocket (subscribe)│  WebSocket (subscribe)│  WebSocket (publish)
          │  HTTP (CRUD)          │  HTTP (CRUD)           │  HTTP (CRUD)
          └───────────┬───────────┴────────────┬───────────┘
                       ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js + Express, local server)        │
├──────────────────────────────────────────────────────────────────────┤
│  HTTP API (REST)         │  WebSocket Hub          │  AI Integration   │
│  - /inventory            │  - broadcasts inventory  │  Layer            │
│  - /recipes               │    change events         │  - /recommend    │
│  - /orders                │  - broadcasts new-order   │  - /substitute   │
│  - /upc-lookup             │    events to Bartender   │  - /import-recipe │
│  - /recipe-import (image) │  - broadcasts order-      │  (all call        │
│                            │    status changes         │   Claude API)     │
├──────────────────────────────────────────────────────────────────────┤
│           Makeable-Status Engine (derived, computed server-side)      │
│  recipe.ingredients[] × inventory.stock[] → makeable / missing[]      │
├──────────────────────────────────────────────────────────────────────┤
│                         SQLite (WAL mode, single file)                │
│   bottles/ingredients │ recipes │ orders │ (recipe_ingredients join)  │
└──────────────────────────────────────────────────────────────────────┘
                       │                              │
                       ▼                              ▼
            External UPC Lookup API            Claude API (Anthropic)
            (Go-UPC / UPC Database —            (vision + tool use,
             fallback to manual entry)           internet required)
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Patron client | Browse recipes, view makeable/missing status, submit orders, receive AI recommendations when a desired drink isn't makeable | Static SPA (React/Svelte/vanilla) served by the backend, WebSocket client for live status |
| Bartender client | Full recipe detail, live order ticket queue, AI substitution suggestions when short an ingredient | Same SPA shell, different route/view; WebSocket client subscribed to `order.created` and `inventory.changed` |
| Barback client | Inventory CRUD, UPC camera scan → lookup → add-to-stock flow | Phone-responsive view of the same SPA; camera access via `getUserMedia` |
| HTTP API | Source of truth for all state mutations (inventory writes, recipe CRUD, order creation/status) | Express REST routes, each mutation ends with a WebSocket broadcast |
| WebSocket hub | Fan-out of state-change events to all connected clients so "makeable" status and order tickets stay live everywhere | `ws` or Socket.IO server; broadcast-only from server, no client-to-client messaging needed |
| Makeable-status engine | Computes, for every recipe, whether it's makeable now and which ingredient(s) are missing, from current stock levels | Pure function run server-side on every inventory or recipe change; result cached and pushed via WebSocket, not recomputed per-client |
| Data store | Single source of truth for bottles/ingredients, recipes, recipe-ingredient links, and orders | SQLite file with WAL mode enabled |
| UPC lookup layer | Barcode → product metadata (name, category) to prefill a new bottle | Barcode read client-side (camera), lookup call server-side to a UPC API, with manual-entry fallback for misses |
| AI integration layer | Three call sites — patron recommendations, bartender/barback substitutions, recipe-image import — all going through one thin Claude API wrapper | Single `services/claude.ts` module wrapping the Anthropic SDK; each feature is a distinct prompt/schema, not a shared "agent" |

## Recommended Project Structure

```
src/
├── server/
│   ├── index.ts               # Express app bootstrap, binds 0.0.0.0, starts WS hub
│   ├── db/
│   │   ├── schema.sql          # bottles, recipes, recipe_ingredients, orders
│   │   ├── client.ts           # better-sqlite3 or node:sqlite connection, WAL pragma
│   │   └── migrations/         # simple numbered .sql migration files
│   ├── routes/
│   │   ├── inventory.ts        # CRUD for bottles/ingredients, UPC-driven add
│   │   ├── recipes.ts          # CRUD for recipes + ingredient links
│   │   ├── orders.ts           # create order, update order status
│   │   ├── upc.ts              # UPC lookup proxy (hides API key, adds fallback)
│   │   └── ai.ts               # /recommend, /substitute, /recipe-import
│   ├── services/
│   │   ├── makeable.ts         # recipe × inventory → makeable/missing engine
│   │   ├── claude.ts           # thin Anthropic SDK wrapper, one fn per AI feature
│   │   └── upcLookup.ts        # external UPC API client + manual-entry fallback
│   └── ws/
│       └── hub.ts              # WebSocket server, broadcast(event, payload)
├── client/
│   ├── patron/                 # Patron SPA entry + views
│   ├── bartender/               # Bartender SPA entry + views
│   ├── barback/                  # Barback SPA entry + views (incl. camera scan UI)
│   └── shared/
│       ├── api.ts               # fetch wrapper for the HTTP API
│       ├── ws.ts                # WebSocket client, reconnect + subscribe helpers
│       └── types.ts             # shared TS types (Bottle, Recipe, Order, MakeableStatus)
└── shared/
    └── contracts.ts             # types/schemas shared between server and client (if monorepo)
```

### Structure Rationale

- **Three client folders, one shared component library:** each role is a distinct kiosk experience (different layout, different primary actions) but they consume the same API and WebSocket contract — sharing `api.ts`/`ws.ts`/`types.ts` keeps the "one inventory" guarantee enforced in one place instead of three.
- **`services/makeable.ts` isolated from routes:** the makeable/missing computation is the core trust guarantee of the whole app — keeping it as a pure, testable function (not inlined in route handlers) makes it easy to verify and to call from multiple triggers (inventory change, recipe change, on-demand recompute).
- **`services/claude.ts` as a single AI façade:** all three AI features (recommend, substitute, import) go through one wrapper so model choice, prompt-caching setup, and error handling are consistent and changeable in one place rather than three.
- **`ws/hub.ts` separate from HTTP routes:** route handlers perform the mutation, then call `hub.broadcast(...)` — this keeps "who gets notified of what" explicit and auditable, rather than scattering `.send()` calls through business logic.

## Architectural Patterns

### Pattern 1: Server-computed, WebSocket-pushed derived state ("makeable/missing")

**What:** Never compute makeable/not-makeable status independently on each client. The server owns the single computation (recipe ingredient list vs. current stock), and pushes the result to all connected clients whenever inventory or a recipe changes.
**When to use:** Any time multiple untrusted/independent clients must agree on a value derived from shared mutable state — this is exactly the "Patron and Bartender must agree on what's makeable" requirement in this project.
**Trade-offs:** Requires a live push channel (WebSocket) rather than clients independently polling and computing; in exchange, eliminates any possibility of the three screens disagreeing due to client-side skew or stale caches.

**Example:**
```typescript
// server/services/makeable.ts
export function computeMakeable(recipe: Recipe, stock: StockMap): MakeableStatus {
  const missing = recipe.ingredients.filter(i => (stock[i.ingredientId] ?? 0) < i.requiredQty);
  return { recipeId: recipe.id, makeable: missing.length === 0, missing };
}

// server/routes/inventory.ts (after any stock mutation)
await db.updateStock(bottleId, newQty);
const statuses = recipes.map(r => computeMakeable(r, await db.getStockMap()));
hub.broadcast('inventory.changed', { statuses });
```

### Pattern 2: WebSocket for bidirectional live sync, plain REST for CRUD

**What:** Use a WebSocket connection per client purely for server→client push (inventory changes, new orders, order-status updates). All writes (adding a bottle, submitting an order, editing a recipe) go through normal HTTP REST endpoints, not over the socket.
**When to use:** Small number of concurrent clients (3, fixed roles) on a local network needing near-instant multi-screen consistency. WebSockets beat Server-Sent Events here specifically because the Barback client also needs to *push* writes quickly-visible elsewhere, and because a single full-duplex connection is simpler to reason about for 3 known, long-lived kiosk sessions than SSE's read-only stream plus separate HTTP writes.
**Trade-offs:** WebSocket reconnect logic must be handled client-side (libraries like Socket.IO give this for free; raw `ws` requires writing a small reconnect/backoff wrapper). For only 3 clients and local-network reliability, this is a minor cost.

**Example:**
```typescript
// client/shared/ws.ts
const socket = new WebSocket(`ws://${location.hostname}:PORT/ws`);
socket.onmessage = (evt) => {
  const { type, payload } = JSON.parse(evt.data);
  if (type === 'inventory.changed') store.applyMakeableStatuses(payload.statuses);
  if (type === 'order.created') store.addOrder(payload.order);
};
```

### Pattern 3: Thin AI façade — one Claude client, feature-specific calls, not an "agent"

**What:** Recommendations, substitutions, and recipe-image import are three independent, single-turn (or single-image) Claude API calls — not a persistent agent loop. Each is a normal `client.messages.create()` call with a task-specific system prompt and, where structured data is needed, a forced-tool-use schema.
**When to use:** Whenever the AI task is "take input, produce one structured or short conversational answer" rather than "run a multi-step exploratory task." All three of this project's AI features fit that shape — Managed Agents / autonomous tool loops would be substantial over-engineering here.
**Trade-offs:** No built-in session/memory across calls — acceptable, since each of these three features is stateless per invocation (a recommendation call doesn't need to remember the last one).

**Example — recipe-image import via forced tool use (guarantees a parseable schema):**
```typescript
// server/services/claude.ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const RECIPE_SCHEMA = {
  name: "extracted_recipe",
  description: "Structured cocktail recipe extracted from a photo or screenshot",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quantity: { type: "string" },
          },
          required: ["name", "quantity"],
        },
      },
      steps: { type: "array", items: { type: "string" } },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["name", "ingredients", "steps", "confidence"],
  },
};

export async function extractRecipeFromImage(base64Image: string, mediaType: string) {
  const response = await client.messages.create({
    model: "claude-sonnet-5", // vision + tool use, cost-appropriate for a low-volume home app
    max_tokens: 2048,
    tools: [RECIPE_SCHEMA],
    tool_choice: { type: "tool", name: "extracted_recipe" }, // forces the structured shape
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
        { type: "text", text: "Extract this cocktail recipe. If a field is unreadable, use your best guess and set confidence accordingly." },
      ],
    }],
  });
  const toolUse = response.content.find(b => b.type === "tool_use");
  return toolUse?.input; // { name, ingredients, steps, confidence } — always valid against the schema
}
```
Recommendations and substitutions follow the same shape but usually don't need forced tool use — a plain text response (or a small `{suggestion, reason}` JSON via `output_config.format`) is enough, since the result is shown to a human for a final decision, not written straight to the database. The recipe-import path *does* warrant forced structured output because it's the one AI output that gets saved to the recipe table — pair it with a `confidence` field and require the owner to confirm before saving, matching the project's "review before save" requirement.

## Data Flow

### Request Flow — Patron submits an order

```
Patron taps "Order" on a makeable drink
    ↓
POST /orders {recipeId} → Express route
    ↓                                  ↓
Validate recipe is still makeable   Insert order row (status: "queued")
(re-check against live stock —          ↓
 don't trust client-cached status)  hub.broadcast('order.created', {order})
    ↓                                  ↓
200 OK to Patron                    Bartender client's open WebSocket
                                     receives event → ticket appears in queue
```

### Request Flow — Barback UPC scan → inventory add

```
Barback opens camera scanner (client-side barcode decode)
    ↓
Decoded UPC string
    ↓
GET /upc-lookup/:upc → server proxies to UPC API (Go-UPC/UPC Database)
    ↓                                  ↓
  Hit: prefill name/category        Miss: fall back to manual entry form
    ↓                                  ↓
Barback confirms/edits, POST /inventory {name, upc, qty, ...}
    ↓
Insert bottle row → recompute makeable statuses for all recipes using it
    ↓
hub.broadcast('inventory.changed', {statuses}) → Patron + Bartender update live
```

### State Management (client side)

```
WebSocket message
    ↓ (dispatch)
Local store (per-client: makeable statuses, order list, inventory list)
    ↓ (subscribe)
UI components re-render
```
No client-side "optimistic makeable computation" — clients only ever render what the server most recently pushed, which is what guarantees the three screens can't disagree.

### Key Data Flows

1. **Inventory truth propagation:** Barback writes → server recomputes makeable status for every affected recipe → broadcast → Patron and Bartender both update within one WebSocket round-trip (typically sub-100ms on LAN).
2. **Order lifecycle:** Patron creates → Bartender's queue receives it live → Bartender updates status (accepted/made/served) → server broadcasts status change → Patron's own order view (if shown) updates.
3. **AI recommendation flow:** Patron requests a drink that's not makeable → client calls `/ai/recommend` with the desired drink + current makeable list → server calls Claude with that context → returns a suggested makeable alternative → client displays it (no write to the DB).
4. **AI recipe import flow:** Owner photographs/screenshots a recipe on the Barback or a recipe-admin view → image uploaded to `/ai/recipe-import` → Claude returns structured JSON via forced tool use → owner reviews/edits in a confirm screen → only on explicit save does it become a real `recipes` row.

## Scaling Considerations

This system has a hard, known ceiling: 3 fixed kiosk clients, one household's worth of traffic, on a local network. "Scaling" here means resilience and correctness, not throughput.

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Normal operation (3 devices, occasional guest load on Patron) | Current design as described — SQLite + single Node process + WebSocket hub is comfortably sufficient |
| Device reconnect / WiFi drop | WebSocket client must auto-reconnect and, on reconnect, immediately re-fetch current makeable/inventory state via a REST GET rather than trusting missed broadcast messages |
| Server restart / power blip | SQLite file persists on disk; on boot, recompute all makeable statuses fresh from stock rather than trusting any cached value; run the Node process under a supervisor (PM2 or a systemd service) so it restarts automatically |
| AI provider outage / no internet | Claude-dependent features (recommendations, substitutions, recipe-image import) must fail gracefully — core inventory/order/makeable flow must keep working with zero AI/internet dependency, per the project's own constraint |

### Scaling Priorities

1. **First and really only bottleneck: reliability of the local server process**, not load. Run it under a process manager (PM2/systemd) with auto-restart, and make sure SQLite's WAL mode is enabled so a crash mid-write doesn't corrupt the file.
2. **Second: WebSocket reconnect correctness.** With kiosk devices staying open for hours/days, the main real risk to "the screens agree" is a silently-dropped socket. Always pair the WebSocket layer with a cheap REST "give me full current state" endpoint that clients call on (re)connect, so a missed broadcast self-heals instead of leaving a screen stale indefinitely.

## Anti-Patterns

### Anti-Pattern 1: Client-side makeable computation

**What people do:** Ship the full inventory and recipe list to each client and let each screen compute makeable/not-makeable locally (seems simpler, avoids a "round trip").
**Why it's bad:** Two clients can trivially disagree if one has a stale copy of the inventory (a common WebSocket-drop or timing scenario) — exactly the trust failure this project's Core Value explicitly calls out as unacceptable.
**Instead:** Server computes makeable status once, per change, and pushes the result. Clients render, never compute.

### Anti-Pattern 2: Using the AI call as a database write path

**What people do:** Have the Claude recipe-import call write directly to the `recipes` table, skipping human review, to "streamline" the flow.
**Why it's bad:** Vision extraction from a photo/screenshot is inherently uncertain (wrong quantities, misread ingredient names) — writing straight to the source of truth risks corrupting the one thing (the recipe collection) the owner explicitly wants to hand-curate.
**Instead:** AI recipe import always returns a structured *draft* (with a confidence field) for the owner to review/edit before an explicit save — this is already the project's stated requirement; the architecture should make it structurally impossible to skip.

### Anti-Pattern 3: One shared "god" WebSocket message type for everything

**What people do:** Broadcast a single generic `state.changed` event and have every client refetch everything on every change.
**Why it's bad:** Wastes bandwidth/CPU on 3 low-power kiosk devices and makes it hard to reason about which UI needs to react to which change; also makes debugging "why did the Bartender screen flicker" much harder.
**Instead:** Use a small set of specific event types (`inventory.changed`, `order.created`, `order.statusChanged`) each carrying only the data that actually changed, so clients can apply targeted updates.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Claude API (Anthropic) | Server-side only, via `@anthropic-ai/sdk`, one façade module (`services/claude.ts`) | Needs internet; API key stays server-side, never exposed to clients. Use `claude-sonnet-5` as the default model for all three AI features — strong vision + tool-use support at a cost appropriate for a low-volume home app; escalate to Opus only if extraction quality on messy photos proves insufficient in testing |
| UPC/barcode lookup API (e.g. Go-UPC) | Server-side proxy endpoint (`/upc-lookup/:upc`) so the API key isn't exposed client-side and so a consistent manual-entry fallback can be applied on miss | No single free service reliably covers all liquor bottles — plan for "lookup fails → manual entry" as a first-class path, not an edge case |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client ↔ Backend (writes) | HTTP REST (JSON) | All mutations (inventory, recipes, orders) — validated and persisted server-side before any broadcast |
| Client ↔ Backend (live state) | WebSocket (JSON messages) | Server-to-client push only; clients never message each other directly |
| Route handlers ↔ Makeable engine | Direct in-process function call | Keeps the core trust computation a pure, unit-testable function, called synchronously after any mutation that could affect it |
| Route handlers ↔ AI façade | Direct in-process function call (async) | AI calls are request/response, not fire-and-forget — client waits for the recommendation/substitution/extraction result, with a loading state and a timeout/error fallback |
| Barback camera ↔ UPC lookup | Client decodes barcode locally (camera + JS library), server resolves UPC → product data | Keeps decoding (CPU-light, needs live camera frames) client-side and lookup (needs an API key) server-side |

## Sources

- WebSockets vs Server-Sent Events comparison (index.dev, ably.com, freeCodeCamp, systemdesignschool.io) — cross-checked, MEDIUM confidence
- SQLite vs PostgreSQL for small self-hosted apps (astera.com, botmonster.com, kunalganglani.com) — cross-checked, MEDIUM confidence
- UPC/barcode lookup API landscape for alcohol products (go-upc.com, upcdatabase.org, upc-search.org, barcodelookup.com) — cross-checked, MEDIUM confidence
- Browser barcode scanning libraries — BarcodeDetector API, ZXing, Quagga2 (scanbot.io, dev.to, github.com/ericblade/quagga2) — cross-checked, MEDIUM confidence
- Self-hosted Node.js/Express app patterns on local hardware (medium.com guides, raspberrypi forums) — cross-checked, MEDIUM confidence
- Claude API structured extraction via forced tool use, vision input, and model selection — Anthropic official SDK documentation bundled in this environment's `claude-api` skill (Python/TypeScript READMEs, `shared/tool-use-concepts.md`, `shared/models.md`) — HIGH confidence (official documentation)
- Project context: `/home/gjohnson/src/my-bar/.planning/PROJECT.md`

---
*Architecture research for: home bar management / ordering system (multi-client local-network app)*
*Researched: 2026-08-09*
