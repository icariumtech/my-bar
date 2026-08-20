---
phase: 03-patron-browse-experience
reviewed: 2026-08-13T04:20:41Z
depth: quick
files_reviewed: 48
files_reviewed_list:
  - apps/barback/src/api/useTags.ts
  - apps/barback/src/components/RecipesTab.test.tsx
  - apps/barback/src/components/pickers/TagPicker.test.tsx
  - apps/barback/src/components/pickers/TagPicker.tsx
  - apps/barback/src/components/views/AddEditRecipeView.test.tsx
  - apps/barback/src/components/views/AddEditRecipeView.tsx
  - apps/barback/src/components/views/RecipeDetailView.test.tsx
  - apps/patron/index.html
  - apps/patron/package.json
  - apps/patron/src/App.test.tsx
  - apps/patron/src/App.tsx
  - apps/patron/src/api/client.ts
  - apps/patron/src/api/socket.test.ts
  - apps/patron/src/api/socket.ts
  - apps/patron/src/api/useRecipeDetail.ts
  - apps/patron/src/api/useRecipes.ts
  - apps/patron/src/components/MakeableIndicator.test.tsx
  - apps/patron/src/components/MakeableIndicator.tsx
  - apps/patron/src/components/RecipeBrowse.test.tsx
  - apps/patron/src/components/RecipeBrowse.tsx
  - apps/patron/src/components/RecipeCard.tsx
  - apps/patron/src/components/RecipeDetail.test.tsx
  - apps/patron/src/components/RecipeDetail.tsx
  - apps/patron/src/components/TagRail.test.tsx
  - apps/patron/src/components/TagRail.tsx
  - apps/patron/src/components/TagSubmenu.tsx
  - apps/patron/src/index.css
  - apps/patron/src/main.tsx
  - apps/patron/src/test/setup.ts
  - apps/patron/tsconfig.json
  - apps/patron/vite.config.ts
  - apps/patron/vitest.config.ts
  - apps/server/package.json
  - apps/server/src/db/schema.ts
  - apps/server/src/db/seed.ts
  - apps/server/src/db/test-helpers.ts
  - apps/server/src/index.ts
  - apps/server/src/routes/ingredients.ts
  - apps/server/src/routes/recipes.test.ts
  - apps/server/src/routes/recipes.ts
  - apps/server/src/routes/tags.test.ts
  - apps/server/src/routes/tags.ts
  - apps/server/src/ws/hub.test.ts
  - apps/server/src/ws/hub.ts
  - package.json
  - packages/shared/src/index.ts
  - packages/shared/src/recipe.ts
  - packages/shared/src/tag.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-08-13T04:20:41Z
**Depth:** quick
**Files Reviewed:** 48
**Status:** issues_found

## Summary

Reviewed the Patron browse/detail experience, its Socket.IO live-sync wiring, the new `/api/recipes` tags/description support, `/api/tags`, and the Barback `TagPicker`/`AddEditRecipeView` additions that feed it. The overall shape is solid: Zod schemas gate every write boundary, FK-violation translation is applied consistently, tests cover the documented behavior contracts well, and the Patron/Barback split (never trusting a WS payload as data, always re-fetching via REST) is followed throughout.

One confirmed BLOCKER: the recipe tag-assignment write path (`POST`/`PATCH /api/recipes`) only translates `FOREIGN KEY constraint failed` errors into a clean 400 — a **duplicate** `tagId` in the submitted array trips the `recipe_tags` table's `UNIQUE(recipe_id, tag_id)` constraint instead, which is a different SQLite error string that the regex does not match, so it falls through to an unhandled 500 with a raw database error message. This was reproduced directly against the project's own `better-sqlite3` dependency (see finding CR-01). Since there is no authentication anywhere in this app (by design), any device on the LAN can trigger this from the Patron/Barback network by hitting the endpoint with a repeated tag id.

Also flagged: an unbounded-length array gap in the shared `recipeInput` schema, a defensive-coding gap in the Patron socket handler, and a keyboard-inaccessible tap target on `RecipeCard`.

## Critical Issues

### CR-01: Duplicate `tagIds` in recipe create/update crash with an unhandled 500, not a clean 400

**File:** `apps/server/src/routes/recipes.ts:268-284` (POST) and `apps/server/src/routes/recipes.ts:352-384` (PATCH)

**Issue:** Both the POST and PATCH handlers insert one `recipeTags` row per submitted `tagId` in a loop, with no de-duplication:

```ts
const tagIds = request.body.tagIds ?? []
tagIds.forEach((tagId) => {
  db.insert(recipeTags)
    .values({ id: crypto.randomUUID(), recipeId, tagId })
    .run()
})
```

`recipe_tags` has a `UNIQUE(recipe_id, tag_id)` constraint (`apps/server/src/db/schema.ts:113`). The surrounding `try/catch` only recognizes one failure mode:

```ts
if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
  return reply.status(400).send({ error: 'Unknown category, ingredient, glassware, or tag' })
}
throw err
```

A duplicate id in `tagIds` (e.g. `tagIds: [sameId, sameId]`, which the shared Zod schema `recipeInput.tagIds` at `packages/shared/src/recipe.ts:42` does not reject — it is a plain `z.array(z.string().uuid()).optional()` with no `.refine()` uniqueness check) trips SQLite's `UNIQUE constraint failed: recipe_tags.recipe_id, recipe_tags.tag_id` error instead of a `FOREIGN KEY` error. That message does not match the regex, so `throw err` re-throws, and the request fails with an unhandled 500 carrying the raw SQLite error text — exactly the failure mode (`T-01-11`/raw-500-with-internal-detail) the same file explicitly guards against for every *other* constraint violation on this route.

Reproduced directly against the project's pinned `better-sqlite3@13.0.3`:
```
ERROR MESSAGE: UNIQUE constraint failed: t.recipe_id, t.tag_id
MATCHES FK REGEX: false
```

**Fix:** De-duplicate before inserting (cheapest fix — no behavior change needed elsewhere), and/or extend the regex to also catch UNIQUE violations so it degrades to 400 defensively:

```ts
const tagIds = [...new Set(request.body.tagIds ?? [])]
```
```ts
if (err instanceof Error && /(FOREIGN KEY|UNIQUE) constraint failed/i.test(err.message)) {
  return reply.status(400).send({ error: 'Unknown category, ingredient, glassware, or tag' })
}
```
Apply the same de-duplication in the PATCH handler's `newTagIds.forEach(...)` loop (`apps/server/src/routes/recipes.ts:354-358`). Consider also adding `.refine()` on `recipeInput.tagIds`/`recipePatch` in `packages/shared/src/recipe.ts` so this is rejected as a clean validation error before it ever reaches the database.

## Warnings

### WR-01: `recipeInput` arrays have no upper-bound length, despite the file's own stated DoS-mitigation intent

**File:** `packages/shared/src/recipe.ts:37-42`

**Issue:** `ingredients`, `method`, and `tagIds` are all `z.array(...).min(1)` or `z.array(...).optional()` with no `.max()` cap on array length, even though the same file's comments explicitly call out `.max()` bounds elsewhere as DoS mitigation (T-02-02) for individual field lengths (`quantity.max(20)`, `garnish.max(200)`, `description.max(2000)`, each method step `.max(500)`). A client (no auth is required anywhere in this app, per the project's design) can submit a recipe with, say, 50,000 ingredient lines or 50,000 tag ids in one request, and every element gets inserted in an unbounded `.forEach(...).run()` loop.

**Fix:**
```ts
ingredients: z.array(recipeIngredientInput).min(1).max(50),
method: z.array(z.string().trim().min(1).max(500)).min(1).max(50),
tagIds: z.array(z.string().uuid()).max(24).optional(), // 24 = total seeded taxonomy size
```

### WR-02: Patron socket handler assumes `recipe:updated` payload shape without validation

**File:** `apps/patron/src/api/socket.ts:26-32`

**Issue:**
```ts
socket.on('recipe:updated', (...args: unknown[]) => {
  const { recipeId } = args[0] as { recipeId: string }
  ...
})
```
`args[0]` is cast straight to `{ recipeId: string }` with no existence/shape check. Every current server emit site does send a well-formed payload, so this doesn't fire today, but the handler has no defense if that ever changes (a future emit site forgetting the payload, or a malformed message) — destructuring `undefined` throws inside the Socket.IO event callback.

**Fix:**
```ts
socket.on('recipe:updated', (...args: unknown[]) => {
  const payload = args[0] as { recipeId?: string } | undefined
  if (!payload?.recipeId) return
  queryClient.invalidateQueries({ queryKey: ['recipes', payload.recipeId] })
  queryClient.invalidateQueries({ queryKey: ['recipes'] })
})
```

### WR-03: `RecipeCard`'s primary tap target is a non-interactive `<div>` with no keyboard support

**File:** `apps/patron/src/components/RecipeCard.tsx:17-23`

**Issue:** The entire card — the only way to reach recipe detail from the browse grid — is a `<div onClick={...}>` with no `role="button"`, `tabIndex`, or `onKeyDown` handler. It's unreachable by keyboard and not announced as interactive to assistive tech. (Contrast with `TagRail`/`TagSubmenu` in the same phase, which correctly use real `<button>` elements for their tap targets.)

**Fix:**
```tsx
<div
  role="button"
  tabIndex={0}
  onClick={() => onSelect(recipe)}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(recipe) }}
  className={...}
>
```
Or simplest: swap the wrapping `<div>` for a `<button type="button">` with the grid-cell styling moved onto it.

## Info

### IN-01: Redundant condition in `TagRail`'s group-tag dedup

**File:** `apps/patron/src/components/TagRail.tsx:52-58`

**Issue:** `activeTagIds.has(t.id)` is always `true` here — `t` is drawn from `recipes.flatMap((r) => r.tags)`, and `activeTagIds` is defined as exactly the set of tag ids referenced by `recipes` (`getActiveTagIds`, same file, line 23-27). The check can never filter anything out; it reads as if it's doing work it isn't.

**Fix:** Drop the redundant clause, or add a one-line comment clarifying it's intentionally defensive/no-op if that's the actual intent:
```ts
.filter((t) => t.group === group.id)
```

### IN-02: Duplicated tag-sort comparator between `recipes.ts` and `tags.ts`

**File:** `apps/server/src/routes/recipes.ts:93-95` and `apps/server/src/routes/tags.ts:34-36`

**Issue:** The exact same `TAG_GROUP_ORDER.indexOf(...) || a.name.localeCompare(b.name)` comparator is written out independently in both route files. The code's own comment in `recipes.ts` acknowledges this is deliberate ("small enough duplication to keep the two route files independently readable"), so this is a low-priority note rather than an oversight — but a shared `sortTagsCanonically()` helper in `packages/shared` would remove the risk of the two copies drifting if the comparator is ever tweaked in only one place.

**Fix:** Optional — extract to `packages/shared/src/tag.ts`:
```ts
export function sortTagsCanonically<T extends { group: TagGroup; name: string }>(tags: T[]): T[] {
  return [...tags].sort(
    (a, b) => TAG_GROUP_ORDER.indexOf(a.group) - TAG_GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name),
  )
}
```

---

_Reviewed: 2026-08-13T04:20:41Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
