---
phase: 01-barback-inventory-foundation
verified: 2026-08-10T23:00:00Z
status: passed
score: 15/15 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 14/15
  gaps_closed:
    - "WR-01 (optimistic-render commit-boundary flicker) — previously ⚠️ PRESENT_BEHAVIOR_UNVERIFIED (truth #15), now VERIFIED via 01-UAT.md test 30 (pass): a human watched the exact grace-period-elapse/commit moment on a real phone and confirmed no flicker back to the stale value."
    - "WR-02 (unmount-mid-grace-period silent-discard) — previously ⚠️ PRESENT_BEHAVIOR_UNVERIFIED (truth #15), now VERIFIED via 01-UAT.md test 29 (pass): a human swiped a row, filtered it out of view mid-grace-period, and confirmed the toggle still committed (checked via refresh/GET) instead of being silently dropped."
  gaps_remaining: []
  regressions: []
---

# Phase 1: Barback Inventory Foundation Verification Report

**Phase Goal:** Owner can fully manage the bar's real inventory from their phone, with entries persisted to a live backend and reflected back immediately
**Verified:** 2026-08-10T23:00:00Z
**Status:** passed
**Re-verification:** Yes — final pass, after 01-UAT.md was extended with two targeted regression-guard checks (tests 29, 30) and a real human touchscreen pass confirmed both

## Re-Verification Summary

The previous verification (2026-08-10T18:15:00Z) scored 14/15 must-haves with status `human_needed`. Every roadmap Success Criterion (5/5) and 9 of 10 supplementary must-haves were VERIFIED; the sole remaining item was truth #15 — the WR-01/WR-02 regression guards declared as an explicit must-have in plan 01-06's frontmatter (item #7). Both guards were source-verified as correctly wired and unchanged since a prior quick-task fix, but no test of any kind — automated or the just-completed UAT round — had exercised either the unmount-mid-grace-period commit path (WR-02) or the exact-commit-boundary flicker window (WR-01).

Since that verification, 01-UAT.md was extended with two new checkpoints targeting exactly those scenarios:

- **Test 29** (WR-02): swiped a row, filtered it out of the visible list mid-grace-period via search/category chip, confirmed via refresh/GET that the toggle still committed rather than being silently dropped. **Result: pass.**
- **Test 30** (WR-01): watched the exact moment the grace period elapsed and the commit PATCH resolved, confirmed no visible flicker back to the stale value. **Result: pass.**

01-UAT.md is now `status: complete`, 30/30 checks passing. The one historical "issue" entry (test 5's original G-01-5/G-01-5b finding) remains in the file as a historical record but is reconciled as `resolved` in the Gaps section via the 5-retest entry, which also passed.

This re-verification confirms independently: (1) no source changes to `IngredientRow.tsx` or `swipeVisuals.ts` since the prior verification cycle (`git log` shows no commits to either file after 01-06/260810-nth), (2) `pnpm --filter barback test` (5/5) and `pnpm --filter server test` (30/30) both still pass, (3) 01-UAT.md's frontmatter and Summary block confirm 30/30 passing with 0 outstanding fails, and (4) tests 29 and 30's expected/result text maps precisely to truth #15's two named scenarios (WR-01 flicker, WR-02 unmount-discard) — not a loosely related check.

With this closure, all 15 must-haves are now VERIFIED and the human-verification queue is empty. Status moves from `human_needed` to `passed`.

## Goal Achievement

### Observable Truths — ROADMAP Success Criteria (primary contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Owner can add a new bottle/ingredient with name and category from their phone (INV-01) | VERIFIED | `POST /api/ingredients` round-trip confirmed live in prior verification cycles; unchanged this cycle. 01-UAT.md test 3 (pass) confirms on a real phone. |
| 2 | Owner can edit an existing ingredient's name or category (INV-02) | VERIFIED | `PATCH /api/ingredients/:id` confirmed live, unchanged. 01-UAT.md test 7 (pass). REQUIREMENTS.md shows `[x] Complete`. |
| 3 | Owner can toggle any ingredient in-stock/out-of-stock and see the change take effect immediately (INV-03) | VERIFIED | Server-side round-trip confirmed live (unchanged). Client-side deferred-commit/hold/undo mechanism VERIFIED via 01-UAT.md test 5-retest (pass) and test 6 (pass). The two remaining edge-case regression guards (WR-01/WR-02) are now separately closed as truth #15 below. |
| 4 | Owner can search or filter the inventory list by name or category to quickly find an item (INV-04) | VERIFIED | `IngredientList.tsx` memoized filter confirmed via source trace, unchanged. 01-UAT.md tests 12 and 13 (pass) confirm instant narrowing and AND-combination with category chips on a real phone. REQUIREMENTS.md shows `[x] Complete`. |
| 5 | The inventory screen is comfortably usable one-handed on a phone (mobile-first responsive) (INV-05) | VERIFIED | VERIFIED via 01-UAT.md test 2 (pass) and test 14 (pass: comfortably tappable one-handed, sticky search, legible in dim light). |

**Score (primary):** 5/5 roadmap Success Criteria VERIFIED.

### Observable Truths — Supplementary Plan Must-Haves

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | A newly added bottle is in-stock by default with no extra interaction (D-09) | VERIFIED | Unchanged; schema-level default confirmed live. |
| 7 | A category still referenced by an ingredient cannot be deleted; deletion is refused with an accurate count (D-03) | VERIFIED | Unchanged; live 409 with exact copy + `ingredientCount` confirmed. 01-UAT.md test 24 (pass, automated). |
| 8 | Renaming a category propagates its new name to every ingredient row live (D-01) | VERIFIED | Unchanged; live PATCH → GET propagation confirmed. 01-UAT.md test 25 (pass, automated). |
| 9 | Editing a bottle never changes its stock state — the edit form has no stock control (D-08) | VERIFIED | Unchanged; `ingredientPatch` structurally has no `inStock` field. 01-UAT.md test 9 (pass). |
| 10 | One form component serves both add and edit, both submit under "Save Changes" | VERIFIED | Unchanged; single `AddEditIngredientForm`. 01-UAT.md test 10 (pass). |
| 11 | A bar with zero categories is not deadlocked — inline category creation from the add-ingredient flow (D-03) | VERIFIED | Unchanged; `popupRender` "Add Category" footer action. 01-UAT.md test 4 (pass). |
| 12 | No switch control, no whole-row tap toggle, and no blocking confirmation dialog exists in the stock-toggle interaction (D-10) | VERIFIED | Unchanged; `grep -c '<Switch'` / `'Modal.confirm'` both 0 in `IngredientRow.tsx`. 01-UAT.md test 21 (pass, automated) and test 6 (pass, human). |
| 13 | The stock change is deferred behind an undo grace period; a swipe holds in its revealed position with Undo inside the colored reveal area; letting the grace period elapse animates the row back to rest and fires the commit at that point (D-08, D-10, G-01-5b) | VERIFIED | `startToggle` snaps `swipeOffset` to `REVEAL_OFFSET` (signed by direction) and holds it through the grace period; the `setTimeout` callback both calls `onCommitToggle` and resets `swipeOffset` to 0; `undo()` clears the timer and resets `swipeOffset` with no network call. Confirmed via source (`IngredientRow.tsx` lines 90-127), `swipeVisuals.test.ts` (5/5 passing), and 01-UAT.md test 5-retest (pass) + test 6 (pass). |
| 14 | At rest, no ingredient row ever shows the reserved in-stock accent green; an out-of-stock row is visibly greyed via its own independent surface treatment, not opacity bleed-through (G-01-5) | VERIFIED | `getRevealColorClass(0)` returns `bg-transparent` (never `bg-bar-accent`/`bg-bar-destructive`) — asserted by `swipeVisuals.test.ts` (passing); `getRowSurfaceClasses(false)` returns solid `bg-zinc-950` + `text-zinc-500` with no opacity/translucency class — also asserted and passing. 01-UAT.md test 5-retest (pass) confirms this visually on a real phone. |
| 15 | WR-01 (optimistic `pending` value survives the async commit round-trip without flicker) and WR-02 (a still-undoable pending toggle that unmounts before the grace period elapses still commits, not silently discarded) regression guards (01-06 must-have #7) | VERIFIED | Previously ⚠️ PRESENT_BEHAVIOR_UNVERIFIED — source-wired correctly (`IngredientRow.tsx` lines 65-72 unmount-flush effect; lines 84-88 pending-clears-on-server-catchup effect) but with zero test evidence. Now closed: 01-UAT.md test 29 (pass) is a real human touchscreen pass that swiped a row, filtered it out mid-grace-period, and confirmed via refresh/GET that the toggle still committed — the exact WR-02 scenario. 01-UAT.md test 30 (pass) is a real human touchscreen pass that watched the exact commit-boundary moment and confirmed no flicker back to the stale value — the exact WR-01 scenario. Both tests' `expected` text maps 1:1 to the two named regression guards in 01-06's must-have #7, and both are new checkpoints added specifically to close this gap (not a repurposed unrelated check). |

**Score:** 15/15 truths VERIFIED.

### Deferred Items

None.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/ingredient.ts` | Zod contracts (`ingredientInput`, `ingredient`, `stockPatch`, `ingredientPatch`) | VERIFIED | Unchanged. |
| `packages/shared/src/category.ts` | `categoryInput`, `category` | VERIFIED | Unchanged. |
| `apps/server/src/db/schema.ts` | Drizzle tables with FK restrict, unique name, in_stock default true | VERIFIED | Unchanged; confirmed live. |
| `apps/server/src/db/client.ts` | WAL + `foreign_keys = ON` pragmas | VERIFIED | Unchanged. |
| `apps/server/src/routes/ingredients.ts` | GET/POST/PATCH `/`, PATCH `/:id/stock` | VERIFIED | Unchanged; 20/20 tests passing (re-ran this cycle, part of the 30/30 total). |
| `apps/server/src/routes/categories.ts` | GET/POST/PATCH/DELETE | VERIFIED | Unchanged; 10/10 tests passing (re-ran this cycle). |
| `apps/barback/src/components/IngredientList.tsx` | Owns query/filter state, renders all 4 non-populated states | VERIFIED | Unchanged. |
| `apps/barback/src/components/IngredientRow.tsx` | Swipeable row, held-reveal deferred commit, undo-in-reveal | VERIFIED | No source changes since prior verification (`git log` confirms); WR-01/WR-02 effects at lines 65-88 now behaviorally confirmed via 01-UAT.md tests 29-30. |
| `apps/barback/src/components/swipeVisuals.ts` (01-06) | Pure reveal-color / out-of-stock-surface derivation, exports `getRevealColorClass`, `getRowSurfaceClasses` | VERIFIED | Unchanged; 5 unit tests passing. |
| `apps/barback/src/components/swipeVisuals.test.ts` (01-06) | Regression coverage for G-01-5's swipeOffset===0 case and the independent out-of-stock surface treatment | VERIFIED | 5/5 tests passing. |
| `apps/barback/vitest.config.ts` (01-06) | Node-environment vitest config mirroring `apps/server` | VERIFIED | Present; `pnpm --filter barback test` runs and passes. |
| `apps/barback/src/components/AddEditIngredientForm.tsx` | One form, add+edit, inline category create | VERIFIED | Unchanged. |
| `apps/barback/src/components/CategoryManager.tsx` | Add/rename/delete categories, in-use refusal copy | VERIFIED | Unchanged. |
| `apps/barback/src/components/SearchFilterBar.tsx` | Controlled search input + category chips | VERIFIED | Unchanged. |
| `.planning/phases/01-barback-inventory-foundation/01-UAT.md` | Human UAT log covering all 15 must-haves including the WR-01/WR-02 edge cases | VERIFIED | `status: complete`, 30/30 passing, 0 fail; tests 29-30 added and passing since prior verification. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `AddEditIngredientForm.tsx` | `useIngredients.ts` mutations | mutation on submit | WIRED | Unchanged. |
| `useIngredients.ts` / `useCategories.ts` | `apps/server/src/routes/*.ts` | `apiFetch` against REST endpoints | WIRED | Unchanged; confirmed live. |
| `IngredientList.tsx` | `IngredientRow.tsx` | `onCommitToggle` prop backed by `useToggleStock()` | WIRED | Unchanged; this is the exact prop the unmount-flush effect calls (WR-02, now behaviorally confirmed). |
| `IngredientRow.tsx` (render) | `swipeVisuals.ts` | `getRevealColorClass(swipeOffset)`, `getRowSurfaceClasses(displayedInStock)` calls | WIRED | Unchanged since 01-06. |
| `IngredientRow.tsx` (`startToggle`) | `IngredientRow.tsx` (render) | `setSwipeOffset(REVEAL_OFFSET / -REVEAL_OFFSET)` drives the `translateX` transform | WIRED | Unchanged. |
| `IngredientRow.tsx` (grace-period timeout) | `onCommitToggle` (owned by `IngredientList`) | timeout callback fires `onCommitToggle` and resets `swipeOffset` in the same tick | WIRED | Unchanged; behaviorally confirmed by 01-UAT.md test 30. |
| `IngredientRow.tsx` (unmount-cleanup effect, lines 65-72) | `onCommitToggle` | ref-mirrored pending state flushed on unmount | WIRED | Unchanged; behaviorally confirmed by 01-UAT.md test 29 — this cycle's only newly-closed link. |
| `CategoryManager.tsx` | `useCategories.ts` (`useDeleteCategory`) | `DeleteCategoryError.ingredientCount` surfaced into the refusal Alert | WIRED | Unchanged. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| apps/barback unit tests (swipeVisuals) | `pnpm --filter barback test` | 1 file, 5/5 tests passing | PASS |
| apps/server unit/integration tests | `pnpm --filter server test` | 2 files, 30/30 tests passing | PASS |
| No source changes to WR-01/WR-02 files since prior verification | `git log --since="2026-08-10T18:15:00" -- IngredientRow.tsx swipeVisuals.ts` | empty output | PASS (confirms the closure came from new UAT evidence, not a silent code change) |
| 01-UAT.md tests 29/30 map to truth #15's named scenarios | Manual text comparison: test 29 expected/result vs. WR-02 wording; test 30 vs. WR-01 wording | 1:1 match on both | PASS |
| 01-UAT.md summary counts | frontmatter + `## Summary` block | `status: complete`, total 30, passed 30, issues 1 (historical, reconciled resolved), pending 0 | PASS |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INV-01 | 01-02 | Add an ingredient/bottle with name and category | SATISFIED | REQUIREMENTS.md `[x] Complete`; verified above. |
| INV-02 | 01-04 | Edit an existing ingredient's name/category | SATISFIED | REQUIREMENTS.md `[x] Complete`; verified above. |
| INV-03 | 01-03 (+01-06 gap closure) | Toggle an ingredient in-stock/out-of-stock | SATISFIED | REQUIREMENTS.md `[x] Complete`; primary mechanism and both regression-guard edge cases now fully verified above. |
| INV-04 | 01-05 | Search/filter inventory by name or category | SATISFIED | REQUIREMENTS.md `[x] Complete`; verified above. |
| INV-05 | 01-05 (+01-01 shell) | Mobile-first, usable one-handed | SATISFIED | REQUIREMENTS.md `[x] Complete`; verified above. |

No orphaned requirements — REQUIREMENTS.md's Phase 1 mapping (INV-01 through INV-05) matches the 5 IDs declared in this verification task and the ROADMAP's requirements line. Traceability table confirms all 5 as `Complete`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.gitignore` | 1-7 | Still no `.env`/`.env.*` pattern ahead of Phase 2's AI-key work (WR-04) | Info | Nothing at risk today (no `.env` file exists yet); should be added before Phase 2 introduces a key. Not a Phase 1 must-have. |
| `apps/server/src/index.ts` | — | Still no global Fastify `setErrorHandler` (WR-05) | Warning | Small blast radius on a LAN-only, no-auth app; worth closing before Phase 2 adds more write surface. Not a Phase 1 must-have. |
| `.planning/phases/01-barback-inventory-foundation/deferred-items.md` | — | Documented, still-open flaky-test issue: `pnpm --filter server test` occasionally races on WAL-mode pragma under parallel Vitest workers | Info | Non-blocking; re-confirmed passing (30/30) on this verification's own run; documented mitigation (lazy `db` connection) not yet applied. |
| `.planning/STATE.md` | 1-15 | Frontmatter may still lag actual completion state | Info | Documentation-tracking item, not a functional gap — does not affect shipped code or its verifiability. Recommend a state-sync pass before starting Phase 2. |

No debt markers (`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`) found in any file this phase touched. No placeholder copy, no empty stub handlers, no hardcoded-empty data flowing to rendered output.

## Human Verification Required

None. Both previously-open items (WR-01 commit-boundary flicker, WR-02 unmount-mid-grace-period commit) are now closed via 01-UAT.md tests 30 and 29 respectively, both passing.

## Gaps Summary

No gaps. All 5 primary roadmap Success Criteria and all 10 supplementary/gap-closure must-haves are VERIFIED, including the previously-open WR-01/WR-02 regression-guard edge case (truth #15), which is now closed by two newly-added, targeted UAT checkpoints (tests 29 and 30) that a human physically exercised on a real phone and both passed. No source code changed to produce this closure — only new test evidence was added, and independent re-confirmation this cycle (unit tests, `git log`, UAT frontmatter) supports the claim.

Four info/warning-level items are carried forward as non-blocking notes, none of which are Phase 1 must-haves: `.gitignore`'s missing `.env` pattern (WR-04, relevant ahead of Phase 2), the absent global Fastify error handler (WR-05, relevant ahead of Phase 2), a documented flaky-test mitigation not yet applied, and `.planning/STATE.md` possibly lagging actual completion state.

Phase 1 goal — "Owner can fully manage the bar's real inventory from their phone, with entries persisted to a live backend and reflected back immediately" — is achieved and fully verified.

---

_Verified: 2026-08-10T23:00:00Z_
_Verifier: Claude (gsd-verifier)_
