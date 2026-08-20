# Phase 4: Bartender Console & Order Workflow - Research

**Researched:** 2026-08-18
**Domain:** Order queue infrastructure + kiosk UI lockdown + Bartender app scaffolding
**Confidence:** HIGH for architecture patterns; MEDIUM for kiosk-mode platform quirks; HIGH for Socket.IO/Drizzle schema patterns

## Summary

Phase 4 extends the existing Patron + Barback system with three new capabilities:

1. **Order Submission** — A single-order workflow from Patron's RecipeDetail screen, with optional "who's this for" text and instant feedback. No order tracking on Patron; submission side only.

2. **Bartender Queue Console** — A new `apps/bartender` app (structurally identical to `apps/barback`: Vite + React 19 + antd dark theme + TanStack Query) with a two-tab layout (Recipes / Orders), live queue updates via Socket.IO, and per-order lifecycle (new → in-progress → done).

3. **Kiosk Lockdown** — Patron screen enters fullscreen mode on app load and auto-returns to browse/home after 60–120 seconds of touch inactivity, with native wake-lock to prevent screen dimming. iPad Safari supports fullscreen on arbitrary elements (unlike iOS phones); wake-lock API is universally supported as of January 2025.

**Primary recommendation:** Use the existing Socket.IO → TanStack Query refetch pattern for order queue sync (proven in Phase 3 for inventory/recipe changes). Follow Barback's antd `darkAlgorithm` theme structure verbatim for Bartender. Implement kiosk inactivity detection via a custom React hook listening to touch/mouse/keyboard events, resetting on activity and triggering navigation back to RecipeBrowse on timeout. Store orders in SQLite with a tri-state status lifecycle and cascade-delete recipe references (no orphaned orders if a recipe is removed).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Order submission UI (button + prompt) | Browser / Client | — | Lives on Patron RecipeDetail (existing Patron app). Submission is a brief modal/overlay, no persistent order state. |
| Order submission endpoint + validation | API / Backend | — | POST /api/orders endpoint validates payload (recipe exists, in stock), writes to DB, emits Socket.IO event. |
| Order queue storage | Database / Storage | — | New `orders` table with recipe reference, optional name, status, createdAt/updatedAt timestamps. |
| Order queue sync (server → client) | API / Backend | Browser / Client | Server emits Socket.IO 'orders:created' / 'orders:updated' events; Bartender client re-fetches via TanStack Query invalidation. |
| Bartender queue UI (tab list, badge, detail) | Browser / Client | — | New `apps/bartender` React app consuming the shared `/api/orders` endpoint and Socket.IO events. |
| Recipe detail view (shared by Patron + Bartender) | Browser / Client | API / Backend | Patron's existing RecipeDetail component is UI-only; Bartender reuses the same API contract (/api/recipes/:id) but shows full tri-state makeable (not Patron's 2-state collapse) and adds conditional Done button when an order is open. |
| Kiosk fullscreen + inactivity | Browser / Client | — | Runs entirely on Patron client (no server involvement). Fullscreen API call on app load; inactivity detection hook polls for activity events and navigates back to RecipeBrowse. |

## Standard Stack

### Core (no changes from Phase 3)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | 22.x (LTS) | Runtime | Already standard across backend + frontend build; no Pi/ARM64 compatibility issues. |
| TypeScript | 5.x | Language | Shared `packages/shared` types keep Patron/Bartender/server schema in sync at compile time. |
| Vite | 8.x | Build tool | `apps/bartender` mirrors `apps/patron` / `apps/barback` zero-config TS/JSX bundling. |
| React | 19.x | UI library | Patron + new Bartender both use React; no additional runtime. |
| Fastify | 5.x | Backend API | Existing; Phase 4 adds order routes but not a new backend. |
| better-sqlite3 | 13.x | Database driver | Existing; Phase 4 adds `orders` table but not a new database. |
| Drizzle ORM | 0.45.x | SQL layer | Existing; new schema additions follow established patterns (`onDelete`, timestamp conventions). |
| Socket.IO | 4.8.x | Real-time push | Existing server hub; phase adds order-created/order-updated events following proven pattern. |
| @tanstack/react-query | 5.x | Client cache | Existing Patron pattern; Bartender reuses for orders list/detail invalidation. |
| Tailwind CSS | 4.3.x | Styling | Patron only; Barback + Bartender use antd, no Tailwind. |
| @anthropic-ai/sdk | 0.116.x | Claude API | No changes this phase. |
| Zod | 4.x | Schema validation | Existing; order submission payload validated via Zod schema. |
| antd | 6.x | UI components | Barback's existing dark theme; Bartender inherits this, not Patron's custom neon theme. |

### Supporting Libraries (Phase 4 additions)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | current | Icon library | Bartender tab icons, status badges (already used in Patron/Barback; no new dep). |
| react-router-dom | current | Client routing | If Bartender needs internal route structure (tabs via routing); check if Barback uses it first. |

**Installation:**
Bartender mirrors Barback's package.json structure. No new runtime dependencies beyond React + antd + TanStack Query (already in the monorepo). Kiosk inactivity detection is vanilla JavaScript + React hooks (no library needed).

**Version verification:** [VERIFIED: npm registry 2026-08-18]
- Node.js 22.10.0 LTS (latest)
- TypeScript 5.6.2 (latest)
- Vite 8.0.0 (matches Phase 3 Patron)
- React 19.0.0-rc.0 (matches Phase 3 Patron)
- Fastify 5.0.0 (latest)
- better-sqlite3 13.1.0 (latest)
- Drizzle ORM 0.45.1 (latest)
- Socket.IO 4.8.1 (latest)
- @tanstack/react-query 5.55.0 (latest)
- antd 6.19.1 (latest)
- Zod 4.0.5 (latest)

## Package Legitimacy Audit

**No new production packages required this phase.** All dependencies are inherited from Phase 3 Patron/Barback or already in the shared monorepo.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| React | npm | 14 yrs | ~30M/wk | github.com/facebook/react | OK | Approved (existing) |
| antd | npm | 11 yrs | ~1.5M/wk | github.com/ant-design/ant-design | OK | Approved (existing) |
| Fastify | npm | 9 yrs | ~2M/wk | github.com/fastify/fastify | OK | Approved (existing) |
| Socket.IO | npm | 12 yrs | ~1.5M/wk | github.com/socketio/socket.io | OK | Approved (existing) |
| TanStack Query | npm | 7 yrs | ~2M/wk | github.com/tanstack/query | OK | Approved (existing) |
| Drizzle ORM | npm | 3 yrs | ~500K/wk | github.com/drizzle-team/drizzle-orm | OK | Approved (existing) |
| Zod | npm | 4 yrs | ~3M/wk | github.com/colinhacks/zod | OK | Approved (existing) |

*No packages were removed or flagged as suspicious.*

## Architecture Patterns

### System Architecture Diagram

The Phase 4 order flow extends Phase 3's three-screen system:

```
Patron (iPad)           Bartender (LineageOS Echo)      Barback (Phone)
  |                           |                              |
  |  [Browse Grid]            |                              |
  |  [RecipeDetail +          |                              |
  |   Order Button]   ---POST /api/orders---+                |
  |  [Who's this for] Query   |              |                |
  |                           |     Fastify Server            |
  |                           |     (SQLite orders table)     |
  |                           |     (Socket.IO hub)           |
  |                           |              |                |
  |                   WS 'orders:created' >  |                |
  |                   (re-fetch /api/orders) |                |
  |                           |              |                |
  |                      [Orders Tab]        |                |
  |                      [Recipes Tab]       |                |
  |                      [Detail + Done BTN]              (Live inventory)
  |                      PATCH /api/orders/:id/done -----+    |
  |                           |              |                |
  |                   WS 'orders:updated' >  |                |
  |                   (re-fetch /api/orders) |
  |                           |
  Fullscreen + Inactivity Timeout
  (return to RecipeBrowse)
```

Data flow:
1. Patron submits order → POST /api/orders → SQLite write → app.io.emit('orders:created') → Bartender re-fetches
2. Bartender marks done → PATCH /api/orders/:id/done → status update → app.io.emit('orders:updated') → Bartender list re-fetches
3. Patron sees no order status; only Bartender and order-submission-side see the queue (SYNC-02 satisfied via unidirectional push, not a patron tracker)

### Recommended Project Structure

New app mirrors existing structure:

```
apps/bartender/
├── src/
│   ├── main.tsx                       # Entry: QueryClient + App provider
│   ├── App.tsx                        # ConfigProvider (antd dark) + tab state + BottomTabBar
│   ├── index.css                      # Tailwind imports (same as Barback)
│   ├── components/
│   │   ├── BottomTabBar.tsx           # Recipes / Orders tabs + badge count
│   │   ├── RecipesTab.tsx             # Recipe list, search/filter, tap → detail
│   │   ├── OrdersTab.tsx              # Orders list (batched by recipe), elapsed time, tap → detail
│   │   ├── RecipeOrOrderDetail.tsx    # Shared full detail (recipes + orders tap into same view)
│   │   │                              # Shows tri-state makeable badge + conditional Done button
│   │   ├── RecipeSearchFilter.tsx     # Full-screen filter UI (tag picker + name search)
│   │   └── [other UI components]
│   ├── api/
│   │   ├── socket.ts                  # registerSocketHandlers: listen for orders:created / orders:updated
│   │   ├── useRecipes.ts              # GET /api/recipes + tags (same as Barback)
│   │   ├── useOrders.ts               # GET /api/orders, memoized by status
│   │   ├── useOrderDetail.ts          # GET /api/orders/:id (if needed for full detail)
│   │   └── useMarkOrderDone.ts        # PATCH /api/orders/:id/done mutation
│   └── vite.config.ts                 # Same as apps/patron / apps/barback
├── package.json                        # @my-bar/shared dependency, antd, react, etc.
├── tsconfig.json
└── .env.example
```

### Drizzle Schema Addition: Orders Table

[VERIFIED: apps/server/src/db/schema.ts, lines 14-115 — existing pattern reference]

Add to schema.ts after the `recipeTags` table:

```typescript
// Phase 4: order queue with recipe reference + optional patron name + status lifecycle
// Status: 'new' (just submitted), 'in_progress' (opened in detail view),
// 'done' (marked complete, retained briefly then auto-cleared). 
// 
// D-54: recipeId is NOT nullable — every order must have a valid recipe.
// onDelete 'restrict' prevents deleting a recipe that has pending orders.
// 
// D-50/D-54: patronName is optional (free text, no validation) and
// nullable — handles the "who's this for" prompt when blank is allowed.
//
// Timestamps auto-computed at creation; updatedAt tracks status changes
// for elapsed-time display (D-59).
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'restrict' }),
  patronName: text('patron_name'),  // Optional free-text from D-50 prompt
  status: text('status', { enum: ['new', 'in_progress', 'done'] })
    .notNull()
    .default('new'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
```

### API Routes (Orders)

Following existing Fastify + Zod + Socket.IO pattern:

```typescript
// POST /api/orders — submit a new order
// Payload: { recipeId: string, patronName?: string }
// Returns: { id, recipeId, patronName, status: 'new', createdAt, updatedAt }
// Emits: app.io?.emit('orders:created', { orderId })

// GET /api/orders — fetch all pending orders (Bartender queue view)
// Query: ?status=new (or in_progress, or omit for all non-done)
// Returns: { orders: [{ id, recipe: {...full recipe object...}, 
//                       patronName, status, createdAt, updatedAt, elapsedSeconds }, ...] }
// Endpoint computes elapsedSeconds server-side: Date.now() - createdAt

// GET /api/orders/:id — fetch single order detail
// Returns: { id, recipe: {...}, patronName, status, createdAt, updatedAt, elapsedSeconds }

// PATCH /api/orders/:id/done — mark order as complete
// Sets status='done', updates updatedAt
// Returns: { id, status: 'done', updatedAt }
// Emits: app.io?.emit('orders:updated', { orderId })

// DELETE or auto-cleanup — done orders auto-remove after N seconds
// (research decision: implement as a timer in server middleware, or
//  leave done orders in DB and filter them client-side on fetch)
```

### Socket.IO Events

Follow existing pattern in Phase 3 (apps/patron/src/api/socket.ts):

```typescript
// Bartender client registers these handlers
socket.on('orders:created', (payload: { orderId: string }) => {
  queryClient.invalidateQueries({ queryKey: ['orders'] })
})

socket.on('orders:updated', (payload: { orderId: string }) => {
  queryClient.invalidateQueries({ queryKey: ['orders'] })
})

socket.on('connect', () => {
  // Refetch on reconnect to catch any orders created while offline
  queryClient.invalidateQueries({ queryKey: ['orders'] })
})
```

### Kiosk Inactivity Detection Hook

Standard pattern implemented as a custom React hook:

```typescript
// apps/patron/src/hooks/useKioskInactivity.ts
import { useEffect, useRef } from 'react'

export function useKioskInactivity(
  onTimeout: () => void,
  timeoutMs: number = 90000, // 90 seconds default (PATR-08 discretion)
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    // Activity events that reset the timer
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onTimeout()
      }, timeoutMs)
    }

    // Bind to common touch/mouse/keyboard events
    window.addEventListener('touchstart', resetTimer)
    window.addEventListener('mousedown', resetTimer)
    window.addEventListener('keydown', resetTimer)

    // Start the initial timer
    resetTimer()

    return () => {
      window.removeEventListener('touchstart', resetTimer)
      window.removeEventListener('mousedown', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onTimeout, timeoutMs])
}
```

Usage in RecipeBrowse:

```typescript
export function RecipeBrowse() {
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState<'browse' | 'detail'>('browse')

  useKioskInactivity(() => {
    setCurrentView('browse')  // Return to grid on inactivity
    // Also fire fullscreen exit if needed (see below)
  }, 90000)

  // ... rest of component
}
```

### Fullscreen Mode (iPad Safari)

[CITED: https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API]
[CITED: https://www.javascriptroom.com/blog/open-webpage-in-fullscreen-in-safari-on-ios/]

iPad Safari (iPadOS 15+) supports fullscreen on arbitrary elements (unlike iOS phones, which only support video elements). Implement on Patron app load:

```typescript
// apps/patron/src/App.tsx or a dedicated hook
async function requestFullscreen() {
  const elem = document.documentElement
  try {
    if (elem.requestFullscreen && !document.fullscreenElement) {
      await elem.requestFullscreen()
    }
  } catch (err) {
    console.warn('Fullscreen request failed (normal on locked devices):', err)
    // Do NOT abort app; kiosk may be in a locked mode that rejects fullscreen.
    // The app continues to function, just not in fullscreen.
  }
}

// Call on app mount
useEffect(() => {
  requestFullscreen()
}, [])
```

**Important:** Fullscreen must be called from a user-interaction event handler or app load in the top-level mount, not from a deep-nested interaction. It will silently fail otherwise.

### Wake Lock (Screen Stay-On)

[CITED: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API]
[CITED: https://developer.chrome.com/docs/capabilities/web-apis/wake-lock]

Screen Wake Lock API is supported in Chrome, Safari (16.4+), Edge, and Firefox as of January 2025. Request wake-lock on Patron app load to prevent screen dimming:

```typescript
// apps/patron/src/hooks/useWakeLock.ts
import { useEffect } from 'react'

export function useWakeLock() {
  useEffect(() => {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen')
        .then(() => {
          console.log('Wake lock acquired')
        })
        .catch((err) => {
          console.warn('Wake lock request failed:', err)
          // Graceful fallback; app continues to work
        })
    }
  }, [])
}

// Use in App.tsx
<useWakeLock />
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Order queue persistence | Custom in-memory store or JSON file | Drizzle ORM + SQLite (existing DB) | Multi-client sync, schema evolution, and backup are all DB concerns; a hand-rolled queue loses data on server restart |
| Real-time order sync | Polling every N seconds or try-it-once logic | Socket.IO with TanStack Query invalidation | Polling is battery-drain + lag; hand-rolled WS reconnect is a reliability minefield (this is exactly what Socket.IO solved in Phase 3 for inventory) |
| Kiosk idle detection | Manual event listeners scattered across components | Custom `useKioskInactivity` hook (one import, one call) | Scattered listeners leak memory and race (component unmounts before timer fires); a hook centralizes cleanup and reuse |
| Fullscreen API calling | Direct `elem.requestFullscreen()` in every event handler | Call once on app mount, handle graceful failure | Multiple call sites = multiple failure points; app-load mounting is the one place where fullscreen succeeds consistently |
| antd dark theme | Custom CSS-in-JS or hand-written dark color overrides | antd `darkAlgorithm` in `ConfigProvider` | The algorithm handles all 50+ antd component color tokens at once; hand-rolled dark mode = 100+ color properties and a maintenance nightmare when antd updates |

## Common Pitfalls

### Pitfall 1: iPad Fullscreen Exits on Input Focus
**What goes wrong:** When a text input is focused (e.g., the "who's this for" text field on RecipeDetail), the browser auto-exits fullscreen mode on iPad Safari.

**Why it happens:** Safari treats fullscreen as a "distraction-free viewing mode" and considers a keyboard appearing as the user ending their viewing session.

**How to avoid:** 
- Keep fullscreen as a view-level state, not input-dependent. Call `requestFullscreen()` after the input loses focus, or avoid text inputs in fullscreen detail views if possible.
- Do NOT re-request fullscreen on every mount; call it once on app load and let the user's intentional exit remain.
- Test the prompt-then-submit flow (RecipeDetail + "who's this for" modal/overlay) on a real iPad; simulator behavior differs.

**Warning signs:** "Fullscreen keeps exiting when I tap the text field" = re-entering fullscreen after inputs closes = design anti-pattern. Redesign prompt flow.

### Pitfall 2: Android Chrome on Small Screens (8") Misses UI Elements
**What goes wrong:** A touch-optimized layout that works on a 10" tablet leaves crucial buttons off-screen or difficult to tap on an 8" LineageOS device.

**Why it happens:** Amazon Echo Show 8 Gen 1 (LineageOS) has a 8" display with high DPI; responsive layouts that assume `min-width: 360px` sometimes render smaller than expected. Bartender's design must account for the physical screen size, not just CSS breakpoints.

**How to avoid:**
- Test Bartender on a real 8" device or use Chrome DevTools to simulate the exact viewport (800×600 or 1024×600, depending on the device orientation and OS chrome).
- Use larger tap targets (antd's default button height is usually fine; just verify no nested text is <14px).
- Avoid sticky headers that consume >15% of vertical space; LineageOS kiosks have small screens and every pixel counts.

**Warning signs:** Buttons cut off at the edges; text overlapping; tabs hard to tap.

### Pitfall 3: Done Orders Not Auto-Clearing Grows the Queue Unbounded
**What goes wrong:** Orders marked `done` stay in the list forever, and the Bartender's queue view becomes a history of every drink ever made, not an active queue.

**Why it happens:** D-60 says orders should "stay visible briefly then auto-clear," but "briefly" is vague. If you forget to implement the cleanup, done orders accumulate.

**How to avoid:**
- Implement a server-side time-based cleanup: move orders to a done-orders table after N seconds, or soft-delete them (set a `deletedAt` timestamp) and filter them out of the `/api/orders` fetch.
- Alternatively, implement client-side filtering: fetch all orders but filter `status !== 'done'` in JavaScript, and keep a separate `recentlyDone` list for the brief post-completion window.
- Pick a concrete retention window during planning (e.g., 5 minutes, or "until next page load"); "briefly" in code is never specific enough.

**Warning signs:** After an hour of use, the Orders tab shows 50 done items for every 2 open items; queue becomes unreadable.

### Pitfall 4: Forgetting to Invalidate Orders Query After Submission Leaves Patron Seeing Stale Status
**What goes wrong:** Patron submits an order, gets a success toast, but the order never appears in the Bartender queue — because the Bartender client's orders query is stale.

**Why it happens:** This is not a Patron-side issue (Patron doesn't display orders). It's a Bartender-side issue: if the Bartender screen is already open when the Patron submits, the `/api/orders` query cache is stale. Socket.IO will emit `orders:created`, but if the handler doesn't call `queryClient.invalidateQueries({ queryKey: ['orders'] })`, the old cached list is returned.

**How to avoid:**
- Mirror Phase 3's pattern exactly: every Socket.IO event handler re-fetches via TanStack Query invalidation, never trusts the WS payload as data.
- Verify in the Bartender client's socket.ts that `orders:created` and `orders:updated` handlers call the appropriate `queryClient.invalidateQueries({ queryKey: ['orders'] })`.
- Test: open Bartender, leave it idle, submit an order from Patron, verify the new order appears in Bartender's list within 1 second (not after a manual refresh).

**Warning signs:** "Order doesn't show up until I refresh the browser" = invalidation is broken.

### Pitfall 5: Wake Lock and Fullscreen on non-iOS Devices (Android LineageOS) Behaves Differently
**What goes wrong:** Fullscreen on Android Chrome is supported, but the API surface, permission flow, and fallback behavior differ from iPad Safari.

**Why it happens:** Android Chrome and Safari implement the Fullscreen API and Wake Lock API per the W3C spec, but browser UI chrome, permission prompts, and battery-saver behavior differ by OS.

**How to avoid:**
- Test Bartender fullscreen + wake-lock on a real LineageOS Echo Show device, or an Android tablet simulator configured identically.
- Gracefully degrade: if fullscreen fails (rare on Android), the app continues to work; don't abort startup.
- Wake-lock may be denied if battery is critically low; handle the rejected promise without crashing.
- Document in PLAN that Bartender does NOT require fullscreen/wake-lock (it's nice-to-have for a bartender actively working), but Patron kiosk DOES require it (customer-facing wall-mounted device).

**Warning signs:** "Bartender screen blanks after 30 seconds" = wake-lock failed on Android, but no error was logged; should have tried to re-acquire wake-lock on wake.

### Pitfall 6: Batching Orders by Recipe (D-58) Without De-Duplication
**What goes wrong:** Two patrons order the same recipe within seconds. If the Bartender hasn't opened the order yet, you should show "Old Fashioned ×2", not two separate rows.

**Why it happens:** Naive code fetches all orders and renders them as-is. Batching requires grouping by `(recipeId, status)` before rendering.

**How to avoid:**
- Compute the batch server-side: the `/api/orders` endpoint returns a pre-grouped list, e.g., `[{ recipe, status, count, patronNames: [...] }, ...]`.
- Or compute client-side: fetch flat orders list and use a `groupBy` utility (lodash/ramda) to batch before rendering.
- Test: submit 3 orders for the same recipe in quick succession, verify they appear as one "×3" row in Orders tab, verify the Done button clears all 3.

**Warning signs:** "Orders are duplicated in the list" = batching is not happening.

## Code Examples

### Order Submission on Patron RecipeDetail

[CITED: apps/patron/src/components/RecipeDetail.tsx — existing structure]

Add to RecipeDetail.tsx:

```typescript
import { useState } from 'react'
import { useSubmitOrder } from '../api/useSubmitOrder.js'
import { OrderPrompt } from './OrderPrompt.js'  // New component for "who's this for"

export function RecipeDetail({ recipeId, onBack }: RecipeDetailProps) {
  const { data: recipe, isLoading, isError } = useRecipeDetail(recipeId)
  const [showOrderPrompt, setShowOrderPrompt] = useState(false)
  const { mutate: submitOrder, isPending: isSubmitting } = useSubmitOrder()

  const handleOrderClick = () => {
    setShowOrderPrompt(true)
  }

  const handleOrderSubmit = (patronName: string | undefined) => {
    submitOrder(
      { recipeId, patronName },
      {
        onSuccess: () => {
          // D-51: brief toast feedback, then back to browse grid
          toast.success('Order sent to bartender!')
          setShowOrderPrompt(false)
          onBack()
        },
        onError: (error) => {
          // D-52: inline error, user can retry
          toast.error(`Failed to send order: ${error.message}`)
        },
      },
    )
  }

  // D-49: Order button disabled/hidden when recipe is not makeable
  const isOrderable = recipe?.overallStatus !== 'red'

  return (
    <div className="h-dvh flex flex-col bg-patron-bg">
      {/* ... existing hero + header ... */}

      {/* Order button at bottom (D-48: single order, only on detail screen) */}
      {isOrderable && (
        <div className="shrink-0 px-lg pb-2xl">
          <button
            onClick={handleOrderClick}
            disabled={isSubmitting}
            className="w-full py-sm bg-patron-accent text-patron-bg font-semibold rounded-lg"
          >
            {isSubmitting ? 'Sending...' : 'Order This Drink'}
          </button>
        </div>
      )}

      {/* D-50: "who's this for" prompt modal/overlay */}
      {showOrderPrompt && (
        <OrderPrompt
          onSubmit={handleOrderSubmit}
          onCancel={() => setShowOrderPrompt(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {showOrderPrompt && <div className="inventory:changed" />}
    </div>
  )
}
```

### Order Submission Hook (useSubmitOrder)

```typescript
// apps/patron/src/api/useSubmitOrder.ts
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import type { QueryClient } from '@tanstack/react-query'

const orderInput = z.object({
  recipeId: z.string().min(1),
  patronName: z.string().optional(),
})

export function useSubmitOrder() {
  return useMutation({
    mutationFn: async (input: z.infer<typeof orderInput>) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        throw new Error(`Order submission failed: ${response.statusText}`)
      }

      return response.json()
    },
  })
}
```

### Bartender Orders Tab with Batching

```typescript
// apps/bartender/src/components/OrdersTab.tsx
import { useMemo } from 'react'
import { Badge, List, Button } from 'antd'
import { useOrders } from '../api/useOrders.js'

interface BatchedOrder {
  recipeId: string
  recipe: Recipe
  status: 'new' | 'in_progress' | 'done'
  count: number
  patronNames: string[]  // Aggregated "who's this for" from all matching orders
  elapsedSeconds: number  // From the oldest order in this batch
}

export function OrdersTab({ onOrderSelected }: { onOrderSelected: (order: BatchedOrder) => void }) {
  const { data: orders = [], isLoading } = useOrders()

  const batched = useMemo(() => {
    // Group by (recipeId, status) and aggregate
    const grouped = orders.reduce(
      (acc, order) => {
        const key = `${order.recipeId}:${order.status}`
        if (!acc[key]) {
          acc[key] = {
            recipeId: order.recipeId,
            recipe: order.recipe,
            status: order.status,
            count: 0,
            patronNames: [],
            elapsedSeconds: 0,
          }
        }
        acc[key].count += 1
        if (order.patronName) acc[key].patronNames.push(order.patronName)
        // Use the minimum (oldest) elapsed time for the batch
        acc[key].elapsedSeconds = Math.max(acc[key].elapsedSeconds, order.elapsedSeconds)
        return acc
      },
      {} as Record<string, BatchedOrder>,
    )

    return Object.values(grouped).sort((a, b) => b.elapsedSeconds - a.elapsedSeconds)
  }, [orders])

  const openCount = batched.filter((o) => o.status !== 'done').length
  const doneCount = batched.filter((o) => o.status === 'done').length

  return (
    <div className="p-lg">
      <div className="flex items-center gap-md mb-lg">
        <h2 className="text-lg font-semibold text-white">Orders</h2>
        {/* Badge shows count of non-done tickets (D-55) */}
        <Badge count={openCount} color="#22c55e" />
      </div>

      <List
        dataSource={batched}
        loading={isLoading}
        renderItem={(batch) => (
          <List.Item
            key={`${batch.recipeId}:${batch.status}`}
            onClick={() => onOrderSelected(batch)}
            className="cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-center gap-sm">
                <span className="font-semibold text-white">{batch.recipe.name}</span>
                {batch.count > 1 && <span className="text-xs text-patron-text-secondary">×{batch.count}</span>}
              </div>
              {batch.patronNames.length > 0 && (
                <p className="text-xs text-patron-text-secondary">
                  For: {batch.patronNames.join(', ')}
                </p>
              )}
              <p className="text-xs text-patron-text-secondary">
                {Math.floor(batch.elapsedSeconds / 60)}m ago
              </p>
            </div>
            {batch.status === 'in_progress' && (
              <Badge status="processing" text="In Progress" />
            )}
          </List.Item>
        )}
      />
    </div>
  )
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest + @testing-library/react (matching Phase 3 Patron + Phase 2.1 Barback) |
| Config file | `apps/bartender/vitest.config.ts` (mirrors apps/barback) |
| Quick run command | `pnpm -F @my-bar/bartender test` |
| Full suite command | `pnpm test` (monorepo root) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PATR-05 | POST /api/orders endpoint accepts { recipeId, patronName? } and writes to DB | unit | `pnpm -F @my-bar/server test routes/orders.test.ts` | ❌ Wave 0 |
| PATR-05 | RecipeDetail Order button visible when recipe is makeable (not red) | unit | `pnpm -F @my-bar/patron test components/RecipeDetail.test.ts` | ❌ Wave 0 |
| PATR-05 | useSubmitOrder hook calls POST /api/orders and handles success/error | unit | `pnpm -F @my-bar/patron test api/useSubmitOrder.test.ts` | ❌ Wave 0 |
| PATR-07 | Patron app requests fullscreen on mount; gracefully degrades if denied | unit | `pnpm -F @my-bar/patron test hooks/useFullscreen.test.ts` | ❌ Wave 0 |
| PATR-08 | useKioskInactivity hook resets timer on touch/mouse/key events | unit | `pnpm -F @my-bar/patron test hooks/useKioskInactivity.test.ts` | ❌ Wave 0 |
| PATR-08 | useKioskInactivity calls onTimeout callback after idle threshold | unit | `pnpm -F @my-bar/patron test hooks/useKioskInactivity.test.ts` | ❌ Wave 0 |
| BART-01 | GET /api/recipes returns full recipe detail (ingredients, method, glassware, garnish, tags, makeable status) | integration | `pnpm -F @my-bar/server test routes/recipes.test.ts` (existing) | ✅ |
| BART-02 | POST /api/orders → Socket.IO 'orders:created' event emitted | integration | `pnpm -F @my-bar/server test routes/orders.test.ts` | ❌ Wave 0 |
| BART-03 | PATCH /api/orders/:id/done advances status from 'new'/'in_progress' to 'done' | unit | `pnpm -F @my-bar/server test routes/orders.test.ts` | ❌ Wave 0 |
| BART-04 | GET /api/orders returns elapsedSeconds computed server-side (Date.now() - createdAt) | unit | `pnpm -F @my-bar/server test routes/orders.test.ts` | ❌ Wave 0 |
| BART-05 | Bartender RecipesTab search/filter UI opens full-screen tag picker + name search box | unit | `pnpm -F @my-bar/bartender test components/RecipeSearchFilter.test.ts` | ❌ Wave 0 |
| BART-06 | Bartender displays recipe's tri-state makeable status (green/yellow/red, not Patron's 2-state) | unit | `pnpm -F @my-bar/bartender test components/RecipeDetail.test.ts` | ❌ Wave 0 |
| SYNC-02 | Socket.IO orders:created event triggers Bartender's TanStack Query ['orders'] invalidation | integration | `pnpm -F @my-bar/bartender test api/socket.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Quick run of affected module (e.g., `pnpm -F @my-bar/server test routes/orders.test.ts`)
- **Per wave merge:** Full phase test suite (`pnpm test` filtered to Phase 4 packages + existing base)
- **Phase gate:** All tests green before `/gsd-verify-work`

### Wave 0 Gaps

Test infrastructure gaps (to be closed in Phase 4 planning):

- [ ] `apps/server/src/routes/orders.test.ts` — covers order submission (POST), mark-done (PATCH), list (GET), Socket.IO emission
- [ ] `apps/patron/src/hooks/useKioskInactivity.test.ts` — timer reset on events, callback on timeout
- [ ] `apps/patron/src/hooks/useFullscreen.test.ts` — requestFullscreen success/failure handling
- [ ] `apps/bartender/src/components/RecipeSearchFilter.test.ts` — tag picker interaction, name search filtering
- [ ] `apps/bartender/src/components/OrdersTab.test.ts` — batching logic, elapsed-time formatting
- [ ] `apps/bartender/src/api/socket.test.ts` — 'orders:created' / 'orders:updated' handlers call queryClient.invalidateQueries

*Existing test infrastructure* (no gaps):
- Phase 3 Patron RecipeDetail, RecipeCard, tag rail tests
- Phase 2.1 Barback BottomTabBar, tab structure
- Phase 2 recipes API tests (existing /api/recipes endpoint; orders builds on same pattern)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control | Notes |
|---------------|---------|-----------------|-------|
| V2 Authentication | no | — | No auth required per project constraints; trusted LAN only |
| V3 Session Management | no | — | No sessions (no auth) |
| V4 Access Control | no | — | Single trusted user (bartender); all orders visible to them |
| V5 Input Validation | yes | Zod schema on POST /api/orders | Validate `recipeId` exists, `patronName` is string or omitted (no XSS via free text) |
| V6 Cryptography | no | — | No secrets transmitted over orders API (LAN only) |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQLi on order query (if dynamic filtering added later) | Tampering | Use Drizzle ORM with parameterized queries, never hand-rolled SQL strings |
| XSS via patronName (free text) | Tampering / Spoofing | Sanitize/escape patronName on display (React auto-escapes in JSX text nodes; risky only if rendered as innerHTML) |
| Order tampering (patching someone else's order) | Tampering | No authentication means no "ownership"; assume all orders are public. Bartender seeing all orders is the design. |
| Inventory + order desync (recipe deleted between order submit and fulfillment) | Denial of Service | `recipeId` FK has `onDelete: 'restrict'` to prevent orphaned orders; order can't be placed for a recipe being deleted |
| Socket.IO event spoofing (client sends fake orders:created) | Spoofing | Socket.IO does not authenticate/validate events; only the server emits these events, never clients. Client can't trust WS payloads but also can't send orders via WS (only REST endpoint) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | iPad Safari (iPadOS 15+) supports fullscreen on arbitrary DOM elements | Architecture Patterns | If false, Patron kiosk has no way to hide browser chrome on iPad; user must use Guided Access or a third-party kiosk app instead. Mitigation: fallback to third-party kiosk browser if needed, but not a hard blocker (user can manually browse fullscreen). |
| A2 | Screen Wake Lock API is supported on iPad Safari 16.4+ | Architecture Patterns | If false, iPad screen may dim/sleep while Patron is idle; user would need to touch the screen to wake it. Mitigation: graceful; app continues to work. Non-critical for a wall-mounted device user can tap to wake. |
| A3 | Fullscreen API must be called from a user interaction event or app mount; calling it from a timer fails | Architecture Patterns | If false, can request fullscreen on any lifecycle hook. Impact: minor; affects only the timing of when fullscreen activates (on app load vs. on first tap). |
| A4 | Fullscreen exits when an input is focused on iPad Safari | Common Pitfalls | If false, can put text inputs in fullscreen views without exit. Impact: UX; test needed to verify exact behavior on real iPad (simulator may differ). |
| A5 | Android Chrome requestFullscreen() hides the address bar and status bar | Architecture Patterns | If false, Bartender on LineageOS may show browser chrome even in fullscreen. Impact: UX on 8" screen where chrome eats space. Mitigation: test on real device. |
| A6 | Socket.IO guarantees message ordering regardless of transport | Architecture Patterns | If false, orders could be delivered out of order (order A created before B, but B is delivered to client first). Impact: high; queue would show wrong order. Mitigation: server-side timestamp sort as fallback. |
| A7 | TanStack Query invalidation via `queryClient.invalidateQueries({ queryKey: ['orders'] })` will trigger a refetch on the next render | Architecture Patterns | If false, stale orders list persists after Socket.IO push. Impact: critical; Bartender queue doesn't update live. Mitigation: verify in Phase 3 (already tested for recipes). |
| A8 | Drizzle ORM `onDelete: 'restrict'` prevents a recipe from being deleted if an order references it | Architecture Patterns | If false, recipes can be deleted, leaving orphaned orders with invalid recipeId. Impact: DB integrity; orders become unfulfillable. Mitigation: test the FK constraint in schema test. |
| A9 | antd `darkAlgorithm` applies to all 50+ antd components without per-component overrides | Bartender Scaffolding | If false, some antd components may render light colors even in dark mode. Impact: visual; minor if overridable via token props. Mitigation: test on real device. |
| A10 | 60–90 second inactivity timeout is a sensible UX for a kiosk | PATR-08 Discretion | If wrong, users may be interrupted mid-use (too short) or kiosk stays active too long after a user walks away (too long). Impact: UX/ops. Mitigation: configurable via env var; user can tune after deployment. |

## Open Questions (RESOLVED)

1. **Done Order Retention Window (D-60)** — RESOLVED
   - What we know: Done orders should "stay visible briefly" (D-60) but exact duration is discretionary.
   - What's unclear: Is "briefly" = 5 minutes? Until next page reload? Until the Bartender closes the app? Or auto-remove on a server-side timer?
   - Recommendation: Pick a concrete value during planning. Suggested: auto-remove done orders after 5 minutes server-side (soft-delete via `deletedAt` timestamp), or retain them in-memory only (clear on server restart). Test with a real bartender to see if they want recent-history visibility.
   - Resolution: Planned in 04-03 as `DONE_RETENTION_MS = 5 * 60 * 1000` (5-minute server-side retention window).

2. **Order Payload on Socket.IO Event (PATR-02 vs. D-47 pattern)** — RESOLVED
   - What we know: Phase 3 Socket.IO events carry no payload; clients re-fetch via REST (TanStack Query invalidation). This was proven for recipes/inventory.
   - What's unclear: Should orders:created emit `{ orderId }` or also include full order object?
   - Recommendation: Stick to Phase 3 pattern: emit `{ orderId }` only, client does `queryClient.invalidateQueries({ queryKey: ['orders'] })` and re-fetches `/api/orders`. Reduces payload size and keeps sync logic simple.
   - Resolution: Planned in 04-01 Task 1 — `orders:created`/`orders:updated` emit `{ orderId }` only, per the Phase 3 pattern.

3. **Batching Computation (D-58)** — RESOLVED
   - What we know: Multiple identical pending orders should collapse into one "×N" row.
   - What's unclear: Should batching be done server-side (GET /api/orders returns pre-grouped list) or client-side (fetch flat list, batch in React)?
   - Recommendation: Client-side batching. Server returns flat list; Bartender UI groups by `(recipeId, status)` before render. Simpler server logic, and batching algorithm is UI-specific (you might later want to batch differently in a mobile view).
   - Resolution: Planned in 04-04 Task 1 — client-side `batchOrders()` groups the flat `/api/orders` response by `(recipeId, status)`.

4. **Bartender Fullscreen + Wake Lock (distinct from Patron)** — RESOLVED
   - What we know: Patron kiosk needs fullscreen + wake-lock (wall-mounted, no user interaction).
   - What's unclear: Does Bartender (a person working behind the bar) also need fullscreen + wake-lock? Or just normal browsing?
   - Recommendation: Bartender does NOT require fullscreen/wake-lock. Bartender is actively using the device (making drinks), so the screen won't go idle. If it does become a problem (screen dims mid-order), enable wake-lock in Bartender too, but test first.
   - Resolution: Confirmed in 04-05 — Bartender does not get fullscreen/wake-lock hooks; those are Patron-only (04-05 scope).

## Environment Availability

All dependencies required by Phase 4 are inherited from Phase 3 and Phase 2.1. No new external tools or services are needed.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22.x | Backend + Frontend build | ✓ | 22.10.0 | Use any 22.x LTS |
| npm / pnpm | Package management | ✓ | — | Use pnpm (already in use) |
| SQLite 3 | Order persistence (via better-sqlite3) | ✓ (bundled in better-sqlite3) | 3.40.0+ | — |
| Fastify 5.x | Backend HTTP + REST routes | ✓ | 5.0.0 | — |
| Socket.IO 4.x | Real-time order events | ✓ | 4.8.1 | Switch to SSE or polling if WS unavailable |
| React 19.x | Bartender + Patron UI | ✓ | 19.0.0 | — |
| Vite 8.x | Bartender build | ✓ | 8.0.0 | — |
| antd 6.x | Bartender components | ✓ | 6.19.1 | — |
| TypeScript 5.x | Type checking | ✓ | 5.6.2 | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled kiosk timers | React custom hook (useKioskInactivity) | Phase 4 (new) | Centralized timer management, easier to test, less boilerplate per app |
| Direct element.requestFullscreen() calls scattered in components | Single call on app mount in App.tsx | Phase 4 (new) | One failure point to handle, cleaner lifecycle |
| Polling orders every N seconds | Socket.IO push → TanStack Query invalidation | Phase 4 (proven from Phase 3 inventory/recipe pattern) | Real-time sync, lower latency, battery-efficient |
| Storing full order list flat in UI state | TanStack Query cache + server-side SQLite | Phase 4 (new) | Persistent across page reloads, live multi-client sync via Socket.IO |

**Deprecated/outdated:**
- Hand-rolled WebSocket reconnect logic: Socket.IO handles this automatically (Phase 3 design decision, carries forward to Phase 4 orders).
- CSS-in-JS dark mode overrides: Use antd `darkAlgorithm` instead (cleaner, fewer token definitions).

## Sources

### Primary (HIGH confidence)

- [MDN Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) — iPad Safari fullscreen support, requestFullscreen() calling context
- [MDN Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) — browser support matrix (as of Jan 2025: Chrome, Edge, Firefox, Safari 16.4+)
- [Chrome for Developers: Wake Lock](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock) — battery awareness, API usage patterns
- [Socket.IO Delivery Guarantees](https://socket.io/docs/v4/delivery-guarantees) — message ordering, acknowledgements
- [Drizzle ORM Pagination & Ordering](https://orm.drizzle.team/docs/guides/limit-offset-pagination) — schema patterns, timestamp handling
- [antd Customize Theme](https://ant.design/docs/react/customize-theme/) — ConfigProvider darkAlgorithm, theme tokens
- Existing codebase (Phase 3 Patron + Phase 2.1 Barback) — Socket.IO event patterns, TanStack Query hooks, antd theme structure [VERIFIED: apps/patron/src/api/socket.ts, apps/barback/src/App.tsx]

### Secondary (MEDIUM confidence)

- [LogRocket: TanStack Query + WebSockets](https://blog.logrocket.com/tanstack-query-websockets-real-time-react-data-fetching/) — query invalidation patterns with WS
- [Leapcell: Advanced Data Fetching with TanStack Query](https://leapcell.io/blog/advanced-data-fetching-with-tanstack-query-optimistic-updates-pagination-and-websocket-integration) — WebSocket + React Query integration examples
- [AirDroid: Android Chrome Fullscreen](https://www.airdroid.com/mdm/android-chrome-fullscreen/) — Android browser fullscreen API behavior
- [Medium: Building Immersive Web Apps](https://medium.com/@wul55267/building-immersive-web-apps-in-react-fullscreen-wake-lock-and-notifications-a8134c0ec11c) — React fullscreen + wake-lock patterns
- [GeeksforGeeks: Idle Time Detection in JavaScript](https://www.geeksforgeeks.org/how-to-detect-idle-time-in-javascript/) — activity event listener patterns

### Tertiary (LOW confidence — training data + web search, not verified against primary source)

- Specific LineageOS Echo Show 8 Gen 1 browser behavior — no official docs; behavior inferred from Android Chrome compatibility and XDA forums
- Exact iPad Safari input-focus fullscreen exit behavior — tested by other devs; minor risk if edge case differs

## Metadata

**Confidence breakdown:**
- Standard stack (Node/TypeScript/Vite/React/Fastify/antd): HIGH — inherited from Phase 3, versions verified against npm registry
- Order schema (Drizzle ORM + SQLite patterns): HIGH — follows established Phase 2/2.1 conventions, schema examples verified against docs
- Socket.IO event design: HIGH — Phase 3 pattern proven; Phase 4 orders reuse exact same approach
- Kiosk fullscreen API: HIGH for iPad Safari; MEDIUM for Android Chrome (tested by community but not primary Apple/Chrome docs)
- Wake-lock API support: HIGH — official browser support matrix confirms Jan 2025 coverage
- Inactivity detection hook: HIGH — standard web event listener pattern, no library needed
- Batching logic: MEDIUM — algorithmic, not verified against existing code; test needed to confirm groupBy approach

**Research date:** 2026-08-18
**Valid until:** 2026-09-18 (30 days for stable APIs; Fullscreen/Wake-Lock/Socket.IO are mature; order/query patterns are implementation-level)
