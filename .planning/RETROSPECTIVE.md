# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-08-19
**Phases:** 5 (4 planned + 1 inserted urgent) | **Plans:** 31 | **Tasks:** 69

### What Was Built
- Barback: full mobile-first inventory management (add/edit/toggle-stock/search/filter bottles and categories) with a swipe-to-toggle gesture and deferred-commit undo
- Recipe collection and a server-side tri-state (green/yellow/red) makeable engine, with per-line specific-ingredient locking distinct from category-level substitution
- A full Barback navigation rebuild (Phase 2.1, inserted mid-milestone): bottom tab bar, full-screen add/edit/detail flows, and a single autocomplete-with-inline-create picker pattern replacing static dropdowns everywhere
- Patron browse experience matching the dark-neon reference design, with live Socket.IO sync so inventory changes propagate without refresh
- Bartender console: recipe lookup, live order queue with new → in progress → done lifecycle, batching, and elapsed-time tickets
- Cross-screen order flow: Patron submits an order (with optional "who's this for"), it appears live in Bartender's queue, and status changes propagate both directions
- Patron kiosk lockdown: fullscreen, wake-lock, and inactivity timeout back to the browse grid

### What Worked
- Vertical-slice phasing (pairing a backend capability with the UI that exposes it, e.g. Phase 2's recipe CRUD + makeable engine together) meant every phase produced something immediately demonstrable rather than a backend-only or UI-only phase
- The debug-session workflow (find_root_cause_only mode) cleanly separated root-causing from fixing — both Phase 2 UAT bugs (recipe save 400, stale makeable badge) were root-caused with high-confidence evidence chains, then closed by dedicated gap-closure plans (02-07, 02-08) in the same phase
- Established cross-entity TanStack Query invalidation pattern (a mutation that changes data another query key derives from must invalidate both keys) was consistently applied once discovered, and audit at milestone close confirmed it held even for the one historical outlier (useToggleStock)
- Decimal phase insertion (Phase 2.1) cleanly absorbed a scope change (recipe UI navigation rebuild) without disrupting phase numbering or requiring a rewrite of the roadmap

### What Was Inefficient
- Two debug sessions (recipe-save-fails-connection, stale-makeable-badge) were root-caused and fixed via later plans, but their debug session files were never updated to `status: resolved` — this created false "open work" signal at milestone close that required manual verification against git history to clear
- A known flaky-test race condition (WAL lock contention between parallel Vitest workers sharing the production db file's module-level pragma call) was correctly identified and deferred in Phase 01 but never revisited before v1.0 shipped — low-risk since it doesn't affect correctness, but is exactly the kind of test-infra debt that compounds if untouched into v1.1

### Patterns Established
- Full-screen views with a back action (not modals) for all add/edit/detail flows across every interface — established in Phase 2.1, should be the default going forward rather than reintroducing modals for new flows
- Single autocomplete-with-inline-create field pattern for any picker (category, glassware, ingredient, tag) — replaces static `<Select>` dropdowns project-wide
- Server-side makeable/status computation is the sole source of truth everywhere — no screen independently recomputes it, and order submission re-validates server-side rather than trusting client-cached state

### Key Lessons
1. When a debug session's root cause gets fixed by a later plan (not the debugging session itself), explicitly go back and mark the debug file `status: resolved` with the fixing commit — otherwise it surfaces as false open work at the next milestone-close audit.
2. Deferred tech debt with a clear "why it's safe to defer" note (like the WAL-lock race) is fine to carry across a milestone boundary, but should get an explicit decision (fix now vs. carry again) at each milestone close rather than silently rolling forward.
3. Decimal phase insertion is a good tool for absorbing urgent scope changes mid-milestone without roadmap churn — worth using again if v1.1 surfaces a similar "this needs to happen now, out of sequence" need.

### Cost Observations
- Sessions: multiple sessions across 2026-08-09 to 2026-08-19 (10 days)
- Notable: 338 commits, ~15,900 LOC TypeScript, 359 files touched in the milestone's full diff — high plan-to-commit density suggests the TDD RED/GREEN-per-task convention (seen throughout SUMMARY.md decisions) kept changes well-scoped

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | multiple | 5 (4 + 1 inserted) | Initial milestone — vertical-slice phasing, decimal phase insertion, TDD RED/GREEN task convention established |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 333+ (per Phase 4 verification) | not separately tracked | — |

### Top Lessons (Verified Across Milestones)

1. Mark debug sessions `resolved` the moment their root cause is actually fixed, even if the fix lands in a different plan than the one that diagnosed it.
