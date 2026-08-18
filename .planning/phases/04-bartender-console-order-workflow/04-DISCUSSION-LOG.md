# Phase 4: Bartender Console & Order Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-17
**Phase:** 4-Bartender Console & Order Workflow
**Areas discussed:** Order submission flow, Ticket queue & lifecycle, Bartender recipe search/filter (Kiosk lockdown & inactivity timeout deferred to Claude's discretion)

---

## Order submission flow

| Option | Description | Selected |
|--------|-------------|----------|
| Single drink per order | Tapping Order on detail screen submits just that one drink | ✓ |
| Multi-item cart | Add several drinks to a cart before submitting | |

| Option | Description | Selected |
|--------|-------------|----------|
| Button on detail screen only | Order button + "who's this for" prompt lives on detail view | ✓ |
| Order button on both card and detail | Add order affordance to browse-grid cards too | |

| Option | Description | Selected |
|--------|-------------|----------|
| Brief confirmation, then back to browse | Toast/overlay, then return to browse grid | ✓ |
| Confirmation with live status until picked up | Patron sees their ticket's status persist on screen | |

| Option | Description | Selected |
|--------|-------------|----------|
| No — order action hidden/disabled | Order button disabled/hidden if not makeable | ✓ |
| Yes, allowed with a warning | Patron can submit anyway, bartender sees it flagged | |

**Follow-up round:**

| Option | Description | Selected |
|--------|-------------|----------|
| "Who's this for" optional, blank allowed | Matches REQUIREMENTS.md wording | ✓ |
| Required before submit | Must type something before submitting | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, no restriction on reordering | Kiosk can submit any number of orders any time | ✓ |
| Briefly locked after submit | Cooldown to prevent accidental double-taps | |

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error, stay on detail screen | Simple error message, retry the Order button | ✓ |
| Silent retry then fallback message | Background retry once before showing error | |

| Option | Description | Selected |
|--------|-------------|----------|
| Just recipe + optional name + timestamp | No device/session tracking | ✓ |
| Include a device identifier | Tag order with which kiosk/device it came from | |

**User's choice:** All recommended options selected across both rounds.
**Notes:** None — no deviations from recommended defaults.

---

## Ticket queue & lifecycle

| Option | Description | Selected |
|--------|-------------|----------|
| Three columns: New / In Progress / Done | Kanban-style board | |
| Single list, sorted with status tags | One scrolling list with status badges | (user proposed a variant — see notes) |

| Option | Description | Selected |
|--------|-------------|----------|
| Tap a button on the ticket | Explicit Start/Done action buttons | (user proposed a variant — see notes) |
| Drag-and-drop between columns | Drag ticket cards between columns | |

| Option | Description | Selected |
|--------|-------------|----------|
| Stays visible briefly, then auto-clears | Done tickets remain briefly, then get cleared | ✓ |
| Removed from queue immediately | Disappears from screen the moment it's Done | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, but only tied to the confirmation view | SYNC-02 satisfied via the brief confirmation screen | |
| No live status back to Patron at all | Patron never sees status after submitting | ✓ |

**User's choice:** Free-text — "a single sorted list that I can easily go from one order to the next but I also want to just be able to browse recipes. I plan on using a echo show 8 gen 1 with lineageos for the bartender interface." Then: "just a done button is fine. click a recipe in the list then to view it then if it is an order have a done button. also, group recipes if people order the same so I can batch them."
**Notes:** This diverged from the presented column/kanban options — the user described a device constraint (Echo Show 8 Gen 1, LineageOS, small touchscreen) driving a simpler single-list-with-detail-view model instead of a kanban board. Captured as D-55 through D-61 in CONTEXT.md.

**Follow-up round (clarifying the free-text answer against BART-03):**

| Option | Description | Selected |
|--------|-------------|----------|
| Opening = in progress, Done button finishes it | Tapping a ticket auto-advances New→In Progress | ✓ |
| Just two states, no "in progress" tracking | Drop the middle state entirely | |

| Option | Description | Selected |
|--------|-------------|----------|
| Merge identical orders into one row with a count | e.g. "Old Fashioned ×3" with names listed inside | ✓ |
| Adjacent rows, visually grouped but separate | Each order keeps its own row/Done button | |

| Option | Description | Selected |
|--------|-------------|----------|
| Orders pinned at top, recipes below | Active tickets sort to top with distinct treatment | (user proposed a variant — see notes) |
| One unified list, sorted by recency | Orders and recipes interleaved | |

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse Patron's detail layout, scaled down | Same content, responsive for 8" screen | (user proposed a variant — see notes) |
| Trimmed/simplified detail view | Reduced fields by default | |

**User's choice (mixed list / small-screen questions):** Free-text — "tabs to switch between viewing recipes and for order. the orders button should have a count on it if there is 1 or more orders in the queue" and "two tabs, one to search recipes and one for orders. clicking a recipe or order shows a details screen with all the measurements, steps and garnish etc. if it is an order then a done button also appears. the bartender screen doesn't need to be themed like the patron, just utility ui using ant design."
**Notes:** User replaced the "pinned at top" vs "unified list" framing with a two-tab (Recipes / Orders) navigation model, with a badge count on the Orders tab. Also specified the Bartender app should use plain antd utility styling, not Patron's neon theme. Captured as D-55, D-56, D-64 in CONTEXT.md.

---

## Bartender recipe search/filter

| Option | Description | Selected |
|--------|-------------|----------|
| Text search box + Spirit tag filter chips | Search-as-you-type + Spirit-only filter chips | (user proposed a variant — see notes) |
| Full tag rail like Patron (all 4 groups) | Reuse all four tag groups as filters | (closest to what was chosen) |

**User's choice:** Free-text — "a filter button that shows a full screen where I can select the different tags. just group the tags in a list."
**Notes:** Neither preset option matched exactly — user wants a dedicated full-screen filter view (not inline chips or a rail), listing all tag groups. Captured as D-62 in CONTEXT.md.

| Option | Description | Selected |
|--------|-------------|----------|
| Full tri-state (green/yellow/red) | Real tri-state from computeMakeable() | ✓ |
| Same 2-state as Patron | Just makeable/not-makeable | |

| Option | Description | Selected |
|--------|-------------|----------|
| Recipes tab only | Orders tab has no search | ✓ |
| Both tabs | Add search to Orders tab too | |

**User's choice:** Recommended options selected for both.
**Notes:** None.

---

## Claude's Discretion

- Kiosk lockdown mechanics (PATR-07) — exact fullscreen/kiosk-lock implementation for Patron on iPad Safari
- Inactivity timeout duration and activity-detection method (PATR-08)
- Exact Done-ticket retention window (D-60) — "briefly" not pinned to a specific duration
- Visual treatment of the "×N" batched order row and elapsed-time display
- Whether the Orders-tab badge counts "new" only or "new + in progress"

## Deferred Ideas

- Multi-item cart ordering (past D-48)
- Persistent patron-facing order status tracker (past D-51/D-61)
- Drag-and-drop ticket management (past D-57)
- Multi-device kiosk identity on orders (past D-54)
