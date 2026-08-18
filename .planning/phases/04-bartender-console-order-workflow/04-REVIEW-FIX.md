---
phase: 04-bartender-console-order-workflow
fixed_at: 2026-08-18T22:23:49Z
review_path: .planning/phases/04-bartender-console-order-workflow/04-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-08-18T22:23:49Z
**Source review:** .planning/phases/04-bartender-console-order-workflow/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (Critical: 2, Warning: 2 — Info findings excluded per `fix_scope: critical_warning`)
- Fixed: 4
- Skipped: 0

**Verification environment:** All edits, syntax/type checks, and test runs happened inside the isolated git worktree at `.claude/worktrees/rf-04-263444-1787091525` (on temp branch `gsd-reviewfix/04-263444`, forked from `gsd/phase-04-bartender-console-order-workflow`). The worktree required a one-time `pnpm install` and a `pnpm -F @my-bar/shared build` (to produce `packages/shared/dist/*.d.ts`) before `tsc --noEmit` / `vitest` could resolve the `@my-bar/shared` workspace import — this is a normal fresh-worktree bootstrap step, not a code issue. Both `apps/server` and `apps/patron` test suites pass in full after all four fixes (117/117 and 67/67 respectively), and this worktree's commits fast-forward directly onto the same branch the main checkout has checked out, so the numbers reproduce identically there once the branch pointer moves.

## Fixed Issues

### CR-01: `POST /api/recipes` has no transaction — a mid-loop FK failure leaves a partially-created recipe committed

**Files modified:** `apps/server/src/routes/recipes.ts`
**Commit:** `a75791c`
**Applied fix:** Wrapped the `recipes` insert, the per-ingredient `recipeIngredients` inserts, and the per-tag `recipeTags` inserts in a single `db.transaction((tx) => {...})` block, mirroring the pattern already used by the PATCH handler a few lines below. A mid-loop FK/UNIQUE violation now rolls back everything inserted so far in the same request, instead of leaving an orphaned partial recipe row committed while the client is told the whole request failed with a 400.
**Verification:** `tsc --noEmit` clean on the modified file; full `@my-bar/server` suite (117 tests) passes unchanged.

### CR-02: `PATCH /api/recipes/:id` — the final `recipes` row update runs outside the ingredients/tags transaction

**Files modified:** `apps/server/src/routes/recipes.ts`
**Commit:** `6e345de`
**Applied fix:** Moved the trailing `db.update(recipes).set({...}).run()` call (name/method/glasswareId/garnish/description) inside the same `db.transaction((tx) => {...})` block that replaces `ingredients`/`tagIds`. The transaction is now always opened (previously it was conditionally opened only `if (newIngredients !== undefined || newTagIds !== undefined)`) so the recipe-row update participates in the same atomic unit regardless of which fields the patch touches — either the whole PATCH commits or none of it does.
**Verification:** `tsc --noEmit` clean on the modified file; full `@my-bar/server` suite (117 tests) passes unchanged.

### WR-01: Patron `RecipeDetail.tsx` — uncancelled `setTimeout` can force-navigate away from a different, later-opened recipe

**Files modified:** `apps/patron/src/components/RecipeDetail.tsx`
**Commit:** `14336e6`
**Applied fix:** Replaced the raw `setTimeout(() => onBack(), 3000)` inline in `handleOrderSubmit`'s `onSuccess` with a `useEffect(() => { if (!showConfirmation) return; const timer = setTimeout(() => onBack(), 3000); return () => clearTimeout(timer) }, [showConfirmation, onBack])`. Deviated from the REVIEW.md snippet's placement: the effect had to be declared *above* the component's `isLoading`/`isError` early returns (not after them, as the raw suggestion implied), since React requires hooks to run unconditionally on every render — placing it after the early returns would have violated the Rules of Hooks (a conditionally-called hook), which was caught during Tier 1 re-read verification before commit.
**Verification:** `tsc --noEmit` clean on the modified file; full `@my-bar/patron` suite (67 tests) passes unchanged, including the existing "shows a confirmation on successful submit and returns to browse after ~3s" fake-timer test.
**Note:** `status: "fixed: requires human verification"` — Tier 1/2 verification confirms the fix compiles and the existing single-instance timer test still passes, but no test in the suite reproduces the exact multi-instance race described in the finding (opening Drink B while Drink A's confirmation timer is still pending). Recommend a manual/UAT pass exercising that specific sequence.

### WR-02: Patron `useWakeLock` never re-acquires the wake lock after the browser auto-releases it

**Files modified:** `apps/patron/src/hooks/useWakeLock.ts`
**Commit:** `6e05886`
**Applied fix:** Rewrote the hook to track the acquired `WakeLockSentinel` in a local variable, add a `visibilitychange` listener that re-acquires the lock when `document.visibilityState` becomes `'visible'`, and release the sentinel on unmount. Adapted from the REVIEW.md snippet: the cleanup's sentinel release is chained as `sentinel?.release?.()?.catch(() => {})` (optional-chaining through the `release` method itself, not just the `sentinel` reference) because the hook's own existing test suite mocks `navigator.wakeLock.request` to resolve `{}` — an object with no `release` method — so the REVIEW.md's `sentinel?.release().catch(...)` form would have thrown a `TypeError` on unmount during that test's automatic RTL cleanup.
**Verification:** `tsc --noEmit` clean on the modified file; full `@my-bar/patron` suite (67 tests) passes unchanged, including the existing acquire/absent-API/rejected-request tests.
**Note:** `status: "fixed: requires human verification"` — the existing test suite only covers initial acquisition (present API, absent API, rejected promise); it does not exercise the new `visibilitychange`-triggered re-acquisition path this fix adds. Recommend either a manual verification on an actual iPad (lock/unlock the screen and confirm the wake lock feature keeps working) or a follow-up test using a simulated `visibilitychange` event before this is considered fully verified.

## Skipped Issues

None — all 4 in-scope findings were fixed.

---

_Fixed: 2026-08-18T22:23:49Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
