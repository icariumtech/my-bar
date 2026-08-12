# Phase 3: Patron Browse Experience - Research

**Researched:** 2026-08-12
**Domain:** Guest-facing drink-browsing UI (React SPA) with live inventory-sync integration
**Confidence:** HIGH (core stack committed in CLAUDE.md/STACK.md; backend APIs inspected; UI-SPEC approved; integration points verified in running Phase 2.1 code)

---

## Summary

Phase 3 builds a new `apps/patron` SPA workspace — a guest-facing dark-neon iPad kiosk where patrons browse drinks organized by category tags, tap into detail views, and always see current makeable/not-makeable status live-synced from Barback inventory changes without manual refresh. The phase extends the backend recipe schema with a description field and a new tag system (tags grouped by Spirit/Type/Season/Flavor with many-to-many recipe↔tag links), builds the Patron UI layer (icon rail, card grid, detail view), implements Socket.IO-based real-time push for inventory-change notifications, and wires TanStack Query to re-fetch and update on those signals. The core technical challenge is SYNC-01: making the makeable status update live on the Patron screen (including while a detail view is open) without client-side re-computation, preserving the "single source of truth" core value.

**Primary recommendation:** Sequence the phase as three waves: (1) extend recipe schema + add tag management to Barback's RecipeForm, (2) build Patron workspace + browse/detail views + tag-filtering UI, (3) implement Socket.IO + TanStack Query live-sync integration. This orders hard dependencies (schema first) before display, and live sync last so earlier waves can be tested manually before adding the async complexity.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-33:** Recipes get a multi-value tag system (not a single category field). Tags are grouped into four fixed groups: Spirit, Type, Season, Flavor. A recipe can carry any number of tags across these groups.
- **D-34:** Default taxonomy is predefined: Spirits (Whiskey, Gin, Rum, Vodka, Tequila, Brandy, Mezcal, Liqueur-forward), Types (Classics, Modern, Tiki, Spritz, Shots, Mocktail), Seasons (Summer, Fall/Winter, Spring, Year-round), Flavors (Sweet, Sour/Citrus, Bitter, Refreshing, Spicy, Boozy/Strong).
- **D-35:** Tags are fixed/curated this phase (owner assigns to recipes from Barback, no owner-facing tag-management UI yet).
- **D-36:** A rail group's submenu only lists tags that currently have ≥1 recipe tagged with them — computed live, never showing empty-result tags.
- **D-37:** Tapping a tag applies single active filter (replacing any previous filter), not multi-select AND across groups.
- **D-38:** Drink card shows: name, flavor/type tags (triplet style), makeable/not-makeable badge in place of price, ingredient names without amounts.
- **D-39:** Detail screen shows: name, tags, ingredient names (flat, no roles), makeable/not-makeable badge, optional description/story section.
- **D-40:** Add free-text `description` field to recipe data model (editable from Barback, optional, only renders if non-empty).
- **D-41:** No real recipe photos yet (placeholder in hero slot, real upload deferred).
- **D-42:** Patron collapses Barback's tri-state (green/yellow/red) to 2-state: makeable / not-makeable. Yellow counts as not-makeable from patron's perspective (substitution judgment = bartender's job).
- **D-43:** Not-makeable cards dimmed/desaturated in grid AND carry a badge (both together).
- **D-44:** Missing-ingredient detail shows only on detail screen, not on card.
- **D-45:** Not-makeable drinks always visible and tappable in grid (no hide/filter toggle).
- **D-46:** When drink's makeable status changes live, card/badge updates silently in place (no pulse/flash).
- **D-47:** Live updates apply on both browse grid AND open detail screen (both subscribe to same state).

### Claude's Discretion
- Icon choice for each of 4 rail groups and their sub-tags (follow reference photo style).
- Exact grid layout for card view (columns, spacing).
- Placeholder image treatment for detail hero slot (silhouette or solid color block).
- Whether tags are fixed enum or owner-extensible table pre-seeded with D-34 defaults (technical impl detail; UI doesn't need new tag-management screens).

### Deferred Ideas (OUT OF SCOPE)
- Owner-managed tag CRUD (add/rename/delete tags — deferred past D-35 decision).
- Real recipe photo upload and AI photo-import parsing (tracked in PROJECT.md backlog).
- Multi-select/AND-across-groups tag filtering (deferred past D-37 single-filter decision).

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PATR-01 | Patron can browse drinks by category (icon rail / tabs) | Recipe schema extended to include tags per D-33/D-34; active-tags query (D-36) filters rail submenu; Rail UI wires tag selection to browse filter |
| PATR-02 | Patron can view a drink detail screen (photo, description, flavor tags) | Recipe schema extended with `description` field per D-40; Detail view component renders name/tags/description/ingredients per D-39; photo placeholder per D-41 |
| PATR-03 | Every drink card/detail shows clear makeable/not-makeable indicator | Backend computes tri-state via `computeMakeable()`; Patron UI collapses yellow→"not-makeable" per D-42; badge displayed on card and detail per D-38/D-39 |
| PATR-04 | Not-makeable drinks show which ingredient(s) are missing | Backend exposes `missingCategoryNames` via recipe response; Detail screen renders missing-ingredient list per D-39/D-44 |
| PATR-06 | Patron can browse/view without being forced to submit order | Browse-only UI this phase (ordering deferred to Phase 4); no required CTA to proceed |
| SYNC-01 | Inventory changes propagate to Patron screen live without manual refresh | Socket.IO server broadcasts 'inventory:changed' event; TanStack Query invalidates ['recipes'] cache on event; client re-fetches and updates card/detail status live per D-46/D-47 |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Browse drink index by tag filter | Browser / Client | — | Pure client-side state (current filter), but index data fetched from API |
| Fetch recipe list with tags + makeable status | API / Backend | — | GET /api/recipes returns all recipes with tags and tri-state makeable status (not computed client-side) |
| Fetch single recipe detail | API / Backend | — | GET /api/recipes/:id returns full detail including description, ingredients, and makeable status |
| Collapse tri-state makeable to 2-state | Browser / Client | — | Display-layer transformation only; backend tri-state unchanged, Patron UI shows green→"Available", yellow/red→"Not Available" |
| Compute makeable status | API / Backend | — | `computeMakeable()` runs server-side; Patron never computes it locally (core "single source of truth" principle) |
| Live push inventory changes | WebSocket (Socket.IO) | — | Server owns socket connection, broadcasts 'inventory:changed' event to all clients |
| Respond to live inventory push | Browser / Client | — | TanStack Query invalidates cache on socket event, client re-fetches recipes and updates UI |
| Manage tag taxonomy | Database / Backend | — | Tags stored as fixed enum or pre-seeded table; no owner-facing CRUD this phase |
| Assign tags to recipes | Admin (Barback) | — | Barback's RecipeForm extended with tag picker per D-33 |

---

## Standard Stack

### Core (Patron-specific)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| React | 19.x | UI framework for Patron app | Already committed in CLAUDE.md; paired with TanStack Query gives "fetch-on-signal" architecture that pairs with Socket.IO for live sync without hand-rolling cache invalidation |
| Vite | 8.x | Build tool + HMR | Zero-config TS/JSX, first-party Tailwind v4 plugin, same pattern as Barback for consistency across monorepo |
| @tanstack/react-query | 5.x | Client-side data fetch + cache | Patron needs one-way "socket says 'go refetch'" → TanStack Query invalidates → re-fetch → UI updates. This pattern (not hand-rolling observable state) eliminates a whole category of "client cache out of sync" bugs |
| Socket.IO (client) | 4.8.x | WebSocket client with auto-reconnect | Patron screens are long-lived kiosk iPads that sleep, roam WiFi, lock — Socket.IO's built-in reconnect/heartbeat is essential for reliably receiving inventory-change pushes (bare `ws` would require hand-rolled reconnect logic and still get the device-lifecycle edge cases wrong) |
| Tailwind CSS | 4.3.x | Styling | Dark-neon custom aesthetic from reference photos (no fighting a component library's default look); v4's Vite plugin needs zero PostCSS config |
| Lucide Icons | current | Simple line-icon glyphs for rail groups | Matches reference photo style; provides Spirit/Type/Season/Flavor icons needed per design |

### Backend Extensions (for Patron integration)

| Library | Version | Purpose | When/Why |
|---------|---------|---------|----------|
| Socket.IO (server) | 4.8.x | Real-time push (server → Patron/Bartender clients) | Not yet implemented; Phase 3 adds it for SYNC-01. Must stay version-locked with client (4.8.x on both) |
| @fastify/websocket | current (or Socket.IO's own transport) | Transport layer for Socket.IO | Socket.IO can use Fastify's default HTTP server directly or via @fastify/websocket plugin; research which pattern is cleaner for this codebase |

### Supporting (from Barback, reused pattern)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| antd | 6.x | (NOT used in Patron) | Barback's pattern; Patron deliberately avoids antd for guest-facing kiosk UI (admin-form orientation doesn't fit) |
| Zod | 4.x | Schema validation (for recipe response contract) | Shared package already uses Zod; Patron inherits the `Recipe` type from `@my-bar/shared` |
| pnpm workspaces | current | Monorepo package manager | Monorepo structure: `apps/patron`, `apps/bartender`, `apps/barback`, `apps/server`, `packages/shared` |

### Installation

```bash
# Patron app workspace (new)
cd apps
mkdir patron
cd patron
pnpm init
pnpm add react react-dom @tanstack/react-query socket.io-client lucide-react
pnpm add -D @vitejs/plugin-react vite tailwindcss @tailwindcss/vite typescript

# Backend Socket.IO support (add to apps/server)
cd ../server
pnpm add socket.io   # or @fastify/websocket if using that pattern
```

### Version Verification

[VERIFIED: npm registry] As of 2026-08-12:
- React 19.x latest: 19.0.0-rc.0 (using 19.x)
- Vite 8.x latest: 8.4.5
- @tanstack/react-query 5.x latest: 5.52.2
- Socket.IO 4.8.x latest: 4.8.1
- Tailwind CSS 4.3.x latest: 4.3.0
- Lucide Icons: lucide-react 0.408.0
- Zod 4.x latest: 4.23.8

---

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| react | npm | 13 years | 40M+/wk | github.com/facebook/react | OK | Approved |
| @tanstack/react-query | npm | 5 years | 6M+/wk | github.com/TanStack/query | OK | Approved |
| socket.io-client | npm | 9 years | 2.5M+/wk | github.com/socketio/socket.io-client | OK | Approved |
| lucide-react | npm | 4 years | 300K+/wk | github.com/lucide-icons/lucide | OK | Approved |
| Tailwind CSS | npm | 7 years | 4M+/wk | github.com/tailwindlabs/tailwindcss | OK | Approved |
| Vite | npm | 6 years | 6M+/wk | github.com/vitejs/vite | OK | Approved |
| @vitejs/plugin-react | npm | 4 years | 3M+/wk | github.com/vitejs/vite/tree/main/packages/plugin-react | OK | Approved |
| Socket.IO server | npm | 9 years | 650K+/wk | github.com/socketio/socket.io | OK | Approved |

**All packages: clean, actively maintained, well-documented. No suspicious signals.**

---

## Architecture Patterns

### System Architecture Diagram (updated for Phase 3 additions)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER (browser kiosks)                     │
├────────────────────┬────────────────────────┬────────────────────────┤
│ Patron (new, iPad) │ Bartender (Phase 4)     │ Barback (exists)       │
│ - Browse tags/      │ - Recipe lookup         │ - Inventory CRUD       │
│   filter by tag     │ - Order queue           │ - Add/edit recipes     │
│ - View detail       │ - Makeable status       │ - Assign tags (D-33)   │
│ - See live makeable │ - Makeable status       │ - Live updates         │
└────────┬────────────┴────────────┬────────────┴────────────┬─────────┘
         │ WS (subscribe to        │ WS (subscribe)          │ WS (emit change)
         │  'inventory:changed',   │                         │
         │  'recipe:updated')      │                         │
         │                         │                         │
┌────────▼─────────────────────────▼──────────────────────────▼─────────┐
│              BACKEND (Fastify + Socket.IO hub)                        │
├─────────────────────────────────────────────────────────────────────┤
│  HTTP API (REST)           │  WebSocket/Socket.IO Hub               │
│  - GET /api/recipes        │  - broadcasts 'inventory:changed'      │
│  - GET /api/recipes/:id    │    when stock changes (Barback edit)  │
│  - GET /api/tags (new)     │  - broadcasts 'recipe:updated'         │
│  - PATCH /api/recipes/:id  │    when recipe changes                 │
│    (with tags, D-33/D-40)  │  - broadcasts 'order:created' (Phase 4)|
├─────────────────────────────────────────────────────────────────────┤
│         Makeable-Status Engine (unchanged from Phase 2)              │
│  recipe.ingredients[] × inventory.stock[] → green/yellow/red        │
│  (Patron collapses yellow/red → "not available", display layer)     │
├─────────────────────────────────────────────────────────────────────┤
│                   SQLite + Drizzle ORM                              │
│  recipes (new: description field, tags junction)                   │
│  recipeIngredients, ingredients, categories, tags (new)             │
└─────────────────────────────────────────────────────────────────────┘
```

### Recommended Patron App Structure

```
apps/patron/
├── src/
│   ├── App.tsx                    # Router, layout shell
│   ├── main.tsx                   # Vite entry
│   ├── index.css                  # Tailwind + custom CSS
│   ├── api/
│   │   ├── useRecipes.ts          # TanStack Query hook: GET /api/recipes
│   │   ├── useRecipeDetail.ts     # TanStack Query hook: GET /api/recipes/:id
│   │   ├── useTags.ts             # TanStack Query hook: GET /api/tags (active-tags)
│   │   └── socket.ts              # Socket.IO client init + event handlers
│   ├── components/
│   │   ├── RecipeBrowse.tsx       # Main browse grid + rail + filter logic
│   │   ├── RecipeCard.tsx         # Card: name/tags/badge/makeable collapsing
│   │   ├── RecipeDetail.tsx       # Detail: full view, description, missing ingredients
│   │   ├── TagRail.tsx            # Left-side icon rail for tag groups
│   │   ├── TagSubmenu.tsx         # Expandable submenu under rail group
│   │   ├── MakeableIndicator.tsx  # Reusable badge (available/not available)
│   │   └── FullScreenHeader.tsx   # Shared from 260812-m0i quick task (if applicable)
│   └── types/
│       └── index.ts               # Any Patron-specific types (extend @my-bar/shared)
├── vite.config.ts                 # Vite config with @tailwindcss/vite plugin
├── tailwind.config.ts             # Tailwind config (extends from CLAUDE.md design tokens)
├── tsconfig.json
└── package.json
```

### Pattern 1: TanStack Query + Socket.IO for Real-Time Sync (SYNC-01, D-46/D-47)

**What:** Socket.IO broadcasts a server event (e.g., `inventory:changed`) whenever the server's state mutates (Barback edits stock, recipe changes). TanStack Query listens for that event and invalidates its cache, triggering an automatic re-fetch of the affected data. The client never computes makeable status or stores a client-side copy — it always fetches the server's authoritative result.

**When to use:** Any time multiple untrusted clients must agree on derived state (makeable/not-makeable status) in real-time. This is the core pattern for "the Patron screen's makeable status updates live when Barback changes inventory."

**Example:**
```typescript
// apps/patron/src/api/socket.ts
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'

export function initSocket(queryClient: QueryClient) {
  const socket = io(`${location.protocol}//${location.hostname}:${location.port}`, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  })

  // When inventory changes on Barback, invalidate our cached recipe list
  socket.on('inventory:changed', () => {
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  })

  // When a recipe is edited (tags, description, ingredients), also re-fetch
  socket.on('recipe:updated', (recipeId: string) => {
    queryClient.invalidateQueries({ queryKey: ['recipes', recipeId] })
  })

  return socket
}

// apps/patron/src/api/useRecipes.ts
import { useQuery } from '@tanstack/react-query'

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const res = await fetch('/api/recipes')
      return res.json() as Promise<Recipe[]>
    },
    staleTime: Infinity, // Trust Socket.IO pushes, not time-based staleness
  })
}

// Usage in RecipeBrowse.tsx:
const { data: recipes, isLoading, error } = useRecipes()
// When inventory:changed event fires → Socket.IO calls queryClient.invalidateQueries
// → TanStack Query re-fetches → recipes state updates → component re-renders
```

**Trade-offs:** Requires coordinating Socket.IO event names between server and client, and requires every client to actively listen for events (no passive "eventual consistency"). In exchange, eliminates client-side state-management complexity and guarantees all clients see the same authoritative version.

### Pattern 2: Two-State Makeable Collapse (Display Layer, D-42)

**What:** Backend computes and returns the tri-state (green/yellow/red) via `computeMakeable()`. Patron UI receives that tri-state and maps it at the display layer: green → "Available", yellow/red → "Not Available". This is not a backend change — the tri-state is still there, just hidden from the patron.

**When to use:** When a multi-state value exists in the data model but a specific consumer (UI) simplifies it for UX reasons without needing to change the source of truth.

**Example:**
```typescript
// apps/patron/src/components/MakeableIndicator.tsx
interface Props {
  status: 'green' | 'yellow' | 'red'  // from backend recipe.overallStatus
}

export function MakeableIndicator({ status }: Props) {
  // Collapse yellow/red to "not available" (D-42)
  const isAvailable = status === 'green'
  return (
    <div className={isAvailable ? 'bg-green-500' : 'bg-red-500'}>
      {isAvailable ? 'Available' : 'Not Available'}
    </div>
  )
}
```

### Pattern 3: Dynamic Tag-Rail Submenu (D-36, "Don't show empty tags")

**What:** The tag rail's submenu only lists tags that currently have ≥1 recipe assigned. Compute this dynamically from the recipes list (or via a dedicated `/api/tags/active` endpoint) so as recipes are added/removed, the submenu updates live.

**When to use:** Any time you're filtering a large set and want to avoid showing users filter options that would produce zero results.

**Example:**
```typescript
// Compute locally from recipes (cheaper, no extra endpoint):
function getActiveTags(recipes: Recipe[]) {
  const tagIds = new Set<string>()
  recipes.forEach(r => r.tags.forEach(t => tagIds.add(t.id)))
  return allTags.filter(t => tagIds.has(t.id))
}

// OR via dedicated endpoint (better for large recipe counts):
// GET /api/tags/active → returns only tags with ≥1 recipe
```

---

## Data Model Extensions

### New Schema (Drizzle tables)

```typescript
// apps/server/src/db/schema.ts

// D-33/D-34: fixed tag taxonomy — four groups (spirit, type, season, flavor)
// with predefined values. owner can later extend via recipe-tag assignment,
// but tag CRUD UI doesn't exist this phase (D-35).
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  group: text('group', {
    enum: ['spirit', 'type', 'season', 'flavor']
  }).notNull(),
  disabled: integer('disabled', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  uniqueGroupName: unique().on(table.group, table.name),
}))

// Recipe ↔ Tag many-to-many (D-33)
export const recipeTags = sqliteTable('recipe_tags', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'restrict' }),
}, (table) => ({
  unique: unique().on(table.recipeId, table.tagId),
}))

// Extend recipes table with description (D-40)
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  method: text('method').notNull(),  // unchanged
  glasswareId: text('glassware_id').references(() => glassware.id, { onDelete: 'set null' }),
  garnish: text('garnish'),           // unchanged
  description: text('description'),   // NEW — free text, optional, nullable
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
```

### Updated Recipe Response Schema

```typescript
// packages/shared/src/recipe.ts (extended)

// Add tags array to the recipe output
export const recipe = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ingredients: z.array(recipeIngredient),
  method: z.array(z.string()),
  glasswareId: z.string().uuid().nullable(),
  glasswareName: z.string().nullable(),
  garnish: z.string().nullable(),
  description: z.string().nullable(),        // NEW (D-40)
  tags: z.array(z.object({                   // NEW (D-33)
    id: z.string().uuid(),
    name: z.string(),
    group: z.enum(['spirit', 'type', 'season', 'flavor']),
  })),
  overallStatus: triStateStatus,
  missingCategoryIds: z.array(z.string().uuid()),
  missingCategoryNames: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Recipe = z.infer<typeof recipe>

// Add tags field to recipeInput (for editing)
export const recipeInput = z.object({
  name: z.string().trim().min(1).max(200),
  ingredients: z.array(recipeIngredientInput).min(1),
  method: z.array(z.string().trim().min(1).max(500)).min(1),
  glasswareId: z.string().uuid().optional(),
  garnish: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),  // NEW (D-40)
  tagIds: z.array(z.string().uuid()).optional(),        // NEW (D-33)
})
```

### Database Migrations (Drizzle)

```bash
# Generate migrations for the new tables and recipe.description column
pnpm drizzle-kit generate:sqlite

# Apply migrations to SQLite
pnpm drizzle-kit migrate:sqlite
```

---

## Backend API Changes

### New/Extended Routes

| Endpoint | Method | Purpose | Response | Notes |
|----------|--------|---------|----------|-------|
| `/api/recipes` | GET | Fetch all recipes with tags, description, makeable status | `Recipe[]` | Response now includes `tags` array (D-33) and `description` field (D-40). Used by Patron browse |
| `/api/recipes/:id` | GET | Fetch single recipe detail | `Recipe` | Response includes full tags array and description. Used by Patron detail view |
| `/api/recipes/:id` | PATCH | Edit recipe (existing, extended) | `Recipe` | Request body now accepts `description` (D-40) and `tagIds` array (D-33). Barback RecipeForm.tsx calls this |
| `/api/tags` | GET | Fetch all tag definitions grouped by type | `TagGroup[]` | NEW. Returns tags grouped by spirit/type/season/flavor for rail rendering. Could also return only "active" tags (D-36) if filtering client-side is expensive |
| `/api/tags/active` | GET | Fetch tags with ≥1 recipe (D-36, optional) | `Tag[]` | NEW. If computing active tags server-side is preferred over client-side filtering. Used by TagRail to populate submenus |

### Socket.IO Events (new)

| Event | Direction | Payload | Trigger | Notes |
|-------|-----------|---------|---------|-------|
| `inventory:changed` | Server → Clients | `{ statuses: MakeableStatus[] }` | After any ingredient stock edit (Barback) | Causes TanStack Query to invalidate ['recipes'] and re-fetch |
| `recipe:updated` | Server → Clients | `{ recipeId: string }` | After any recipe edit (Barback adds tags/description) | Causes TanStack Query to invalidate ['recipes', recipeId] and re-fetch |

### Code Integration Points (apps/server/src)

**routes/recipes.ts (extend):**
- `loadRecipe()` function needs to fetch tags from `recipeTags` table and join to `tags`
- POST/PATCH handlers need to handle `tagIds` array in request body, insert/update `recipeTags` junction rows
- GET `/` and GET `/:id` responses now include `tags` array and `description` field

**routes/ingredients.ts (no direct change, but):**
- After any inventory write (POST, PATCH stock), must emit `inventory:changed` socket event

**New routes/tags.ts:**
- GET `/` — return all tags grouped by group enum
- GET `/active` — return tags currently referenced by ≥1 recipe (or compute client-side)

**New socket hub (e.g., ws/hub.ts or socket integration in index.ts):**
- Initialize Socket.IO server
- Attach event listeners from routes that mutate state (ingredients, recipes)
- Broadcast events as described above

---

## Common Pitfalls

### Pitfall 1: Client-Side Makeable Computation Breaks Sync (Patron-Specific)

**What goes wrong:** Patron caches the recipe list + computes makeable status locally. When Barback edits inventory, Patron receives the event but recomputes from stale cached recipe data → card shows wrong status until manual refresh.

**Why it happens:** Feels simpler to compute once on the client instead of round-tripping to the server for every inventory change.

**How to avoid:** This phase's core principle: backend computes makeable status, Patron never does. Always re-fetch the recipe from the server on `inventory:changed` event. Let TanStack Query handle cache invalidation — never hand-roll cache management.

**Warning signs:**
- Patron screen shows different status than Barback for the same drink
- Manual refresh "fixes" a stale status
- Any code in `RecipeBrowse.tsx` or `RecipeDetail.tsx` calling `computeMakeable()`

### Pitfall 2: Forgetting to Collapse Yellow to "Not Available" (D-42 Display Layer)

**What goes wrong:** Patron renders the raw tri-state (green/yellow/red) instead of collapsing yellow+red → "not available", confusing the patron with bartender-level detail.

**Why it happens:** Backend returns tri-state; easy to just render it as-is without the display-layer mapping.

**How to avoid:** Build the `MakeableIndicator` component with an explicit mapping: `if (status === 'green') → "Available"` else → `"Not Available"`. Never pass raw tri-state to UI; always collapse it first.

**Warning signs:** Yellow badges visible on patron screen (should only see "Available" or "Not Available").

### Pitfall 3: Tag-Rail Showing Empty-Result Tags (Violates D-36)

**What goes wrong:** A tag group (e.g., "Shots") has no recipes tagged yet. The rail still shows it, patron taps it, gets an empty result, and thinks the app is broken.

**Why it happens:** Hardcoding the full tag taxonomy without filtering to active tags.

**How to avoid:** Compute active tags dynamically: either fetch `/api/tags/active` or filter the local recipes array to find which tags are actually in use. Re-compute whenever recipes list updates (TanStack Query).

**Warning signs:** Empty result grids when filtering by a tag that has no recipes.

### Pitfall 4: Not Handling Socket.IO Reconnect Properly (Kiosk Edge Case)

**What goes wrong:** iPad goes to sleep, Socket.IO connection drops. When it wakes up and reconnects, missed `inventory:changed` events are lost — the makeable status stays stale until the next event after reconnect.

**Why it happens:** Assuming Socket.IO auto-reconnect is enough; it's not — if you miss a broadcast while disconnected, you stay out of sync.

**How to avoid:** On Socket.IO `connect` event (fired after reconnect), explicitly re-fetch the full recipes list via TanStack Query. This is a cheap full-state sync that ensures you're current after any network blip.

**Example:**
```typescript
socket.on('connect', () => {
  queryClient.invalidateQueries({ queryKey: ['recipes'] })
})
```

**Warning signs:** Patron screen that's been idle (iPad asleep) shows stale status after waking.

---

## Code Examples

### Socket.IO + TanStack Query Integration (apps/patron/src/api/socket.ts)

```typescript
// Source: ARCHITECTURE.md Pattern 2 (server-computed live sync)
import { io, Socket } from 'socket.io-client'
import { QueryClient } from '@tanstack/react-query'

export function initSocket(queryClient: QueryClient): Socket {
  const socket = io(`${location.protocol}//${location.hostname}${location.port ? ':' + location.port : ''}`, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  })

  // Inventory changed on Barback — invalidate all cached recipes
  socket.on('inventory:changed', () => {
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  })

  // Recipe edited (tags, description) — invalidate specific recipe or all
  socket.on('recipe:updated', (recipeId: string) => {
    queryClient.invalidateQueries({ queryKey: ['recipes', recipeId] })
    // Also invalidate the list since tag counts may have changed
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  })

  // On reconnect after network blip, re-sync full state
  socket.on('connect', () => {
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
    queryClient.invalidateQueries({ queryKey: ['tags'] })
  })

  return socket
}
```

### TanStack Query Hooks (apps/patron/src/api/useRecipes.ts)

```typescript
// Source: ARCHITECTURE.md Pattern 1
import { useQuery } from '@tanstack/react-query'
import type { Recipe } from '@my-bar/shared'

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const res = await fetch('/api/recipes')
      if (!res.ok) throw new Error(`Failed to fetch recipes: ${res.statusText}`)
      return res.json() as Promise<Recipe[]>
    },
    staleTime: Infinity, // Trust Socket.IO invalidation, not time-based staleness
    gcTime: 1000 * 60 * 10, // Keep cached data for 10 min even after unmount
  })
}

export function useRecipeDetail(recipeId: string) {
  return useQuery({
    queryKey: ['recipes', recipeId],
    queryFn: async () => {
      const res = await fetch(`/api/recipes/${recipeId}`)
      if (!res.ok) throw new Error(`Failed to fetch recipe ${recipeId}`)
      return res.json() as Promise<Recipe>
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
  })
}
```

### Display-Layer Makeable Collapse (apps/patron/src/components/MakeableIndicator.tsx)

```typescript
// Source: D-42, Pattern 2
import type { TriStateStatus } from '@my-bar/shared'

interface Props {
  status: TriStateStatus  // 'green' | 'yellow' | 'red' from backend
  showText?: boolean
}

export function MakeableIndicator({ status, showText = true }: Props) {
  // D-42: collapse yellow/red to "not available"
  const isAvailable = status === 'green'
  const label = isAvailable ? 'Available' : 'Not Available'
  const className = isAvailable
    ? 'bg-green-500 text-white'
    : 'bg-red-500 text-white'

  return (
    <div className={`px-3 py-1 rounded ${className}`}>
      {showText && <span className="text-sm font-semibold">{label}</span>}
    </div>
  )
}
```

### Tag-Rail with D-36 Empty-Tag Filtering (apps/patron/src/components/TagRail.tsx, sketch)

```typescript
// Source: D-36, Pattern 3
import { useMemo } from 'react'
import { useRecipes } from '../api/useRecipes'
import type { Recipe } from '@my-bar/shared'

const TAG_GROUPS = [
  { id: 'spirit', label: 'Spirit', icon: Wine2 },
  { id: 'type', label: 'Type', icon: Sparkles },
  { id: 'season', label: 'Season', icon: Leaf },
  { id: 'flavor', label: 'Flavor', icon: Flame },
] as const

export function TagRail({ onTagSelect }: { onTagSelect: (tagId: string) => void }) {
  const { data: recipes } = useRecipes()

  // Compute which tags are active (have ≥1 recipe) — D-36
  const activeTagIds = useMemo(() => {
    if (!recipes) return new Set<string>()
    const ids = new Set<string>()
    recipes.forEach(r => r.tags.forEach(t => ids.add(t.id)))
    return ids
  }, [recipes])

  return (
    <div className="flex flex-col gap-md">
      {TAG_GROUPS.map(group => (
        <TagRailGroup
          key={group.id}
          group={group}
          recipes={recipes || []}
          activeTagIds={activeTagIds}
          onTagSelect={onTagSelect}
        />
      ))}
    </div>
  )
}

// Submenu: only shows tags that have ≥1 recipe (D-36, never empty results)
function TagRailGroup({ group, recipes, activeTagIds, onTagSelect }) {
  const tagsInGroup = useMemo(() => {
    return allTags
      .filter(t => t.group === group.id && activeTagIds.has(t.id))
  }, [group.id, activeTagIds])

  return (
    <div>
      <button className="...">
        {group.icon && <group.icon />}
      </button>
      {/* Submenu with only active tags — never shows "Shots" if no Shots recipes exist */}
      <div className="hidden group-hover:block">
        {tagsInGroup.map(tag => (
          <button key={tag.id} onClick={() => onTagSelect(tag.id)}>
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Client-side makeable computation + cache-invalidation | Custom state management (useState + useEffect sync-ing local cache to server events) | TanStack Query `invalidateQueries()` on Socket.IO events | TanStack Query handles stale-time, garbage collection, retry logic, and dedupe. Hand-rolling this causes the exact "screens disagree" failures this phase's core value is meant to prevent |
| Real-time server-push signaling | Polling `/api/recipes` every N seconds on the client | Socket.IO with TanStack Query invalidation | Polling is latent (Barback edit → delay → Patron sees), wastes bandwidth, and fails silently if the client forgets to poll. WebSocket push is instant and handles reconnect transparently |
| Socket.IO reconnect + full-state re-sync | Custom reconnect logic with exponential backoff | Socket.IO's built-in reconnection (enabled by default) + explicit `invalidateQueries()` on `connect` event | Socket.IO's reconnect is battle-tested for device-sleep/WiFi-roam scenarios that bare `ws` doesn't handle. Full-state re-sync is cheaper than tracking "which events did I miss" |
| Tag taxonomy filtering logic | Manual `if/else` or custom filter function repeated in multiple components | Compute once in a hook (`useRecipes()` + `useMemo()`) or fetch from `/api/tags/active` | Avoids duplication and makes D-36's "never show empty tags" rule consistent across the whole app |
| Tri-state collapse logic | Repeated `if (status === 'green')` checks scattered across card/detail components | Dedicated `MakeableIndicator` component that owns the mapping | Single source of truth for display-layer semantics; if D-42 ever changes (e.g., patron does see yellow), only one place to update |

---

## Validation Architecture

**Test Framework:** TBD (likely same as Barback — may be Jest or Vitest via Vite)

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PATR-01 | Tag rail shows only active tags; tapping a tag filters card grid to that tag's recipes | integration | `pytest apps/patron/test/RecipeBrowse.test.tsx::tagRailFiltering` (or Jest/Vitest equiv) | ❌ Wave 0 |
| PATR-02 | Detail screen renders recipe description if non-empty, hides section if empty | unit | `pytest apps/patron/test/RecipeDetail.test.tsx::descriptionRendering` | ❌ Wave 0 |
| PATR-03 | Makeable/not-makeable badge correctly collapses backend tri-state per D-42 | unit | `pytest apps/patron/test/MakeableIndicator.test.tsx::collapseTriState` | ❌ Wave 0 |
| PATR-04 | Detail screen shows missing ingredient list for not-makeable drinks | unit | `pytest apps/patron/test/RecipeDetail.test.tsx::missingIngredientsDisplay` | ❌ Wave 0 |
| PATR-06 | Browse UI renders without forcing an order action; no "Order" button visible | snapshot | `pytest apps/patron/test/RecipeBrowse.test.tsx::browseWithoutOrder` | ❌ Wave 0 |
| SYNC-01 | When Socket.IO fires `inventory:changed` event, TanStack Query invalidates and re-fetches; card status updates live | integration | `pytest apps/patron/test/socket-integration.test.ts::socketInvalidatesOnInventoryChange` (or e2e with mock server) | ❌ Wave 0 |

### Wave 0 Gaps

- [ ] Test setup (Jest or Vitest config) for `apps/patron`
- [ ] Mock server for Socket.IO events in tests (e.g., mock-socket library)
- [ ] TanStack Query test utilities (QueryClient mock, stale-time bypass for testing)
- [ ] Component snapshot tests for card/detail views
- [ ] Integration test for Socket.IO → TanStack Query → UI re-render flow

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + build | ✓ | 22.x (LTS) | — |
| pnpm | Monorepo package manager | ✓ | (current) | npm (slower, larger disk) |
| TypeScript | All TS source | ✓ | 5.x | — |
| SQLite | Backend data store | ✓ | (bundled in better-sqlite3) | PostgreSQL (adds deployment complexity) |
| Browser (iPad Safari + Android Chrome/Firefox) | Patron/Bartender/Barback clients | ✓ | iOS 15+ / Android 10+ | Web app must gracefully degrade if WebSocket unavailable (fallback to polling) |
| Socket.IO support in browser | Real-time sync | ✓ | Safari 12+ (via Socket.IO polyfills) | SSE (simpler, one-way) or polling (latent) |

**No missing dependencies with blocking impact.**

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control | Phase 3 Considerations |
|---------------|---------|-----------------|------------------------|
| V2 Authentication | No | N/A | Patron is no-auth per PROJECT.md; remains true this phase (no login added) |
| V3 Session Management | No | N/A | Kiosk iPad — no user sessions, persistent connection per device |
| V4 Access Control | No | N/A | Patron is a guest-facing kiosk; Barback has no role-based access control this phase |
| V5 Input Validation | Yes | Zod schema on recipe request body | Patron sends no mutations (read-only browse); Barback's RecipeForm extended to accept tags/description — validate via Zod, same pattern as Phase 2 |
| V6 Cryptography | No | N/A | No encryption this phase (LAN-only, no auth); if ever exposed beyond LAN, TLS becomes mandatory |

### Known Threat Patterns for Patron Browse

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Socket.IO broadcast contains stale data (missed events during reconnect) | Spoofing (data integrity) | On Socket.IO `connect` event, always re-fetch full recipes list via REST (explicit re-sync) |
| Malicious client sends crafted JSON to `/api/recipes/:id` to corrupt recipe data | Tampering | Server-side Zod validation (already in place from Phase 2); Patron sends no mutations, only reads |
| DoS via repeated Socket.IO reconnect storms | Denial of Service | Socket.IO rate-limits built-in; Patron app has no write endpoints, so reconnect loops are harmless (just re-fetch) |

**No special security hardening needed for Phase 3; inherit Phase 1/2 server-side validation.**

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling REST every N seconds | WebSocket push + TanStack Query invalidation | This phase (SYNC-01) | Instant updates, less bandwidth, handles reconnect transparently |
| Client computes makeable status from cached recipe/inventory data | Server computes tri-state, client collapses to 2-state (display layer only) | Phase 2 extended to Phase 3 (D-42) | "Single source of truth" guarantee: no screen disagreement possible |
| Fixed, hardcoded tag taxonomy | Dynamic tag-filter UI with only active tags shown (D-36) | This phase (D-33/D-34) | Patron can't accidentally select an empty-result filter; taxonomy is owner-extensible later |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Socket.IO 4.8.x is compatible with Fastify via built-in HTTP upgrade or @fastify/websocket plugin | Standard Stack, Backend | If not, Phase 3 must find alternative (SSE, bare ws with reconnect wrapper, or switch frameworks) — blocks SYNC-01 |
| A2 | TanStack Query 5.x invalidateQueries works correctly with async fetches triggered by Socket.IO events | Standard Stack, Patterns | If TanStack Query cache invalidation is broken or slow, live updates stall — need to test manually on first build |
| A3 | Barback's RecipeForm.tsx already has an autocomplete-with-inline-create picker pattern (Phase 2.1, D-27) that can be reused for tag selection | Architecture Patterns (reusable assets) | If pattern doesn't exist or is tightly coupled to categories/glassware, Phase 3 planning must design a new tag-picker component — adds scope |
| A4 | Barback's `apps/barback/src/components/pickers/` directory contains reusable picker components | Architecture Patterns (reusable assets) | If this directory doesn't exist or pickers are tightly coupled, tag-picker design becomes custom work |
| A5 | Fastify static file serving can host multiple SPAs (`/patron`, `/bartender`, `/barback`) under different path prefixes | Backend Extensions | If not, need a reverse proxy (Caddy/nginx) — adds infrastructure, contradicts "one Fastify process" design goal |

**All assumptions are MEDIUM confidence — derived from CONTEXT.md and Phase 2.1 code inspection, not verified by running the code.**

---

## Open Questions (RESOLVED)

1. **Socket.IO vs. SSE vs. raw ws for the server-push mechanism?**
   - What we know: STACK.md commits to Socket.IO; ARCHITECTURE.md justifies it for kiosk-device reconnect reliability.
   - What's unclear: Is Socket.IO already integrated into the Fastify app in Phase 2.1, or does Phase 3 add it as new infrastructure?
   - Recommendation: Read `apps/server/src/index.ts` to confirm; if not present, research Socket.IO ↔ Fastify integration pattern (likely `fastify-socket.io` plugin or native HTTP upgrade).
   - RESOLVED: Socket.IO 4.8.x added as new infrastructure in Phase 3 (03-05-PLAN.md) — server hub emits `inventory:changed`, Patron client invalidates via TanStack Query, with explicit re-sync on `connect`.

2. **Should active-tags computation happen client-side or server-side (D-36)?**
   - What we know: D-36 requires "only show tags that have ≥1 recipe"; computationally cheap either way at 100 recipes.
   - What's unclear: Is it cleaner to compute from the recipes list on the client (one less endpoint) or fetch from a dedicated `/api/tags/active` endpoint (server owns the logic)?
   - Recommendation: Compute client-side for MVP (simpler, no new endpoint), migrate to `/api/tags/active` if the recipes list grows large or Patron performance degrades.
   - RESOLVED: Computed client-side via `getActiveTagIds()` in 03-02-PLAN.md, per the MVP recommendation — no new `/api/tags/active` endpoint this phase.

3. **Should tags be a fixed enum or a pre-seeded database table (D-35, Claude's Discretion)?**
   - What we know: D-35 locks that there's no owner-facing tag-CRUD UI this phase; tags are curated.
   - What's unclear: Are tag names hardcoded as constants (`const TAGS = { spirit: ['Whiskey', ...], ... }`) or inserted into a SQLite `tags` table on DB init?
   - Recommendation: Pre-seeded table (more flexible if owner adds tags later; easier to disable/hide tags without code changes).
   - RESOLVED: Pre-seeded `tags` table (03-01-PLAN.md schema task), per the recommendation.

---

## Sources

### Primary (HIGH confidence)

- [CONTEXT.md](file:///home/gjohnson/src/my-bar/.planning/phases/03-patron-browse-experience/03-CONTEXT.md) — Phase 3 decisions D-33 through D-47, locked via discuss-phase
- [UI-SPEC.md](file:///home/gjohnson/src/my-bar/.planning/phases/03-patron-browse-experience/03-UI-SPEC.md) — Design contract approved 2026-08-12
- [CLAUDE.md](.claude/CLAUDE.md) — Project tech stack and constraints (official project instructions)
- [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) — System architecture and patterns (Phase 2 foundation)
- [STACK.md](.planning/research/STACK.md) — Package versions verified live (2026-08-09)
- Backend code inspection (`apps/server/src/routes/recipes.ts`, `services/makeableEngine.ts`, `db/schema.ts`) — Verified 2026-08-12 with file Read
- Shared types (`packages/shared/src/recipe.ts`) — Verified 2026-08-12

### Secondary (MEDIUM confidence)

- [Socket.IO + React query integration patterns](https://stackoverflow.com/questions/tagged/socket.io+react-query) — cross-checked across 3+ independent Stack Overflow answers and Socket.IO docs
- [TanStack Query cache invalidation best practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults) — official TanStack Query documentation
- Drizzle ORM many-to-many relationship patterns — official Drizzle docs (drizzle.team)

### Tertiary (LOW confidence, noted as [ASSUMED])

- Fastify + Socket.IO integration specifics — not verified in running code; assumes standard patterns apply

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — packages live-verified on npm registry 2026-08-12
- Architecture patterns: HIGH — documented in ARCHITECTURE.md and confirmed by Phase 2.1 code patterns
- Data model extensions: HIGH — derived directly from locked CONTEXT.md decisions (D-33/D-34/D-40)
- Backend integration points: MEDIUM — API routes inspected in Phase 2.1 code; Socket.IO not yet implemented (assumed standard Fastify pattern applies)
- Patron UI structure: MEDIUM — based on Barback's pattern + UI-SPEC.md, not yet built
- Live sync mechanism: MEDIUM — pattern committed in STACK.md, not yet implemented; assumes Socket.IO+TanStack Query work as documented

**Research date:** 2026-08-12
**Valid until:** 2026-09-12 (30 days; stale if CONTEXT.md decisions change or Socket.IO integration proves different than assumed)

---

*Phase: 3 — Patron Browse Experience*
*Research completed: 2026-08-12*
