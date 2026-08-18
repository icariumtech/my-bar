---
phase: 4
slug: bartender-console-order-workflow
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-18
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + @testing-library/react (matches Phase 3 Patron + Phase 2.1 Barback) |
| **Config file** | `apps/bartender/vitest.config.ts` (mirrors apps/barback; created in Wave 0 since apps/bartender doesn't exist yet) |
| **Quick run command** | `pnpm -F @my-bar/bartender test` (or `pnpm -F @my-bar/server test` / `pnpm -F @my-bar/patron test` depending on affected module) |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run the quick command for the affected module (server/patron/bartender)
- **After every plan wave:** Run `pnpm test` (full monorepo suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-XX | TBD | 0 | PATR-05 | V5 | Zod validates `recipeId`/`patronName` on POST /api/orders | unit | `pnpm -F @my-bar/server test routes/orders.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | PATR-05 | — | Order button visible only when recipe makeable | unit | `pnpm -F @my-bar/patron test components/RecipeDetail.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | PATR-05 | — | useSubmitOrder handles success/error | unit | `pnpm -F @my-bar/patron test api/useSubmitOrder.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | PATR-07 | — | Fullscreen requested on mount; degrades gracefully if denied | unit | `pnpm -F @my-bar/patron test hooks/useFullscreen.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | PATR-08 | — | Inactivity timer resets on touch/mouse/key events | unit | `pnpm -F @my-bar/patron test hooks/useKioskInactivity.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | PATR-08 | — | onTimeout fires after idle threshold | unit | `pnpm -F @my-bar/patron test hooks/useKioskInactivity.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | BART-01 | — | GET /api/recipes returns full detail incl. tri-state makeable | integration | `pnpm -F @my-bar/server test routes/recipes.test.ts` | ✅ | ⬜ pending |
| 04-XX | TBD | 0 | BART-02 | T-4-01 | POST /api/orders emits Socket.IO `orders:created` | integration | `pnpm -F @my-bar/server test routes/orders.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | BART-03 | — | PATCH /api/orders/:id/done advances status new/in_progress → done | unit | `pnpm -F @my-bar/server test routes/orders.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | BART-04 | — | GET /api/orders returns server-computed elapsedSeconds | unit | `pnpm -F @my-bar/server test routes/orders.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | BART-05 | — | Recipe search/filter opens tag picker + name search | unit | `pnpm -F @my-bar/bartender test components/RecipeSearchFilter.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | BART-06 | — | Bartender shows full tri-state makeable (not Patron 2-state) | unit | `pnpm -F @my-bar/bartender test components/RecipeDetail.test.ts` | ❌ W0 | ⬜ pending |
| 04-XX | TBD | 0 | SYNC-02 | — | `orders:created`/`orders:updated` triggers `['orders']` query invalidation | integration | `pnpm -F @my-bar/bartender test api/socket.test.ts` | ❌ W0 | ⬜ pending |

*Task IDs and wave numbers are TBD — the planner fills these in as PLAN.md tasks are authored; this table's rows are the requirement→test contract each task must satisfy.*

---

## Wave 0 Requirements

- [ ] `apps/server/src/routes/orders.test.ts` — order submission (POST), mark-done (PATCH), list (GET), Socket.IO emission
- [ ] `apps/patron/src/hooks/useKioskInactivity.test.ts` — timer reset on events, callback on timeout
- [ ] `apps/patron/src/hooks/useFullscreen.test.ts` — requestFullscreen success/failure handling
- [ ] `apps/bartender/src/components/RecipeSearchFilter.test.ts` — tag picker interaction, name search filtering
- [ ] `apps/bartender/src/components/OrdersTab.test.ts` — batching logic, elapsed-time formatting
- [ ] `apps/bartender/src/api/socket.test.ts` — `orders:created`/`orders:updated` handlers call `queryClient.invalidateQueries`
- [ ] `apps/bartender/vitest.config.ts` — new app has no test framework yet; mirror `apps/barback/vitest.config.ts`

*Existing infrastructure covering the rest:* Phase 3 Patron RecipeDetail/RecipeCard/tag-rail tests, Phase 2.1 Barback tab-bar tests, Phase 2 `/api/recipes` tests (orders route follows the same pattern).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fullscreen + wake-lock behavior on real iPad Safari | PATR-07 | Fullscreen/wake-lock APIs behave differently in real Safari vs. jsdom/simulators (A1, A2, A3, A4 in RESEARCH.md) | Load Patron on the physical iPad, confirm browser chrome hides and screen doesn't sleep during idle periods |
| Fullscreen chrome-hiding on Echo Show 8 / LineageOS Chrome | BART-01..06 | Android WebView/Chrome fullscreen chrome-hiding behavior needs a real 8" device (A5) | Load Bartender on the physical Echo Show 8, confirm layout is usable and address bar hides in fullscreen |
| End-to-end live sync: Patron submits → Bartender queue updates without refresh | BART-02, SYNC-02 | Requires two real devices on the same LAN exercising the full Socket.IO path | Submit an order from Patron device, observe Bartender Orders tab update within ~1s without manual refresh |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
