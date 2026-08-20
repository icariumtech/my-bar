---
phase: 04-bartender-console-order-workflow
reviewed: 2026-08-18T00:00:00Z
depth: standard
files_reviewed: 48
files_reviewed_list:
  - apps/bartender/package.json
  - apps/bartender/src/App.tsx
  - apps/bartender/src/api/client.ts
  - apps/bartender/src/api/socket.test.ts
  - apps/bartender/src/api/socket.ts
  - apps/bartender/src/api/useMarkOrderDone.test.tsx
  - apps/bartender/src/api/useMarkOrderDone.ts
  - apps/bartender/src/api/useOpenOrder.test.tsx
  - apps/bartender/src/api/useOpenOrder.ts
  - apps/bartender/src/api/useOrders.ts
  - apps/bartender/src/api/useRecipes.ts
  - apps/bartender/src/api/useTags.ts
  - apps/bartender/src/components/BottomTabBar.test.tsx
  - apps/bartender/src/components/BottomTabBar.tsx
  - apps/bartender/src/components/MakeableStatusBadge.test.tsx
  - apps/bartender/src/components/MakeableStatusBadge.tsx
  - apps/bartender/src/components/OrdersTab.test.tsx
  - apps/bartender/src/components/OrdersTab.tsx
  - apps/bartender/src/components/RecipeOrOrderDetail.test.tsx
  - apps/bartender/src/components/RecipeOrOrderDetail.tsx
  - apps/bartender/src/components/RecipeSearchFilter.test.tsx
  - apps/bartender/src/components/RecipeSearchFilter.tsx
  - apps/bartender/src/components/RecipesTab.test.tsx
  - apps/bartender/src/components/RecipesTab.tsx
  - apps/bartender/src/main.tsx
  - apps/patron/src/App.tsx
  - apps/patron/src/api/useSubmitOrder.test.tsx
  - apps/patron/src/api/useSubmitOrder.ts
  - apps/patron/src/components/OrderPrompt.test.tsx
  - apps/patron/src/components/OrderPrompt.tsx
  - apps/patron/src/components/RecipeBrowse.test.tsx
  - apps/patron/src/components/RecipeBrowse.tsx
  - apps/patron/src/components/RecipeDetail.test.tsx
  - apps/patron/src/components/RecipeDetail.tsx
  - apps/patron/src/hooks/useFullscreen.test.ts
  - apps/patron/src/hooks/useFullscreen.ts
  - apps/patron/src/hooks/useKioskInactivity.test.ts
  - apps/patron/src/hooks/useKioskInactivity.ts
  - apps/patron/src/hooks/useWakeLock.test.ts
  - apps/patron/src/hooks/useWakeLock.ts
  - apps/server/src/db/schema.ts
  - apps/server/src/db/test-helpers.ts
  - apps/server/src/index.ts
  - apps/server/src/routes/orders.test.ts
  - apps/server/src/routes/orders.ts
  - apps/server/src/routes/recipes.ts
  - package.json
  - packages/shared/src/index.ts
  - packages/shared/src/order.ts
findings:
  critical: 2
  warning: 2
  info: 2
  total: 6
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-08-18T00:00:00Z
**Depth:** standard
**Files Reviewed:** 48
**Status:** issues_found

## Summary

Reviewed the Bartender order-console feature (Orders/Recipes tabs, socket wiring, order mutations), the Patron kiosk hooks/order-submission flow, and the server-side `orders`/`recipes` routes plus the `Order`/shared schema they sit on. Test coverage is unusually thorough (boundary values on `formatElapsed`, batching, retention window edges, socket reconnection). The Bartender-specific code (batching, tab bar, detail view, socket handlers) is solid — no blockers found there.

The two blockers are both in `apps/server/src/routes/recipes.ts`: neither the `POST /api/recipes` handler nor the tail of the `PATCH /api/recipes/:id` handler wraps all of its writes in a single transaction, so a mid-request failure (an invalid `categoryId`/`ingredientId`/`glasswareId`/`tagId` on a later item) can leave a partially-written recipe committed to the database while the client is told the whole request failed with a 400. This directly undermines the project's stated core value ("the inventory/recipe data must be a trustworthy single source of truth across all three screens") since Bartender/Patron/Barback would all then read back a recipe row that nobody intended to exist in that shape.

Two warnings: a dangling `setTimeout` in Patron's `RecipeDetail.tsx` that can fire after the component has moved on to viewing a different recipe, forcibly navigating the patron back to the grid; and Patron's `useWakeLock` never re-acquires the screen wake lock after the browser auto-releases it on `visibilitychange`, which — given this app's own stated kiosk-sleep/lock/wifi-roam operating environment — likely means the "keep screen awake" feature silently stops working after the very first time the iPad screen locks.

## Structural Findings (fallow)

None provided for this review.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `POST /api/recipes` has no transaction — a mid-loop FK failure leaves a partially-created recipe committed

**File:** `apps/server/src/routes/recipes.ts:229-285`
**Issue:** The handler runs `db.insert(recipes)...run()`, then loops `db.insert(recipeIngredients)...run()` once per ingredient line, then loops `db.insert(recipeTags)...run()` once per tag — as three (or more) separate, unwrapped statements. `better-sqlite3` auto-commits each `.run()` individually outside an explicit transaction. If ingredient line #2 (or any tag) trips the `FOREIGN KEY`/`UNIQUE` constraint caught below, the `recipes` row and any ingredient lines already inserted before the failure remain committed in the database, while the client receives `400 { error: 'Unknown category, ingredient, glassware, or tag' }` — implying nothing was created. The result is an orphaned, incompletely-specified recipe row that will show up in `GET /api/recipes` (and therefore on the Patron/Bartender/Barback screens) that the caller believes never got created. Retrying the POST then creates a second, correct recipe alongside the corrupt orphan.

Contrast with the `PATCH /api/recipes/:id` handler a few lines below, whose own comment explicitly calls out needing "a single `db.transaction()` call so a failed insert mid-loop rolls back the delete too" — the same reasoning applies here but wasn't applied to POST.

**Fix:**
```ts
try {
  db.transaction((tx) => {
    tx.insert(recipes)
      .values({
        id: recipeId,
        name: request.body.name,
        method: JSON.stringify(request.body.method),
        glasswareId: request.body.glasswareId ?? null,
        garnish: request.body.garnish ?? null,
        description: request.body.description ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run()

    request.body.ingredients.forEach((ing, idx) => {
      tx.insert(recipeIngredients)
        .values({
          id: crypto.randomUUID(),
          recipeId,
          categoryId: ing.categoryId,
          ingredientId: ing.ingredientId ?? null,
          requiresSpecific: ing.requiresSpecific ?? true,
          quantity: ing.quantity,
          unit: ing.unit,
          displayOrder: idx,
        })
        .run()
    })

    const tagIds = [...new Set(request.body.tagIds ?? [])]
    tagIds.forEach((tagId) => {
      tx.insert(recipeTags).values({ id: crypto.randomUUID(), recipeId, tagId }).run()
    })
  })
} catch (err) {
  if (err instanceof Error && /(FOREIGN KEY|UNIQUE) constraint failed/i.test(err.message)) {
    return reply.status(400).send({ error: 'Unknown category, ingredient, glassware, or tag' })
  }
  throw err
}
```

### CR-02: `PATCH /api/recipes/:id` — the final `recipes` row update runs outside the ingredients/tags transaction

**File:** `apps/server/src/routes/recipes.ts:321-376`
**Issue:** When a patch includes `ingredients` and/or `tagIds`, those are correctly replaced inside `db.transaction((tx) => {...})` (lines 334-364). But the subsequent `db.update(recipes).set({...}).run()` (lines 366-376) — which applies `name`/`method`/`glasswareId`/`garnish`/`description` — runs as a separate, un-transacted statement *after* that transaction has already committed. If this update throws (e.g. an invalid `glasswareId` trips the FK constraint) while the same request also replaced `ingredients`/`tagIds`, the ingredient/tag replacement is already permanently committed even though the whole request is reported to the client as a `400` failure. A patch intended to be atomic ("replace ingredients AND fix the glassware in one edit") can silently apply only half of itself.
**Fix:** Fold the trailing `recipes` update into the same transaction so either everything commits or nothing does:
```ts
db.transaction((tx) => {
  if (newIngredients !== undefined) { /* ...as before, using tx... */ }
  if (newTagIds !== undefined) { /* ...as before, using tx... */ }

  tx.update(recipes)
    .set({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.method !== undefined && { method: JSON.stringify(patch.method) }),
      ...(patch.glasswareId !== undefined && { glasswareId: patch.glasswareId }),
      ...(patch.garnish !== undefined && { garnish: patch.garnish }),
      ...(patch.description !== undefined && { description: patch.description }),
      updatedAt: new Date(),
    })
    .where(eq(recipes.id, id))
    .run()
})
```

## Warnings

### WR-01: Patron `RecipeDetail.tsx` — uncancelled `setTimeout` can force-navigate away from a *different*, later-opened recipe

**File:** `apps/patron/src/components/RecipeDetail.tsx:68-78`
**Issue:** `handleOrderSubmit`'s `onSuccess` calls `setTimeout(() => onBack(), 3000)` directly (not inside a `useEffect` with cleanup), and nothing ever calls `clearTimeout` on it. `onBack` is `() => setViewingId(undefined)` from `RecipeBrowse`. Sequence that reproduces the bug:
1. Patron orders Drink A → confirmation shown → 3s timer scheduled.
2. Within that 3s window, the patron manually taps back (via the header `X`, or the 90s `useKioskInactivity` timeout fires) and opens Drink B's detail view (`RecipeBrowse` mounts a *new* `RecipeDetail` instance with a different `recipeId`, but `onBack` still resolves to the same `setViewingId(undefined)` call).
3. Drink A's stale timer fires and invokes the captured `onBack()`, which sets `viewingId` back to `undefined` — silently kicking the patron out of Drink B's detail view mid-browse, for no reason visible to them.

This is a real, reachable interaction path on a shared kiosk device with a 90s inactivity timeout and free browsing, not a purely theoretical race.
**Fix:** Track the timer in a ref/effect and clear it on unmount (or make the confirmation self-contained rather than reaching back into the browse-grid navigation from a raw `setTimeout`):
```ts
useEffect(() => {
  if (!showConfirmation) return
  const timer = setTimeout(() => onBack(), 3000)
  return () => clearTimeout(timer)
}, [showConfirmation, onBack])
```
(and drop the inline `setTimeout(() => onBack(), 3000)` call from `handleOrderSubmit`'s `onSuccess`).

### WR-02: Patron `useWakeLock` never re-acquires the wake lock after the browser auto-releases it

**File:** `apps/patron/src/hooks/useWakeLock.ts:11-18`
**Issue:** The hook requests `navigator.wakeLock.request('screen')` exactly once, on mount. Per the Screen Wake Lock API spec, the UA automatically releases an active `WakeLockSentinel` whenever `document.visibilityState` becomes `'hidden'` (tab backgrounded, app switcher, or the device screen locks) — and it is **not** automatically re-acquired when the page becomes visible again; the app must listen for `visibilitychange` and re-request. This project's own `CLAUDE.md` calls out that "kiosk iPads/phones sleep, lock, and hop wifi" as a first-class operating condition. As written, the very first time the Patron iPad's screen times out and locks (which the wake lock is supposed to prevent, but will eventually happen regardless — e.g. via the physical side button, or before the lock takes effect the first time), the sentinel is released and never reacquired, so the wake-lock feature silently stops working for the rest of the kiosk's uptime.
**Fix:**
```ts
export function useWakeLock(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return

    let sentinel: WakeLockSentinel | undefined

    async function acquire() {
      try {
        sentinel = await navigator.wakeLock.request('screen')
      } catch (err) {
        console.warn('Wake lock request failed:', err)
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sentinel?.release().catch(() => {})
    }
  }, [])
}
```

## Info

### IN-01: `apiFetch`'s header merge silently drops the default `Content-Type` if a caller ever passes its own `headers`

**File:** `apps/bartender/src/api/client.ts:4-8`
**Issue:** `{ headers: { 'Content-Type': 'application/json' }, ...init }` — object spread means a `headers` key present on `init` *replaces* the whole `headers` object rather than merging with it, silently dropping `Content-Type`. No current caller passes custom headers, so this is latent rather than active, but it's a footgun for the next hook added to this file.
**Fix:** Merge explicitly: `headers: { 'Content-Type': 'application/json', ...init?.headers }`.

### IN-02: `batchOrders`' tiebreak comment overstates what it actually guarantees

**File:** `apps/bartender/src/components/OrdersTab.tsx:51-55`
**Issue:** The comment claims the `a.orderIds[0].localeCompare(b.orderIds[0])` tiebreak "mirrors GET /api/orders's own `asc(id)` secondary sort at equal `elapsedSeconds`." The server's `asc(id)` tiebreak only ever resolves ties *between two orders sharing the same `createdAt`*; here the same comparator is instead applied across two *different batches* (different recipes/statuses) that merely happen to share the same max `elapsedSeconds` — an unrelated coincidence, not the same tie the server is resolving. The resulting order is still deterministic, so this isn't a functional bug, just a misleading comment for future maintainers reasoning about the sort's guarantees.
**Fix:** Reword the comment to say the tiebreak simply guarantees a stable, deterministic ordering across renders, rather than implying it mirrors the API's specific same-`createdAt` tiebreak semantics.

---

_Reviewed: 2026-08-18T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
