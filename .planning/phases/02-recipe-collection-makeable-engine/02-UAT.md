---
status: testing
phase: 02-recipe-collection-makeable-engine
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md, 02-06-SUMMARY.md, 02-07-SUMMARY.md, 02-08-SUMMARY.md]
started: 2026-08-11T15:12:31Z
updated: 2026-08-11T18:05:00Z
---

## Current Test

number: 6
name: Recipe list shows makeable badges (re-test after G-02-9 fix)
expected: |
  Create (or reuse) a recipe requiring rye. Mark all rye bottles out of stock in the Ingredients screen. Return to the Recipes list/detail WITHOUT reloading the page — the badge should now show "Missing: rye" (or similar) live, no manual refresh needed.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Start the application from scratch (`pnpm -F @my-bar/server dev` or equivalent). Server boots without errors, `glassware`/`recipes`/`recipe_ingredients` tables are present, and loading the Barback app's Recipes list returns data (or the empty state) without errors.
result: pass

### 2. Glassware delete-guard race fallback (code inspection only)
expected: This is a defensive-code path (concurrent delete-vs-insert race), not reachable through normal UI interaction — confirm you're OK treating this as covered by code review/pattern-parity rather than a live click-through.
result: pass

### 3. Open Glassware manager and add/rename/delete a glassware type
expected: From the Barback header, a "Glassware" button opens a manager modal. Add a new glassware type, rename it, then delete an unused one — all three actions work from the phone/iPad UI.
result: pass

### 4. Delete a glassware type still used by a recipe
expected: Attempting to delete a glassware entry referenced by a recipe shows a refusal message: "This glassware is used by N recipe(s) — remove or reassign them first." with the real recipe count.
result: pass

### 5. Glassware manager empty state
expected: With zero glassware types, the manager shows "No glassware types yet" / "Add glassware options for your recipes."
result: pass

### 6. Recipe list shows makeable badges
expected: The recipe list shows every recipe with a name and a makeable/not-makeable badge, computed server-side (never recomputed in the browser). Toggling an ingredient's in-stock status elsewhere in Barback updates the recipe's badge without a manual page reload.
result: [pending]
note: "Was G-02-9 (stale badge until manual refresh) — fix in plan 02-08 verified by automated regression test + full suite, but re-testing live since that's exactly how the last two bugs surfaced despite green tests."

### 7. Search the recipe list by name
expected: Typing in the recipe search box filters the list to matching names.
result: pass

### 8. Delete a recipe from its row
expected: Clicking delete on a recipe row shows a confirmation naming the recipe ("Delete {name}? This can't be undone.") before it's actually removed.
result: pass

### 9. Recipe list empty state
expected: With zero recipes, the list shows "No recipes yet" / "Add your first recipe to build your menu."
result: pass

### 10. Ingredient/method sub-form behavior
expected: The ingredient sub-form requires at least one ingredient line. The method sub-form numbers steps sequentially and renumbers correctly after removing a step from the middle. The unit dropdown offers only the fixed set of units (no free text entry).
result: pass

### 11. Create a new recipe end-to-end
expected: From the Barback UI, create a recipe with name, ingredients, method, optional glassware, optional garnish. It appears in the list immediately after saving.
result: pass

### 12. Edit an existing recipe
expected: Opening Edit on a recipe pre-fills the form with all its current values, including glassware.
result: pass

### 13. Reach Recipes from the Barback header
expected: A "Recipes" button in the existing Barback header opens the Recipes area (no separate app or route) — from there you can add, edit, view, and delete recipes.
result: pass
note: "User: 'pass, but I don't like this UI' — functional behavior confirmed; asked for specifics on the aesthetic complaint since it's currently too vague to act on."

### 14. [coverage] POST /api/recipes creates a recipe with name, ingredients, method, glassware, garnish
expected: POST /api/recipes creates a recipe with name, category-based ingredient lines (quantity+unit), ordered method steps, optional glassware, optional garnish
result: pass
source: automated
coverage_id: D1 (02-01)

### 15. [coverage] GET /api/recipes returns server-computed makeable boolean
expected: GET /api/recipes returns every recipe with a server-computed makeable boolean, never client-computed
result: pass
source: automated
coverage_id: D2 (02-01)

### 16. [coverage] Not-makeable recipes expose missing category ids/names
expected: Not-makeable recipes expose missingCategoryIds and missingCategoryNames for every category with zero in-stock ingredients
result: pass
source: automated
coverage_id: D3 (02-01)

### 17. [coverage] Matching is category-based, not brand-based
expected: Matching is category-based — any in-stock bottle in the required category satisfies it, never a specific brand
result: pass
source: automated
coverage_id: D4 (02-01)

### 18. [coverage] Quantity/unit never influence makeable computation
expected: Quantity/unit are stored and returned exactly as submitted and never influence the makeable computation (presence-based, volume-agnostic)
result: pass
source: automated
coverage_id: D5 (02-01)

### 19. [coverage] Recipe creation validation edge cases
expected: Empty ingredients/method rejected 400; unknown categoryId/glasswareId rejected 400 not 500; duplicate recipe names allowed
result: pass
source: automated
coverage_id: D6 (02-01)

### 20. [coverage] Dev DB has glassware/recipes/recipe_ingredients tables
expected: Dev database physically has the glassware/recipes/recipe_ingredients tables
result: pass
source: automated
coverage_id: D7 (02-01)

### 21. [coverage] PATCH updates only supplied fields
expected: PATCH /api/recipes/:id updates only the fields supplied, leaving the rest untouched
result: pass
source: automated
coverage_id: D1 (02-02)

### 22. [coverage] PATCH ingredient replace is atomic
expected: PATCH with a replaced ingredients array atomically swaps the set; makeable/missing fields reflect the NEW set
result: pass
source: automated
coverage_id: D2 (02-02)

### 23. [coverage] PATCH edge cases (empty body, unknown id, unknown categoryId)
expected: PATCH with an empty body ({}) is rejected 400 before any write; unknown id 404; unknown categoryId in ingredients 400 not 500
result: pass
source: automated
coverage_id: D3 (02-02)

### 24. [coverage] DELETE cascades recipe_ingredients
expected: DELETE /api/recipes/:id cascades recipe_ingredients, verified by direct table query, not assumed; unknown id 404; repeated delete 204-then-404
result: pass
source: automated
coverage_id: D4 (02-02)

### 25. [coverage] Category delete-guard counts recipe references (D-21)
expected: Category deletion refused if referenced by recipe ingredient lines alone, with an accurate recipe(s) count; combined ingredient+recipe conflict produces one message with both counts
result: pass
source: automated
coverage_id: D5 (02-02)

### 26. [coverage] Ingredient-only category delete-guard regression
expected: Existing ingredient-only category delete-guard message (Phase 1) is unchanged
result: pass
source: automated
coverage_id: D6 (02-02)

### 27. [coverage] Glassware list/create/rename mirrors categories CRUD (D-17)
expected: Owner can list, create, and rename glassware entries via GET/POST/PATCH /api/glassware, mirroring the categories CRUD pattern exactly
result: pass
source: automated
coverage_id: D1 (02-03)

### 28. [coverage] Glassware names unique
expected: Glassware names are unique — creating or renaming onto an existing name is refused with 409, never a duplicate row
result: pass
source: automated
coverage_id: D2 (02-03)

### 29. [coverage] Glassware delete-guard refuses with accurate count (D-22)
expected: Deleting a glassware entry still referenced by any recipe is refused with 409 and an accurate recipe count, using the exact D-22 copy from 02-UI-SPEC.md
result: pass
source: automated
coverage_id: D3 (02-03)

### 30. [coverage] Unreferenced glassware deletes cleanly
expected: Deleting an unreferenced glassware entry succeeds with 204
result: pass
source: automated
coverage_id: D4 (02-03)

### 31. [coverage] Glassware rename invalidates glassware + recipes caches
expected: Renaming a glassware entry invalidates both the glassware list and the recipes list, mirroring D-03's category-rename-propagates-to-ingredients precedent
result: pass
source: automated
coverage_id: D4 (02-04)

### 32. [coverage] Recipe detail view renders ingredients/method/glassware/garnish
expected: Recipe detail view shows ingredients (qty/unit/category), numbered method, glassware name or 'None specified', garnish, and makeable status
result: pass
source: automated
coverage_id: D3 (02-06)

### 33. [coverage] Not-makeable detail shows exact missing-ingredient sentence
expected: Not-makeable recipe detail shows the exact sentence "Can't make this right now. Missing: {category names}." using server-computed missingCategoryNames
result: pass
source: automated
coverage_id: D4 (02-06)

### 34. [coverage] Recipe save failure shows contracted error copy
expected: Recipe save failure shows the exact contracted error copy without losing typed values; Save Recipe button shows a loading state bound to the active mutation
result: pass
source: automated
coverage_id: D5 (02-06)

## Summary

total: 34
passed: 33
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- gap_id: G-02-6
  truth: "The recipe list shows every recipe with a name and a makeable/not-makeable badge, computed server-side (never recomputed in the browser)."
  status: resolved
  resolved_by: 02-07-PLAN.md
  resolved_at: 2026-08-11
  reason: "User reported: fail, when I try to save a recipe I get an error \"Couldn't save recipe - check your connection and try again.\" (POST /api/recipes appears to be failing in real usage)"
  severity: blocker
  test: 6
  root_cause: "UnitDropdown.tsx renders a bare, prop-less <Select> — it accepts zero props, so it never receives/forwards the value/onChange antd's Form.Item injects into its direct child. Every ingredient line's unit field is therefore always submitted as undefined. packages/shared/src/recipe.ts's recipeIngredientInput.unit is a required z.enum(...), so Fastify's Zod validator rejects every recipe save with 400 Bad Request. Confirmed via direct curl repro (payload without unit -> 400; with unit -> 201) and by tracing antd's Form engine source. Secondary/contributing cause: apps/barback/src/api/client.ts's apiFetch() discards the server's real {error} body on non-2xx responses, so RecipeForm always shows the same generic 'check your connection' Alert regardless of actual cause, masking the real 400 validation failure as a network problem."
  artifacts:
    - path: "apps/barback/src/components/UnitDropdown.tsx"
      issue: "Doesn't forward value/onChange to the wrapped <Select> — Form.Item can't control it"
    - path: "apps/barback/src/components/GlasswareSelector.tsx"
      issue: "Same defect pattern (destructures only { glassware }, drops value/onChange) — latent, doesn't block repro because glasswareId is optional"
    - path: "apps/barback/src/api/client.ts"
      issue: "apiFetch() swallows the server's real error body on non-2xx responses, producing a misleading generic message for any failure type"
  missing:
    - "UnitDropdown must accept and forward value/onChange props to the inner <Select> (destructure+spread, or inline <Select> directly as Form.Item's child like other working bindings)"
    - "GlasswareSelector must accept and forward value/onChange the same way"
    - "apiFetch should surface the server's actual error message instead of a generic string, so future validation failures aren't misread as network problems"
  debug_session: ".planning/debug/recipe-save-fails-connection.md"

- gap_id: G-02-9
  truth: "The recipe list shows every recipe with a name and a makeable/not-makeable badge, computed server-side (never recomputed in the browser)."
  status: resolved
  resolved_by: 02-08-PLAN.md
  resolved_at: 2026-08-11
  reason: "User reported: I have to refresh the page before the Ready to make state changes. For example if I create a recipe with rye as the ingrediant and then mark all the rye bottles as out of stock the recipe sill indicates that it is ready to make"
  severity: major
  test: 6
  root_cause: "apps/barback/src/api/useIngredients.ts's useToggleStock mutation (the swipe-to-toggle in-stock/out-of-stock action in IngredientRow — the sole UI path that can change an ingredient's inStock value) invalidates only the ['ingredients'] query key in its onSettled callback; it never invalidates ['recipes']. The server recomputes makeable fresh on every GET /api/recipes request (no server-side caching), so a manual reload always shows correct data — this is purely a client TanStack Query cache-invalidation gap, not a bug in computeMakeable(). It is the one outlier against the codebase's own established cross-entity-invalidation pattern (useRenameCategory invalidates ['categories']+['ingredients']; useUpdateGlassware invalidates ['glassware']+['recipes']) — useToggleStock predates the ['recipes'] query key (written in Phase 1, before recipes existed) and was never revisited when Phase 2 added the recipes list's dependency on ingredient stock."
  artifacts:
    - path: "apps/barback/src/api/useIngredients.ts"
      issue: "useToggleStock's onSettled is missing queryClient.invalidateQueries({ queryKey: ['recipes'] })"
  missing:
    - "useToggleStock must also invalidate ['recipes'] in onSettled, mirroring useUpdateGlassware/useRenameCategory's established cross-entity-invalidation pattern"
    - "Worth auditing useUpdateIngredient for the same latent gap while in there (structurally can't change stock today via the edit form, but the missing invalidation is still incorrect)"
  debug_session: ".planning/debug/stale-makeable-badge.md"
