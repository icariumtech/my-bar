---
status: resolved
trigger: "DATA_START\nWhen I go to the recipes tab I see a spinner about loading recipes then it errors out with \"Couldn't load recipes - check your connectinoo and try again\" with a retry button\nDATA_END"
created: 2026-08-12T20:40:00Z
updated: 2026-08-12T20:47:05Z
---

## Current Focus

hypothesis: "CONFIRMED — the live dev database (apps/server/data/my-bar.db, on disk in the main checkout, holding the owner's real inventory) was never migrated for Phase 2.1's schema change (recipe_ingredients.ingredient_id / requires_specific, added in plan 02.1-01). That migration was run via `pnpm -F @my-bar/server db:push` inside 02.1-01's isolated git worktree during phase execution — worktrees are separate filesystem checkouts and `data/` is gitignored, so the push only ever touched that worktree's own throwaway copy of the database, never the main tree's persistent file the user's running dev server actually reads from."
test: "curl http://localhost:3000/api/recipes against the actual running dev server"
expecting: "500 SQLITE_ERROR: no such column: recipe_ingredients.ingredient_id — confirmed exactly, matching the client's generic 'Couldn't load recipes' Alert (RecipeList's isError branch collapses any fetch failure to the same static copy, same pattern as the recipe-save-fails-connection.md precedent)."
next_action: "DONE — ran `pnpm db:push` from apps/server against the live database. Confirmed via PRAGMA table_info(recipe_ingredients) that ingredient_id/requires_specific now exist, and GET /api/recipes returns 200 with real data (also spot-checked /api/ingredients and /api/categories, both 200)."

## Symptoms

expected: "Recipes tab loads the recipe list (spinner briefly, then cards/rows)."
actual: "Spinner, then RecipeList's error state: 'Couldn't load recipes — check your connection and try again' with a Retry button."
errors: "GET /api/recipes → 500 {\"statusCode\":500,\"code\":\"SQLITE_ERROR\",\"error\":\"Internal Server Error\",\"message\":\"no such column: recipe_ingredients.ingredient_id\"}"
reproduction: "Open Barback, tap Recipes tab. 100% reproducible pre-fix (every request to loadRecipe()/computeMakeable() selects the missing column)."
started: "Immediately after Phase 02.1 execution (tri-state makeable engine plan 02.1-01), which added the ingredientId/requiresSpecific columns to the recipe_ingredients schema. Not caught earlier because Ingredients tab and BottomTabBar don't touch recipe_ingredients at all, and the barback/server test suites use an isolated in-memory/ephemeral test DB (test-helpers.ts) that's built fresh from the current schema.ts on every test run — so the test suite could never have caught a stale *deployed* database, only a stale *schema definition*.

## Resolution

Root cause: environment/deployment gap, not a code defect — `drizzle-kit push` was run against the wrong (worktree-local) database copy during phase execution instead of the actual persistent dev database.

Fix applied: `pnpm --filter server db:push` run directly against `apps/server/data/my-bar.db` (the live database the running server process reads from). Additive-only change (new nullable `ingredient_id` FK + `requires_specific` boolean with default) — no data loss, no schema conflict, existing rows unaffected. No source code changes required.

Follow-up note for future phases: when a plan runs a database migration inside a worktree-isolated executor, the orchestrator should re-run that migration against the primary checkout's live database after merging the worktree back — worktree isolation silently protects the main tree's data file, which is normally desirable, but for `db:push` specifically it means the migration never reaches the environment that actually matters until someone notices a 500.
