---
status: resolved
resolution_note: "User confirmed fixed after a hard refresh on the real device."
trigger: "Bartender Orders tab: Done button still not working, per the user, after two prior fixes were shipped: (1) bartender-done-button-no-effect (commit d658aab) — fixed apiFetch sending Content-Type on bodyless requests, which caused a silent 400. (2) bartender-done-list-not-clearing (commit 055f3eb) — added an optimistic cache update to useMarkOrderDone so the list/badge update immediately instead of waiting on a network round trip. User's exact words: 'still not working' — no further detail on what specifically is still broken (silent failure again? list still stale? something else entirely? stale browser cache/dev server not picking up the fix?)."
created: 2026-08-19
updated: 2026-08-19
---

## Symptoms

- **Expected behavior:** Tapping Done on an order in the Bartender Orders tab should: PATCH the order to done server-side, close the detail view back to the list, remove the order from the visible Orders list immediately, and decrement the tab badge count immediately.
- **Actual behavior:** Unknown/unconfirmed — user only said "still not working" with no further detail after being told the fix was applied and committed. Do NOT assume it's the same two root causes recurring; both were verified fixed via live reproduction (curl + Playwright + latency injection) before being reported to the user.
- **Error messages:** None reported yet.
- **Timeline:** Reported immediately after being told fix #2 (055f3eb) was complete.
- **Reproduction:** Unknown exact repro — start by reproducing the CURRENT real behavior live (server + bartender dev servers running, actual browser/Playwright session, actual Done tap) rather than assuming which of the two previously-fixed mechanisms is at fault.

## Evidence

- timestamp: 2026-08-19T17:00Z (approx, session start)
  checked: `ps aux` for running dev processes and `ss -ltnp` for listening ports
  found: Current `pnpm dev` concurrently session (started 12:19) has the live server bound to :3000 (pid 296409, tsx watch — picks up source changes live) and bartender Vite dev server bound to 127.0.0.1:5175/5173 range (localhost only, no LAN host binding). Some older orphaned `tsx watch` processes exist (pids 285648, 288999) but do not hold the listening port.
  implication: The live dev-server API (port 3000) is running current source. The Vite dev server is NOT reachable from a real LAN device (iPad/phone) since it has no `host` override — rules out "browser hitting Vite dev server with cached old JS" and points at the static-served production build instead.

- timestamp: 2026-08-19T17:23Z
  checked: `curl -X PATCH http://localhost:3000/api/orders/<id>/done` (no Content-Type, no body — mirrors current apiFetch behavior) then `GET /api/orders`
  found: 200 OK, order status transitions to `done` correctly, order still appears in GET /orders (5-min retention window working as designed).
  implication: Server-side `/done` route and API logic are fully correct. The bug is not server-side.

- timestamp: 2026-08-19T17:25Z
  checked: `apps/bartender/dist/` mtime vs. fix commit timestamps
  found: `dist/assets/index-CAe4R1W7.js` last built 2026-08-18 22:29:16. Fix commit d658aab landed 2026-08-19 10:28:56; fix commit 055f3eb landed 2026-08-19 11:46:46. The build predates BOTH fixes by 12+ hours.
  implication: Strong candidate — the static bundle actually served to real devices under `/bartender/` was never rebuilt after either fix.

- timestamp: 2026-08-19T17:26Z
  checked: grepped `apps/bartender/dist/assets/index-CAe4R1W7.js` for fix markers (`Content-Type` header construction, `previousOrders` literal)
  found: Bundle contains the OLD unconditional `Content-Type":\`application/json\`}` pattern (exact pre-fix bug) and has ZERO occurrences of `previousOrders` (marker unique to the optimistic-update fix). Confirms the served bundle has NEITHER fix.
  implication: Direct, unambiguous confirmation — real devices loading `/bartender/` are running pre-fix code for both previously "shipped" bugs. This is the root cause.

- timestamp: 2026-08-19T17:27Z
  checked: `apps/server/src/index.ts` static file registration and `apps/bartender/vite.config.ts`
  found: `/bartender/` prefix is served directly from `apps/bartender/dist` (fastify-static), a separately-built artifact independent of the Vite dev server. Vite dev server has no `server.host` override (defaults to localhost-only).
  implication: Confirms `/bartender/` static build is the only path a real LAN device (iPad/phone) can reach — matching the project's kiosk/LAN architecture. This is exactly what the user's real device loads.

- timestamp: 2026-08-19T17:28Z
  checked: `pnpm --filter bartender test -- --run`
  found: 11 test files, 77/77 tests passing.
  implication: Both source-level fixes are correctly implemented and covered; the gap is purely deploy/build staleness, not a code regression.

## Current Focus

bug_class: Bohrbug (deterministic — the stale bundle deterministically lacks both fixes on every request; not timing/order-dependent)

reasoning_checkpoint:
  hypothesis: "The Bartender Done button reads 'still not working' because the static /bartender/ bundle the Fastify server actually serves (apps/bartender/dist) predates BOTH prior fix commits (d658aab, 055f3eb) — a real device loads pre-fix JS, not because either fix is broken in source."
  confirming_evidence:
    - "dist/assets/*.js mtime = 2026-08-18 22:29:16, older than both fix commits (2026-08-19 10:28:56 and 11:46:46) and older than the fixed source files themselves (client.ts 10:22:48, useMarkOrderDone.ts 11:43:37)."
    - "Direct grep of the served bundle shows the OLD unconditional `Content-Type` header pattern (the exact pre-fix bug from d658aab) and ZERO occurrences of `previousOrders` (the marker unique to 055f3eb's optimistic-update fix) — the served bundle contains neither fix."
    - "curl PATCH /api/orders/:id/done against the live server (same server serving the stale bundle) returns 200 and transitions status to done correctly — server-side logic is correct, isolating the gap to the client bundle only."
    - "apps/bartender vite.config.ts has no `server.host` override, so the Vite dev server (5173) defaults to localhost-only and is unreachable from a real LAN iPad/phone — the /bartender/ static build is the ONLY path a real kiosk device can use, per this project's documented LAN/kiosk architecture."
  falsification_test: "If the user's real device somehow reaches the Vite dev server instead of the static build, rebuilding changes nothing they see. Also falsified if, after rebuild + hard refresh, they report a different failure."
  fix_rationale: "No further source change needed — both fixes are correct and unit-tested (77/77 passing). The fix is rebuilding apps/bartender so dist reflects the already-correct, already-committed source."
  blind_spots: "No browser automation available in this session (Playwright not installed) to directly observe the real device. Have not ruled out Safari/iOS HTTP caching holding the old bundle even after rebuild — flagged for the human verification checkpoint (ask for hard refresh / cache clear)."
  candidate_causes:
    - "code: none found — both source fixes are correct and covered by passing tests"
    - "environment/deployment: apps/bartender/dist build artifact predates both fix commits, so the artifact served under /bartender/ never picked up either fix"
  and_gate: "no — stale build artifact alone fully explains the symptom; no second simultaneous condition required (device-side HTTP caching is a secondary risk, not a required co-cause)."

hypothesis: CONFIRMED — build/deploy staleness, not a code defect. See reasoning_checkpoint above.
test: Rebuild apps/bartender, reconfirm bundle contains both fix markers, run adjacent test suites, request human verification with explicit hard-refresh instruction.
expecting: Rebuilt bundle contains both fixes; user confirms Done works on real device after hard refresh.
next_action: implement fix (rebuild apps/bartender) per fix_and_verify, guarded by a permanent regression test

## Resolution

root_cause: Both prior fixes (d658aab, 055f3eb) are correct and committed in source, but `apps/bartender/dist` — the static bundle Fastify actually serves at `/bartender/`, which is the ONLY path a real LAN device (iPad/phone) can reach since the Vite dev server has no LAN host binding — was never rebuilt after either fix landed. Real devices were therefore still running the original pre-fix JS bundle for both bugs.
fix: rebuild apps/bartender (`pnpm --filter bartender build`) so dist reflects both fixes; added `apps/server/src/staticBundleFreshness.test.ts` as a permanent regression test asserting the served bundle is never older than the two previously-fixed source files.
verification:
  target_test: { result: pass }
  mutation_check: { result: skipped, reason_if_skipped: "no application source-code diff — root cause is build-artifact staleness, not a logic change; nothing in src/ to mutate. Only a rebuilt (gitignored) dist/ output and a new additive test file." }
  no_op_deletion: { result: pass, deletion_justified_by_rca: n/a — diff is purely additive (new test file), no deletions or short-circuited logic anywhere }
  adjacent_tests: { result: pass, suites_run: [apps/server full suite 119/119, apps/bartender full suite 77/77] }
  revert_and_reconfirm: { result: pass, bug_returned_on_revert: true, fixed_on_reapply: true — backdated dist/assets mtimes to the pre-rebuild timestamp, confirmed staticBundleFreshness.test.ts fails again (bug returns); restored fresh mtimes, confirmed it passes again (reapply) }
  live_http_reconfirm: curl http://localhost:3000/bartender/ now references the newly built index-CnKTY5hr.js; curl of that asset contains "previousOrders" (fix #2 marker) and the conditional Content-Type spread (fix #1) — confirmed at the actual HTTP layer with no server restart needed (@fastify/static reads from disk per-request)
  guardrail_verdict: accepted
files_changed:
  - apps/server/src/staticBundleFreshness.test.ts (new — permanent regression test guarding this class of bug)
  - apps/bartender/dist/** (rebuilt artifact, gitignored — not committed to git, but is the actual fix real devices need)

tdd_checkpoint:
  test_file: "apps/server/src/staticBundleFreshness.test.ts"
  test_name: "dist/assets is not older than ../../bartender/src/api/client.ts|useMarkOrderDone.ts"
  status: "green"
  failure_output: "(red phase, pre-fix) AssertionError: expected 1787110156443.41 to be greater than or equal to 1787152968377.1194 (client.ts) / 1787157817352.2178 (useMarkOrderDone.ts) — both cases failed as expected. (green phase, post-rebuild) 2/2 passed."
</content>
