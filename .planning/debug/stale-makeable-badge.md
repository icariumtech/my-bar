---
status: diagnosed
trigger: "DATA_START\nI have to refresh the page before the Ready to make state changes. For example if I create a recipe with rye as the ingrediant and then mark all the rye bottles as out of stock the recipe sill indicates that it is ready to make\nDATA_END"
created: 2026-08-11T18:00:00Z
updated: 2026-08-11T18:20:00Z
---

## Current Focus

hypothesis: "CONFIRMED — apps/barback/src/api/useIngredients.ts's useToggleStock mutation (the swipe-to-toggle in-stock/out-of-stock action in IngredientRow, and the ONLY UI path that changes an ingredient's inStock value) invalidates only the ['ingredients'] query key in its onSettled callback. It never invalidates ['recipes'], so TanStack Query never marks the cached recipes list stale after a stock toggle, and the Recipes list/detail view keeps rendering the makeable/missing badges computed from the pre-toggle server response until something else (a manual reload, or navigating in a way that remounts/refetches ['recipes']) forces a refetch."
test: "Read apps/barback/src/api/useIngredients.ts, useRecipes.ts, useCategories.ts, useGlassware.ts and compared invalidation patterns; read IngredientRow.tsx + IngredientList.tsx to confirm the swipe toggle is the exclusive call site for stock changes; read AddEditIngredientForm.tsx to confirm the edit-ingredient form structurally cannot change stock (D-08: 'this PATCH never carries a stock field'); confirmed no ingredient-delete mutation/route exists at all; read apps/server/src/routes/recipes.ts + makeableEngine.ts to confirm GET /api/recipes has zero server-side caching and recomputes makeable fresh from the live DB on every request; read apps/barback/src/main.tsx to confirm QueryClient uses default options (staleTime 0), ruling out a client staleTime/gcTime misconfiguration."
expecting: "useToggleStock's onSettled to invalidate ['ingredients'] only, with no ['recipes'] invalidation — matching the exact gap pattern the Phase 2 precedent comments (useRenameCategory, useUpdateGlassware) explicitly call out as the thing to avoid."
next_action: "DONE — return ROOT CAUSE FOUND to caller (goal: find_root_cause_only, no fix applied)."

## Symptoms

expected: "The recipe list shows every recipe with a name and a makeable/not-makeable badge, computed server-side (never recomputed in the browser). When an ingredient's in-stock status changes (e.g. marking all bottles of an ingredient out-of-stock in Barback's inventory screen), the recipes list's makeable/not-makeable badge reflects that change without requiring a manual page reload — TanStack Query keeps client caches in sync via invalidation on mutation success/settle."
actual: "The recipe list/detail keeps showing the pre-change makeable state until the page is manually reloaded. Reported case: create a recipe requiring rye, mark all rye bottles out of stock via the Barback swipe-toggle, return to Recipes without reloading — recipe still shows 'Ready to make' instead of 'Missing: {category}'."
errors: "None — no crash, just stale UI state. No console errors, no failed network requests; GET /api/recipes simply isn't re-invoked after the stock-toggle mutation settles."
reproduction: "In Barback, create a recipe requiring an ingredient category (e.g. rye). Go to the Inventory/Ingredients screen and swipe-toggle all bottles in that category to out-of-stock (the undo grace period elapses, committing the PATCH via useToggleStock). Return to the Recipes list without a manual page reload — the recipe still shows 'Ready to make' instead of 'Missing: {category}'. A manual reload immediately shows the correct state, confirming server truth is correct and this is a client cache staleness issue."
started: "Discovered during manual UAT of Phase 02 (Recipe Collection & Makeable Engine, test 6 in 02-UAT.md / gap G-02-9). The recipes list is a fresh Phase 2 feature; the ingredient in-stock toggle (useToggleStock) is a pre-existing Phase 1 feature (INV-03) that predates ['recipes'] existing as a query key."

## Eliminated

- hypothesis: "Server-side caching bug — GET /api/recipes or computeMakeable() returns stale data from some cache layer instead of recomputing fresh"
  evidence: "apps/server/src/routes/recipes.ts's GET / handler runs a fresh `db.select(...).from(recipes)...all()` plus loadRecipe() -> computeMakeable() on every single request, with no memoization, no response cache, no ETag short-circuit, and no in-process cache object anywhere in the route or in apps/server/src/services/makeableEngine.ts. computeMakeable() itself issues a live `db.select({categoryId: ingredients.categoryId}).from(ingredients).where(eq(ingredients.inStock, true))` query against the real (or injected test) db on every call — there is no caching layer to be stale. This is also independently confirmed by the user's own report: a manual page reload immediately shows the correct 'Missing: rye' state, which is only possible if the server recomputes fresh on that reload's GET /api/recipes call."
  timestamp: 2026-08-11T18:10:00Z

- hypothesis: "Client-side TanStack Query global staleTime/gcTime misconfiguration causing ['recipes'] to be treated as fresh long after it should refetch"
  evidence: "apps/barback/src/main.tsx instantiates `new QueryClient()` with no defaultOptions argument at all — staleTime defaults to 0 (always stale, refetch-on-invalidate/refetch-on-mount eligible) and there is no per-query override on useRecipes()'s useQuery({ queryKey: ['recipes'], queryFn: ... }) in apps/barback/src/api/useRecipes.ts. A staleTime/gcTime misconfiguration would also be unfalsifiable against the reported symptom, since even a long staleTime is irrelevant if invalidateQueries(['recipes']) is never called in the first place — which is what's actually happening."
  timestamp: 2026-08-11T18:12:00Z

- hypothesis: "The ingredient edit form (AddEditIngredientForm, via useUpdateIngredient) is the mutation responsible for the missed invalidation"
  evidence: "AddEditIngredientForm.tsx's handleSubmit for the edit path explicitly submits `values` from a form containing exactly three fields (name, categoryId, note) with an explicit code comment: 'D-08: this PATCH never carries a stock field — the form has no stock control, and useUpdateIngredient's contract (ingredientPatch) structurally cannot flip it.' Grepped the whole barback+server src tree for any ingredient-delete mutation/route and found none exists. The swipe-toggle (IngredientRow -> IngredientList.handleCommitToggle -> useToggleStock) is therefore the sole UI path capable of reproducing the reported symptom, not useUpdateIngredient (which is still worth auditing separately since it also omits a ['recipes'] invalidation, but it cannot produce THIS specific repro since it can never change inStock)."
  timestamp: 2026-08-11T18:14:00Z

## Evidence

- timestamp: 2026-08-11T18:05:00Z
  checked: "apps/barback/src/api/useIngredients.ts — all four hooks (useIngredients, useCreateIngredient, useUpdateIngredient, useToggleStock)"
  found: "useToggleStock's mutationFn PATCHes /ingredients/:id/stock (the swipe-toggle commit path per its own comment: 'INV-03/D-08: fired only after IngredientRow's undo grace timer elapses'). Its onSettled callback invalidates only `queryClient.invalidateQueries({ queryKey: ['ingredients'] })` — no ['recipes'] invalidation anywhere in the file. useUpdateIngredient's onSettled invalidates ['ingredients'] + ['categories'] (also missing ['recipes'], but per Eliminated above it can never actually change inStock, so it's a latent secondary gap not the trigger of this repro)."
  implication: "This is the mutation that fires on every stock toggle and it structurally cannot cause a ['recipes'] refetch — TanStack Query has no way to know the recipes list depends on ingredient stock state unless told via invalidateQueries."

- timestamp: 2026-08-11T18:06:00Z
  checked: "apps/barback/src/api/useGlassware.ts's useUpdateGlassware (D-17, Phase 2's own established precedent) and apps/barback/src/api/useCategories.ts's useRenameCategory (D-03, Phase 1's cross-entity precedent)"
  found: "Both mutations explicitly invalidate TWO query keys in onSettled — useUpdateGlassware invalidates ['glassware'] AND ['recipes'] (comment: 'a rename changes the glasswareName label joined onto every recipe response ... invalidating only [\"glassware\"] would leave the recipes list showing the stale label'); useRenameCategory invalidates ['categories'] AND ['ingredients'] for the parallel reason. This is a codebase-established pattern: any mutation whose effect is read by a DIFFERENT query key's derived/joined data must invalidate both keys."
  implication: "The codebase already knows and applies this pattern correctly elsewhere — useToggleStock is the one mutation that skips it, most likely because it was written in Phase 1 (01-04, per STATE.md's WR-01/WR-02 quick-task reference) before ['recipes'] existed as a query key at all, and was never revisited when Phase 2 introduced the recipes list's dependency on live ingredient stock state."

- timestamp: 2026-08-11T18:08:00Z
  checked: "apps/barback/src/components/IngredientRow.tsx and IngredientList.tsx"
  found: "IngredientRow's swipe gesture calls startToggle() -> (after a 3s undo grace period) onCommitToggle(id, nextInStock). IngredientList wires onCommitToggle to handleCommitToggle, which calls `toggleStock.mutate({ id, inStock: nextInStock })` — i.e. useToggleStock. This swipe-toggle is the only UI affordance for changing inStock; IngredientRow explicitly documents (per 01-RESEARCH.md) that a toggle switch, whole-row tap, or any other stock-change mechanism was deliberately ruled out."
  implication: "Confirms the reported repro ('mark all the rye bottles as out of stock') goes exclusively through useToggleStock, the exact mutation missing the ['recipes'] invalidation."

- timestamp: 2026-08-11T18:16:00Z
  checked: "apps/server/src/routes/recipes.ts (GET/POST/PATCH/DELETE handlers, loadRecipe()) and apps/server/src/services/makeableEngine.ts (computeMakeable())"
  found: "GET / builds its response with `db.select({id: recipes.id}).from(recipes).orderBy(asc(recipes.name)).all()` then `.map((r) => loadRecipe(db, r.id))` on every request — no caching. loadRecipe() calls `computeMakeable(requiredCategoryIds, db)` which itself runs `db.select({categoryId: ingredients.categoryId}).from(ingredients).where(eq(ingredients.inStock, true)).all()` fresh, every call. No memoization, no HTTP cache headers, no Fastify caching plugin registered."
  implication: "Server-side makeable computation is provably always fresh — fully rules out any server-side caching explanation; the bug is 100% client-side (TanStack Query cache never told to refetch)."

- timestamp: 2026-08-11T18:18:00Z
  checked: "apps/barback/src/main.tsx (QueryClient construction) and apps/barback/src/api/useRecipes.ts (useRecipes' useQuery call)"
  found: "`const queryClient = new QueryClient()` — no defaultOptions, so TanStack Query's built-in default staleTime (0ms) and gcTime apply globally. useRecipes()'s useQuery({ queryKey: ['recipes'], queryFn: () => apiFetch<Recipe[]>('/recipes') }) has no per-query staleTime/gcTime override either."
  implication: "Rules out a staleTime/gcTime misconfiguration as an alternative explanation — with staleTime 0, an invalidateQueries(['recipes']) call (if it existed in useToggleStock) would trigger an immediate refetch for any mounted observer of ['recipes']. The absence of the invalidation call itself is the sole gap."

## Resolution

root_cause: "apps/barback/src/api/useIngredients.ts's useToggleStock mutation — the swipe-to-toggle in-stock/out-of-stock action in IngredientRow, and the sole UI path capable of changing an ingredient's inStock value (the edit form structurally cannot per D-08, and no ingredient-delete mutation exists) — invalidates only the ['ingredients'] query key in its onSettled callback. It never invalidates ['recipes']. Since the makeable/missingCategoryNames fields on every recipe are derived from live ingredient in-stock state (computeMakeable() queries ingredients.inStock fresh on every GET /api/recipes call, confirmed server-side, no caching layer), the recipes list and detail view's TanStack Query cache is never marked stale after a stock toggle and therefore never refetches — even though the server would return the correct up-to-date makeable status immediately if asked. This is the exact cross-entity invalidation gap the codebase's own established pattern (useRenameCategory invalidating ['categories']+['ingredients']; useUpdateGlassware invalidating ['glassware']+['recipes']) already solves correctly elsewhere — useToggleStock is the one outlier, almost certainly because it was written in Phase 1 (01-04, INV-03) before the ['recipes'] query key existed at all, and was never revisited when Phase 2 introduced the recipes list's runtime dependency on ingredient stock state. A manual page reload works because it performs a fresh mount/fetch of ['recipes'], bypassing the cache entirely — this is consistent with, and fully explains, the user's exact reported workaround."
fix:
verification:
files_changed: []
