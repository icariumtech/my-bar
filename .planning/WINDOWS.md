---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-08-19T20:22:21.359Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 04 | unrun-verify | apps/patron/src/hooks/useFullscreen.ts |  | Real-iPad Safari human-check for 04-05 Task 2 (fullscreen entry, wake-lock, 90s idle return-to-grid) not run — jsdom mocks only; needs a physical-device pass before kiosk deployment | open |  | 2026-08-18T18:03:37.586Z |  |
| 2 | quick | unrun-verify | apps/bartender/src/components/OrdersTab.tsx |  | 260819-l5f Task 2 checkpoint (visual side-by-side Orders vs Recipes card parity) self-verified via structural DOM parity check only — no headless-browser tooling available; recommend a quick manual dev-server spot-check | open |  | 2026-08-19T20:22:21.359Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "04",
    "file": "apps/patron/src/hooks/useFullscreen.ts",
    "line": null,
    "description": "Real-iPad Safari human-check for 04-05 Task 2 (fullscreen entry, wake-lock, 90s idle return-to-grid) not run — jsdom mocks only; needs a physical-device pass before kiosk deployment",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-18T18:03:37.586Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "quick",
    "file": "apps/bartender/src/components/OrdersTab.tsx",
    "line": null,
    "description": "260819-l5f Task 2 checkpoint (visual side-by-side Orders vs Recipes card parity) self-verified via structural DOM parity check only — no headless-browser tooling available; recommend a quick manual dev-server spot-check",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-19T20:22:21.359Z",
    "resolved_at": null
  }
]
````
