# Deferred Items — Phase 1: Barback Inventory Foundation

Out-of-scope discoveries logged during plan execution, per the executor's SCOPE BOUNDARY rule
(only auto-fix issues directly caused by the current task's changes).

## Flaky `pnpm --filter server test` under parallel Vitest workers

- **Found during:** 01-03, Task 1, running the plan's own `<automated>` verify command
- **Symptom:** `pnpm --filter server test` intermittently fails with `SqliteError: database is
  locked` thrown from `sqlite.pragma('journal_mode = WAL')` in `apps/server/src/db/client.ts`.
  Re-running the same command with no code changes passes.
- **Root cause (not introduced by 01-03):** `apps/server/src/routes/ingredients.ts` and
  `apps/server/src/routes/categories.ts` both import `db as defaultDb` from `../db/client.js` at
  module scope (established in plan 01-01). Vitest runs `ingredients.test.ts` and
  `categories.test.ts` in separate parallel workers; each worker's import of the route file
  eagerly opens the same production `data/my-bar.db` file and calls
  `sqlite.pragma('journal_mode = WAL')` on it, even though every actual test uses
  `createTestDb()`'s isolated temp-file database via the route's injectable `db` option.
  Switching journal mode requires a momentary exclusive lock; two workers doing this
  concurrently against the same production file occasionally race.
- **Why out of scope for 01-03:** The race exists between two files this plan doesn't touch the
  import structure of (`db/client.ts`'s module-level side effect, and both route files' eager
  `defaultDb` import), and was already latent as soon as plan 01-02 added a second parallel test
  file. Confirmed via `npx vitest run src/routes/ingredients.test.ts` alone (17/17 pass,
  deterministic) vs. the full `pnpm --filter server test` (intermittent) — the new PATCH route
  and its tests are not the cause.
- **Suggested fix (not applied here):** Make the production `db` connection lazy (open on first
  use, e.g. behind a getter) instead of a module-level side effect, so importing a route file for
  its types/handlers in a test context never touches the real `data/my-bar.db` file at all.
- **Status:** open — does not block 01-03 (verified passing on 3 of 3 re-runs during this plan's
  execution); worth fixing before the phase's final gate if CI ever runs test files in parallel
  by default.
