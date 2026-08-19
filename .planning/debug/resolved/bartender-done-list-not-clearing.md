---
status: resolved
trigger: "Bartender Orders tab: after the Content-Type fix (see resolved/bartender-done-button-no-effect.md), tapping Done now closes the detail view (navigates back to the Orders list) but the order still shows in the Orders list, and the tab badge counter still shows 1 open order instead of decrementing."
created: 2026-08-19
updated: 2026-08-19
resolution_note: "Orchestrator accepted the debugger's latency-injected live reproduction (CDP-throttled Playwright session, stale window scaling linearly with added round-trip latency, self-corrects once the round trip completes) as sufficient verification in place of a manual human tap-test on real hardware, matching the precedent set for the sibling bug (bartender-done-button-no-effect)."
---

## Symptoms

- **Expected behavior:** Tapping Done on an order marks it done server-side, the detail view closes back to the Orders list, and the order disappears from the visible Orders list (per OrdersTab's `visibleBatches` filter added in quick task 260818-uz8, which excludes `status === 'done'` batches), and the Orders tab badge count (in BottomTabBar/App.tsx) decrements to reflect the new open-order count.
- **Actual behavior:** The PATCH now appears to succeed (the previous silent-400 bug is fixed) — the detail view closes/navigates back as expected. But the order is STILL visible in the Orders list, and the tab badge still shows the old count (1), as if nothing changed server-side or the client never re-fetched the updated data.
- **Error messages:** None reported.
- **Timeline:** Surfaced immediately after the prior Content-Type fix (commit d658aab) was applied — this is either a second, previously-masked bug (the 400 error prevented anyone from ever observing what happens on a SUCCESSFUL Done call), or the visibleBatches filter / tab badge count computation has its own defect that was never exercised because Done always failed before.
- **Reproduction:** Bartender Orders tab → open an order → tap Done → detail view closes → look at Orders list (order still there) and tab badge (still shows old count).

## Eliminated

- hypothesis: "The Orders tab badge count in App.tsx/BottomTabBar computes from a different/stale data source than OrdersTab's own useOrders() call (two un-synced query instances, or a badge count captured once on mount)."
  evidence: "main.tsx creates exactly one QueryClient, passed into both initSocket() and <QueryClientProvider>. App.tsx computes openOrderCount inline at render from useOrders() — no useState/useEffect snapshot. Both App.tsx and OrdersTab.tsx call the identical useOrders() (queryKey ['orders']) against the one shared client, so they can never desync."
  timestamp: 2026-08-19

- hypothesis: "The GET /api/orders retention-window logic server-side has its own bug — returns the order but with a status field that doesn't match what visibleBatches/openOrderCount check against."
  evidence: "Direct curl verification: PATCH /orders/:id/done correctly flips status new/in_progress -> 'done' and returns it in the 200 response; the immediately-following GET /api/orders correctly reflects status: 'done' for that order. Server-side status handling is correct — D-60's 5-minute retention window is working as designed (done orders remain queryable server-side for bookkeeping; excluding them from the visible UI list is deliberately the CLIENT's job via visibleBatches, which is itself correct — see root cause)."
  timestamp: 2026-08-19

- hypothesis: "The reported symptom no longer reproduces at all — the trigger reflects a one-off stale-browser-tab observation from immediately after the prior Content-Type fix, not a persisting defect."
  evidence: "Initial live reproduction attempts (fresh Playwright/Chromium session, no artificial latency, both single-order and 2-order-batch scenarios) could NOT reproduce the symptom — list and badge updated in ~10-24ms. This looked like it might rule the bug out entirely, until CDP-injected 800ms latency reproduced the exact symptom (list+badge stuck for ~2s), proving the underlying mechanism is real and always present — just imperceptible at low latency. The 0-latency non-repro was a true negative under fast conditions, not evidence the bug doesn't exist under this app's actual target network conditions."
  timestamp: 2026-08-19

## Current Focus

reasoning_checkpoint:
  hypothesis: "OrdersTab.tsx's onMarkDone handler fires N async markDone.mutate(id) calls and then IMMEDIATELY (synchronously, same tick) calls setView('list') — the list view renders from the SAME rawOrders snapshot that existed before any PATCH resolved, because the ['orders'] query cache only updates later, after onSettled's invalidateQueries triggers a refetch that must complete a full network round trip (PATCH /done -> resolve -> invalidate -> GET /orders -> resolve -> re-render). App.tsx's openOrderCount badge reads the identical shared ['orders'] cache (same QueryClient singleton from main.tsx), so it is stale for exactly the same window. On localhost this window is ~10-20ms (imperceptible), but this app's actual target hardware/network (Raspberry Pi server + iPad/phone over home WiFi, per CLAUDE.md's explicit 'kiosk iPads sleep, lock, and hop wifi' rationale) can plausibly add hundreds of ms to low seconds of round-trip latency, stretching that same stale window into something a user perceives as permanently stuck rather than a transient flash."
  confirming_evidence:
    - "Live reproduction against the real dev stack (server:3000, bartender vite:5175) via Playwright/CDP with Network.emulateNetworkConditions(latency: 800ms): tapped Done on a real order card, then sampled the rendered DOM at t=0/100/300/600/1000/2000/4000ms. The order ('Old Fashioned') and its badge count ('1') remained visibly present/unchanged through t=1022ms, and only updated to 'No orders yet' / no badge at t=2027ms — directly reproducing the reported symptom's mechanism (both list AND badge stuck simultaneously) under realistic added latency."
    - "The identical flow with ZERO artificial latency (localhost, no throttling) showed the stale render for only ~10-24ms (t=9ms still showed the order, t=24ms already showed 'No orders yet') — confirming the SAME code path is exercised regardless of latency; latency only controls how long the pre-existing stale window is visible, it does not change whether the window exists."
    - "Server-side logic verified correct via direct curl: PATCH /orders/:id/done unconditionally flips status new/in_progress -> done and returns 200 with the updated order; GET /api/orders correctly reflects status: 'done' immediately after. Ruled out hypothesis (c) — no server-side status/shape defect."
    - "main.tsx creates exactly one QueryClient, passed into both initSocket() and <QueryClientProvider>; App.tsx and OrdersTab.tsx both call the same useOrders() (queryKey: ['orders']) against that one shared client — ruled out hypothesis (b), no separate/desynced data source for the badge."
    - "Read useMarkOrderDone.ts and useOpenOrder.ts in full: neither has an onMutate handler — onSettled is the ONLY point at which the cache is touched, and it only invalidates (triggers a refetch), it never optimistically patches local state. This is the mechanism gap: nothing updates the cache between mutate() firing and the eventual refetch resolving."
  falsification_test: "If this hypothesis were wrong, throttling network latency would NOT change how long the list/badge stay stale (it would either always be instant regardless of latency, or always stuck regardless of latency). It is neither — the stale window scales directly with added round-trip latency (10-24ms at 0ms latency vs 1000-2000ms at 800ms latency), which is exactly what 'no optimistic update, pure refetch-driven UI' predicts and what an unrelated bug (e.g. a genuinely broken invalidation) would NOT predict (a genuinely broken invalidation would stay stuck forever regardless of latency, which is not what was observed — it always self-corrected once the round trip completed)."
  fix_rationale: "Add an onMutate optimistic update to useMarkOrderDone: synchronously patch the ['orders'] query cache to set the target order's status to 'done' at the moment mutate() is called (with onError rollback via the previous-data snapshot, and onSettled still invalidating to reconcile with server truth). This makes OrdersTab's visibleBatches filter (status !== 'done') and App.tsx's openOrderCount filter (status in new/in_progress) both correct on the VERY NEXT render, independent of network round-trip time — closing the root-cause gap directly (no code path is left relying on an unbounded network round trip to reflect the user's own just-completed action) rather than working around the symptom (e.g. an artificial minimum delay before navigating back, which doesn't fix slow/degraded networks, or a toast/spinner, which doesn't fix the actual stale badge count)."
  blind_spots: "useOpenOrder.ts (PATCH /start) has the identical architecture (no onMutate, refetch-only) and would exhibit the same transient-staleness mechanism on the 'new'->'in_progress' transition, but that isn't part of the reported symptom (a still-open order staying visible after Start is not incorrect — it should stay visible) and the badge count doesn't change on Start either, so it's out of scope for THIS fix per minimal-fix principle. Not independently verified on real iPad Safari hardware/actual home WiFi (only simulated via CDP latency injection against a headless Chromium) — the mechanism and its direct network-latency correlation are proven, but the EXACT real-world duration on the actual Pi+iPad setup is inferred, not measured."
  candidate_causes:
    - "code: useMarkOrderDone.ts has no onMutate optimistic cache update — the ['orders'] cache only changes after a full PATCH+invalidate+refetch round trip resolves, and OrdersTab.tsx navigates back to the list synchronously before that round trip completes"
    - "environment: this app's target deployment (Raspberry Pi server reached over home WiFi by kiosk iPads/phones that sleep/lock/roam) has meaningfully higher and more variable round-trip latency than the localhost dev loop the code was originally exercised against, which is what stretches the code's always-present-but-normally-imperceptible stale window into a user-visible 'stuck' bug"
  and_gate: "no — a single code defect (missing optimistic update, relying entirely on refetch-after-round-trip to update shared UI state) is fully sufficient to explain and reproduce the symptom; environment latency is an amplifier that controls how VISIBLE the pre-existing defect is, not a second independently-necessary contributing cause. The same code path runs identically at 0ms and 800ms latency — only the perceptibility differs."

hypothesis: CONFIRMED — see reasoning_checkpoint above.
test: N/A — confirmed via live-server + Playwright/CDP-throttled reproduction (see confirming_evidence).
expecting: N/A
next_action: "Implement the onMutate/onError optimistic-update fix in useMarkOrderDone.ts, then re-run src/api/useMarkOrderDone.test.tsx to confirm GREEN, then run the full bartender suite and the fix-acceptance guardrail."

tdd_checkpoint:
  test_file: "apps/bartender/src/api/useMarkOrderDone.test.tsx"
  test_name: "optimistically marks the target order done in the ['orders'] cache immediately on mutate(), before the network request resolves"
  status: "red"
  failure_output: |
    FAIL  src/api/useMarkOrderDone.test.tsx > useMarkOrderDone > optimistically marks the target order done in the ['orders'] cache immediately on mutate(), before the network request resolves
    AssertionError: expected 'new' to be 'done' // Object.is equality
    Expected: "done"
    Received: "new"
     ❯ timeout src/api/useMarkOrderDone.test.tsx:66:60
    (test seeds ['orders'] cache with o1/o2 both 'new', calls mutate('o1') with fetch deliberately left unresolved, then asserts o1 flips to 'done' in the cache within 300ms — fails because useMarkOrderDone currently has no onMutate handler, so nothing touches the cache until the network round trip completes)

## Evidence

- timestamp: 2026-08-19
  checked: "Read apps/bartender/src/components/OrdersTab.tsx, App.tsx, BottomTabBar.tsx, api/useMarkOrderDone.ts, api/useOpenOrder.ts, api/useOrders.ts, api/socket.ts, main.tsx, and apps/server/src/routes/orders.ts in full."
  found: "All wiring is logically consistent: single shared QueryClient (main.tsx), same queryKey ['orders'] everywhere, server correctly flips status to 'done' and returns it, GET /api/orders correctly includes it (D-60 retention) with the true status, OrdersTab's visibleBatches correctly filters status!=='done', App.tsx's openOrderCount correctly filters to new/in_progress. No wiring defect, no separate/stale data source, no server-side status bug."
  implication: "Ruled out hypotheses (b) desynced badge data source and (c) server-side retention/status bug. The remaining candidate is timing: the cache only reflects the change after onSettled's invalidateQueries completes a full round trip, and OrdersTab navigates back to the list before that round trip resolves."

- timestamp: 2026-08-19
  checked: "Live reproduction against the real running dev stack (apps/server on :3000, bartender Vite on :5175) via a Playwright script: created a real order via POST /api/orders, drove the actual browser UI (click order card -> detail view -> tap Done), with NO artificial network throttling."
  found: "List and badge correctly updated to empty/0 essentially instantly (~10-24ms after the click, confirmed by sampling the DOM at t=9ms — still showed the order — vs t=24ms — already 'No orders yet'). Repeated with a batch of 2 orders for the same recipe: same correct, near-instant result."
  implication: "Could NOT reproduce the reported symptom under fast/localhost conditions — the underlying mechanism exists (there IS a brief window of stale render between click and refetch completing) but is normally imperceptible. This directed the investigation toward network latency as the variable that turns an always-present-but-tiny window into a user-visible bug."

- timestamp: 2026-08-19
  checked: "Same live reproduction, this time using a Chrome DevTools Protocol session (Network.emulateNetworkConditions) to inject 800ms of added latency per request — approximating realistic home-WiFi-to-Raspberry-Pi conditions per this project's own target deployment. Sampled the rendered DOM at t=0/100/300/600/1000/2000/4000/6000ms after tapping Done."
  found: "The order card and the '1' badge remained visibly present/unchanged through t=1022ms, only updating to 'No orders yet' / no badge at t=2027ms (matching two sequential 800ms-latency round trips: PATCH /done, then the invalidated GET /orders refetch). It DID eventually self-correct (not permanently broken) but stayed visibly stale for roughly 2 seconds — long enough to read as 'Done did nothing' to a user glancing at the screen right after tapping it."
  implication: "Confirms the root-cause mechanism directly: the list/badge staleness window scales linearly with round-trip latency because nothing updates the shared ['orders'] cache between mutate() firing and the eventual refetch resolving. This matches the reported symptom's mechanism precisely and explains why it was never caught locally (dev-loop latency is too low to notice) — see reasoning_checkpoint above for the confirmed hypothesis."

- timestamp: 2026-08-19
  checked: "Wrote a failing (RED) regression test in useMarkOrderDone.test.tsx (seeds the ['orders'] cache, calls mutate('o1') with fetch deliberately left unresolved, asserts o1 flips to 'done' in the cache within 300ms). Ran it against pre-fix code."
  found: "FAILED as expected: `expected 'new' to be 'done'` — the cache never touches o1's status while the network call is pending, confirming no onMutate handler exists."
  implication: "RED phase confirmed per tdd_mode contract — proceeding to implement the fix."

- timestamp: 2026-08-19
  checked: "Implemented onMutate (optimistic setQueryData) + onError (rollback via previousOrders snapshot) in useMarkOrderDone.ts, keeping onSettled's invalidateQueries unchanged. Re-ran the new regression test, then the full bartender suite, then TypeScript compilation."
  found: "New regression test: 3/3 pass (GREEN). Full bartender suite: 77/77 tests, 11 files pass. `tsc --noEmit`: zero errors."
  implication: "Fix is unit-verified and introduces no regressions in the existing suite or type system."

- timestamp: 2026-08-19
  checked: "Re-ran the exact 800ms-CDP-throttled live reproduction (single order, then a batch of 2 orders) against the fixed code, sampling the DOM at t=0/100/300/600/1000/2000/4000/6000ms after tapping Done, then cross-checked real server state via GET /api/orders."
  found: "Both the single-order and batch-of-2 cases now show 'No orders yet' at t=3-5ms (down from ~2000ms pre-fix) — the list is correct on the very next render regardless of the still-in-flight 800ms-latency network round trip. (The badge's digit lingers ~200-300ms longer purely due to antd Badge's own built-in fade-out CSS transition on count changing to 0 — a cosmetic animation, not stale data; the underlying openOrderCount prop is already 0 on the same render as the list update.) GET /api/orders afterward confirms the real server-side status is 'done' for every order in both runs — the optimistic update is not masking a failure, it's correctly predicting a real success that the invalidateQueries in onSettled subsequently reconciles."
  implication: "Fix verified end-to-end against the live dev stack under the same artificial-latency conditions that reproduced the original bug, not just at the unit-test level."

- timestamp: 2026-08-19
  checked: "Fix-acceptance guardrail: (1) target test — src/api/useMarkOrderDone.test.tsx 3/3 pass. (2) mutation check — no Stryker config anywhere in the repo (searched for *stryker* files and package.json deps) — skipped. (3) no-op/deletion detector — git diff of useMarkOrderDone.ts is purely additive (onMutate + onError blocks added, onSettled untouched, comment expanded) — no deletions. (4) adjacent tests — full @my-bar/bartender suite (77 tests/11 files, includes OrdersTab.test.tsx which exercises useMarkOrderDone's call site) passes. (5) revert-and-reconfirm — `git stash push -- useMarkOrderDone.ts` then re-ran the regression test: FAILED identically to the original RED (`expected 'new' to be 'done'`), confirming the bug returns without the fix; `git stash pop` restored the fix, re-ran: 3/3 GREEN again."
  found: "All 5 signals pass (2 skipped-and-logged, not silently passed)."
  implication: "guardrail_verdict: accepted. Ready for human verification of the real browser Done-tap flow before archiving."

## Resolution

root_cause: "useMarkOrderDone.ts had no onMutate optimistic update — the ['orders'] TanStack Query cache (read by both OrdersTab's visibleBatches list filter and App.tsx's openOrderCount badge, via the single shared QueryClient from main.tsx) only reflected a Done tap after a FULL network round trip completed (PATCH /done resolves -> onSettled invalidates -> GET /orders refetches -> resolves -> re-render). OrdersTab.tsx's onMarkDone handler fires the mutate() calls and then immediately (same tick, before any of them can possibly resolve) navigates back to the list view, so the list is guaranteed to render at least one frame of pre-Done data. On localhost this window is ~10-24ms and imperceptible, which is why no unit test (mocked fetch, resolves as an immediate microtask) or an unthrottled live-browser check ever caught it. This app's actual target deployment — a Raspberry Pi server reached over home WiFi by kiosk iPads/phones that sleep, lock, and roam WiFi (per this project's own CLAUDE.md rationale) — has meaningfully higher and more variable round-trip latency than the dev loop, which stretches that same always-present window into something that reads as 'Done did nothing' rather than a transient flash. Confirmed directly: reproducing the tap-Done flow against the real dev stack with 800ms of CDP-injected latency reproduced the exact symptom (list and badge both stuck for ~2 seconds), while the identical flow at 0ms latency only showed a ~10-24ms flash — the staleness window scales linearly with latency exactly as this mechanism predicts."
fix: "Added an onMutate handler to useMarkOrderDone (apps/bartender/src/api/useMarkOrderDone.ts) that synchronously, at the moment mutate(orderId) is called: cancels any in-flight ['orders'] queries, snapshots the previous cache value, and optimistically patches the target order's status to 'done' in the ['orders'] cache. Added a matching onError handler that rolls back to the snapshotted previous value if the PATCH actually fails. onSettled (unchanged) still invalidates ['orders'] afterward to reconcile with server truth. This makes OrdersTab's visibleBatches filter and App.tsx's openOrderCount filter both correct on the very next render, independent of network round-trip time, while preserving the existing 'REST is truth, refetch reconciles' architecture (the optimistic guess is always double-checked against the server via the unchanged onSettled invalidation)."
verification: |
  target_test:        { result: pass, test: "apps/bartender/src/api/useMarkOrderDone.test.tsx > optimistically marks the target order done in the ['orders'] cache immediately on mutate(), before the network request resolves" }
  mutation_check:     { result: skipped, reason_if_skipped: "no Stryker config found anywhere in the repo (searched for *stryker* files and package.json deps)", mutant_killed: null }
  no_op_deletion:     { result: pass, deletion_justified_by_rca: n/a — diff is purely additive (onMutate + onError added, onSettled unchanged), not deletion-only }
  adjacent_tests:     { result: pass, suites_run: ["full @my-bar/bartender vitest suite — 11 files, 77 tests, includes OrdersTab.test.tsx (useMarkOrderDone's real call site) and every other consumer in the import graph"] }
  revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true }
  live_integration_check: "Extra signal beyond the guardrail minimum: re-ran the same 800ms-CDP-throttled Playwright reproduction that originally confirmed the root cause, against the fixed code — list correctly shows 'No orders yet' at t=3-5ms post-tap (vs ~2000ms pre-fix) for both a single order and a batch of 2, with GET /api/orders confirming real server-side status is 'done' in both cases (optimistic update is not masking a failure)."
  guardrail_verdict:  accepted
files_changed:
  - apps/bartender/src/api/useMarkOrderDone.ts (fix — onMutate optimistic update + onError rollback)
  - apps/bartender/src/api/useMarkOrderDone.test.tsx (new — regression test, RED before fix / GREEN after)
</content>
