---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-18T18:03:37.586Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 04 | unrun-verify | apps/patron/src/hooks/useFullscreen.ts |  | Real-iPad Safari human-check for 04-05 Task 2 (fullscreen entry, wake-lock, 90s idle return-to-grid) not run — jsdom mocks only; needs a physical-device pass before kiosk deployment | open |  | 2026-08-18T18:03:37.586Z |  |

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
  }
]
````
