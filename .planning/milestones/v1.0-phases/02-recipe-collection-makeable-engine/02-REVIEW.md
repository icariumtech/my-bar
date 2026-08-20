---
phase: 02
status: issues
files_reviewed: 26
depth: quick
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
---

## Summary

Reviewed all 26 files in scope for Phase 02 (Recipe Collection & Makeable Engine) — the barback recipe/glassware UI, the recipes/categories/glassware server routes, `computeMakeable`, and the shared Zod contracts. No security issues, hardcoded secrets, or dangerous-function usage found. The makeable-computation logic (`computeMakeable`) and the refuse-only delete guards (categories/glassware) are solid and match their documented invariants.

Two functional gaps stand out: (1) `RecipeForm` nests a same-named `Form.List` inside a `Form.Item` carrying the identical `name`, which is a known antd anti-pattern that can desync the `required` validation from the real list state; (2) the recipe PATCH contract has no way to explicitly clear an already-set `glasswareId` (or `garnish`) back to "none" — the Zod schema only accepts a valid UUID or omission, never `null`, so antd's `allowClear` on the glassware `Select` silently no-ops. A third finding covers a partial-write edge case in the same PATCH handler where ingredient replacement and the recipe metadata update are not committed as a single atomic unit. None of these are security or data-loss critical, but all three degrade correctness/robustness of user-facing edit flows.

## Findings

### WR-01: RecipeForm double-registers `ingredients`/`method` as both a Form.Item and a nested Form.List with the same name

**File:** `apps/barback/src/components/RecipeForm.tsx:102-108`
**Issue:** `RecipeForm` wraps `IngredientListForm` and `MethodStepList` in `<Form.Item name="ingredients" rules={ingredientsRules}>` / `<Form.Item name="method" rules={methodRules}>`. Both child components ignore any `value`/`onChange` props (they take no props at all — see `apps/barback/src/components/IngredientListForm.tsx:12` and `apps/barback/src/components/MethodStepList.tsx:11`) and instead independently declare `<Form.List name="ingredients">` (`IngredientListForm.tsx:21`) / `<Form.List name="method">` (`MethodStepList.tsx:13`) against the same form instance and the same field path. Registering two fields at the identical path in one antd `Form` is a known anti-pattern: the outer `Form.Item`'s own tracked value for `ingredients`/`method` is never fed by the inner `Form.List` (since the child discards the injected props), so the `required: true` rule attached to the outer `Form.Item` is validating a field whose value the real list never updates. This risks the "at least one ingredient/step" client-side validation not reflecting the actual list state (e.g., failing to block/allow submission correctly), and will emit antd dev warnings about duplicate field registration.
**Fix:** Drop `name`/`rules` from the wrapping `Form.Item` (use it purely for `label` layout) and move the `required` rule onto the `Form.List` itself, e.g.:
```tsx
// RecipeForm.tsx
<Form.Item label="Ingredients">
  <IngredientListForm />
</Form.Item>

// IngredientListForm.tsx
<Form.List name="ingredients" rules={[{ validator: async (_, list) => {
  if (!list || list.length < 1) return Promise.reject(new Error('At least one ingredient is required'))
} }]}>
```
Same fix applies to `method`/`MethodStepList`.

### WR-02: PATCH /api/recipes/:id cannot clear an existing glasswareId (or garnish) back to "none"

**File:** `apps/server/src/routes/recipes.ts:234`
**Issue:** `recipeInput.glasswareId` (`packages/shared/src/recipe.ts:25`) is `z.string().uuid().optional()` — it accepts a valid UUID or omission, but never `null`. `recipePatch` is `recipeInput.partial()`, so it inherits the same shape. The PATCH handler only writes the field when it's present: `...(patch.glasswareId !== undefined && { glasswareId: patch.glasswareId })`. Since JSON.stringify drops `undefined` keys, a client has no way to send "clear this field" — omitting the key means "leave unchanged," and there is no `null` variant that means "unset." This directly breaks D-17 ("glasswareId is nullable... or none") for the edit path: `GlasswareSelector`'s `allowClear` (`apps/barback/src/components/GlasswareSelector.tsx:17`) sets the antd field to `undefined` on clear, which is then omitted from the PATCH body, so clearing glassware on an existing recipe silently does nothing — the old glasswareId sticks. Same gap applies to `garnish` (`recipe.ts:26`), though the `TextArea` there happens to submit `''` on clear (not `undefined`), which masks the issue for that field only by accident of widget behavior, not by contract design.
**Fix:** Make the field explicitly nullable at the wire level and thread that through:
```ts
// packages/shared/src/recipe.ts
glasswareId: z.string().uuid().nullable().optional(),
garnish: z.string().trim().max(200).nullable().optional(),
```
Then in the route, distinguish "not present" (`undefined`, skip) from "explicitly null" (write `null`) — the existing `!== undefined` guard already does this correctly once `null` is a valid member of the type.

### WR-03: PATCH /api/recipes/:id is not atomic across ingredient replacement and metadata update

**File:** `apps/server/src/routes/recipes.ts:205-248`
**Issue:** When `patch.ingredients` is present, the delete-then-reinsert is wrapped in its own `db.transaction(...)` (line 213-228) and commits on success. The subsequent `db.update(recipes)...run()` (line 230-239) for name/method/glasswareId/garnish is a *separate* statement outside that transaction, still inside the same `try`. If the ingredients transaction commits successfully but the metadata update then throws (e.g., an unknown `glasswareId` trips the FK constraint), the `catch` returns 400 — but the new ingredient set has already been persisted while the recipe's other fields were not updated. The endpoint ends up doing a partial write and reporting failure, contradicting the comment on `newIngredients` ("never a partially-replaced ingredient set") which only covers the ingredients sub-operation, not the PATCH request as a whole.
**Fix:** Wrap both operations in one transaction so either everything commits or nothing does:
```ts
db.transaction((tx) => {
  if (newIngredients !== undefined) {
    tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id)).run()
    newIngredients.forEach((ing, idx) => { tx.insert(recipeIngredients).values({...}).run() })
  }
  tx.update(recipes).set({...}).where(eq(recipes.id, id)).run()
})
```

## Info

### IN-01: Delete-mutation error handling duplicated across hook files instead of a shared helper

**File:** `apps/barback/src/api/useRecipes.ts:61-81` (and `apps/barback/src/api/useGlassware.ts:70-94`)
**Issue:** `useDeleteRecipe` and `useDeleteGlassware` each hand-roll an identical pattern: bypass `apiFetch`, call `fetch()` directly, check for `204`, otherwise `res.json().catch(() => ({}))` and throw a custom error subclass built from the body. The code comments acknowledge this is deliberately mirrored from `useDeleteCategory`, so it's at least consistent, but three near-identical copies is a missed opportunity to factor out a shared `parseDeleteError(res, ErrorClass)` helper in `client.js`.
**Fix:** Extract a small shared helper (e.g., in `client.ts`) that takes the `Response` and an error constructor and returns/throws consistently, reused by all three delete hooks.

---

_Reviewed: 2026-08-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick_
