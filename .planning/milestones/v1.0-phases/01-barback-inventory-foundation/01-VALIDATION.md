---
phase: 01
slug: barback-inventory-foundation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-09
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (backend + shared package); no frontend component test framework selected yet for Phase 1 |
| **Config file** | none yet — see Wave 0 Requirements |
| **Quick run command** | `pnpm --filter server test` |
| **Full suite command** | `pnpm -r test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter server test`
- **After every plan wave:** Run `pnpm -r test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-TBD | 01 | 1 | INV-01 | — | POST /api/ingredients creates a row with name+category, defaults in_stock=true | integration | `pnpm --filter server test -- ingredients.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-TBD | 01 | 1 | INV-02 | — | PATCH /api/ingredients/:id updates name/category | integration | `pnpm --filter server test -- ingredients.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-TBD | 01 | 1 | INV-03 | — | PATCH /api/ingredients/:id/stock toggles in_stock | integration | `pnpm --filter server test -- ingredients.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-TBD | 01 | 1 | INV-04 | — | GET /api/ingredients returns full list for client-side filtering | integration | `pnpm --filter server test -- ingredients.test.ts` | ❌ W0 | ⬜ pending |
| 01-01-TBD | 01 | 1 | D-03 | — | Category delete blocked when referenced by ingredients (RESTRICT) | integration | `pnpm --filter server test -- categories.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*Task IDs are placeholders — the planner assigns final task IDs; this map should be reconciled against PLAN.md task IDs during planning.*

---

## Wave 0 Requirements

- [ ] `apps/server/vitest.config.ts` — Vitest config for the server package
- [ ] `apps/server/src/routes/ingredients.test.ts` — covers INV-01, INV-02, INV-03, INV-04
- [ ] `apps/server/src/routes/categories.test.ts` — covers D-03's RESTRICT-on-delete behavior
- [ ] `apps/server/src/db/test-helpers.ts` — in-memory or temp-file SQLite fixture (fresh DB per test file), avoiding shared mutable state across tests
- [ ] Framework install: `pnpm add -D vitest light-my-request` in `apps/server`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Mobile-first responsive layout, comfortably usable one-handed | INV-05 | Visual/UAT check — not meaningfully unit-testable | Load the Barback inventory screen on an actual phone viewport (or iPad Safari + phone browser per project constraints) and confirm one-handed usability of add/edit/toggle/search |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
