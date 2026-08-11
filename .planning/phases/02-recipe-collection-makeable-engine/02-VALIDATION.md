---
phase: 02
slug: recipe-collection-makeable-engine
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-10
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (same as Phase 1) |
| **Config file** | apps/server/vitest.config.ts (inherited) |
| **Quick run command** | `pnpm -F @my-bar/server test` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm -F @my-bar/server test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | RECIPE-01 | V5 | Zod schema rejects unbounded name/method/garnish input | unit | `pnpm -F @my-bar/server test -- recipes.test.ts -t "POST.*creates"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 0 | RECIPE-02 | V8 | PATCH/DELETE translate SQLite errors to fixed 400/409 | unit | `pnpm -F @my-bar/server test -- recipes.test.ts -t "PATCH\|DELETE"` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 0 | MATCH-01 | — | computeMakeable returns true when all categories in stock | unit | `pnpm -F @my-bar/server test -- makeableEngine.test.ts -t "makeable.*true"` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 0 | MATCH-02 | — | GET /recipes includes missingCategoryIds array | unit | `pnpm -F @my-bar/server test -- recipes.test.ts -t "missing"` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 0 | MATCH-03 | V5 | Ingredient references validated categoryId (UUID) | unit | `pnpm -F @my-bar/server test -- makeableEngine.test.ts -t "category"` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 0 | MATCH-04 | — | Unit/quantity stored but ignored by makeable check | unit | `pnpm -F @my-bar/server test -- makeableEngine.test.ts -t "unit\|quantity"` | ❌ W0 | ⬜ pending |

*Task IDs are provisional — the planner assigns final IDs; this map is the requirement→test contract, not a literal task list.*

---

## Wave 0 Requirements

- [ ] `apps/server/src/services/makeableEngine.test.ts` — unit tests for `computeMakeable()`: all-categories-in-stock, one-category-missing, multiple-categories-missing, empty-recipe (zero ingredients)
- [ ] `apps/server/src/routes/recipes.test.ts` — route + integration tests: create, read, update, delete recipes; verify makeable computed in response; verify ingredient/method order preserved
- [ ] `apps/server/src/routes/glassware.test.ts` — route tests: CRUD glassware, delete-guard refusal with accurate count
- [ ] `apps/server/src/routes/categories.test.ts` — regression test: DELETE /categories now counts recipes in addition to ingredients
- [ ] Barback UI integration tests (vitest + React Testing Library): RecipeForm submits correct shape, IngredientListForm adds/removes lines, MethodStepList preserves order, GlasswareManager delete-guard shows refusal message
- [ ] Framework install: none — reuse Phase 1 vitest + @testing-library/react

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
