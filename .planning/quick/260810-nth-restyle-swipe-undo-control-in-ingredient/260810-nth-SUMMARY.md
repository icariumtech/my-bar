---
phase: quick/260810-nth-restyle-swipe-undo-control-in-ingredient
plan: 1
subsystem: ui
tags: [react, antd, tailwind, styling]

requires:
  - phase: 01-barback-inventory-foundation
    provides: IngredientRow swipe-to-toggle component with hold/undo-in-reveal redesign (G-01-5b)
provides:
  - Chrome-less, centered Undo control inside the swipe reveal strip (matches requested visual design)
affects: [barback, ingredient-inventory]

actuals:
  tokens: 300
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "antd Button type=\"text\" for chrome-less in-context controls, sized via an explicit width tied to the same layout constant (REVEAL_OFFSET) driving the reveal strip, so the control's centering is geometrically tied to the visible area rather than the full row width"

key-files:
  created: []
  modified:
    - apps/barback/src/components/IngredientRow.tsx

key-decisions:
  - "Removed px-md from the reveal div instead of switching justify-start/justify-end to justify-center, since the reveal div spans the full row width but only REVEAL_OFFSET px of it is actually uncovered by the foreground row — centering across the full div would put the Undo text under the still-covered portion, invisible to the user. Sizing the Button to width: REVEAL_OFFSET (instead of minWidth: 48) lets antd's internal label centering do the job within the correct, visible sub-region."

requirements-completed: []

coverage:
  - id: D1
    description: "Undo control renders as plain text with no button border/background inside the red/green reveal area"
    requirement: null
    verification:
      - kind: unit
        ref: "grep verification: type=\"text\" count = 2 (Undo + existing Edit button)"
        status: pass
      - kind: other
        ref: "pnpm --filter barback build (tsc --noEmit + vite build)"
        status: pass
    human_judgment: true
    rationale: "Chrome-less visual appearance is a rendered-styling property; automated build/grep checks confirm the class/prop changes are present but not the final visual result on a real viewport."
  - id: D2
    description: "Undo control is horizontally centered within the visible reveal strip, not pressed against the bottle text/left edge"
    requirement: null
    verification:
      - kind: unit
        ref: "grep verification: width: REVEAL_OFFSET present, px-md count dropped from 2 to 1"
        status: pass
    human_judgment: true
    rationale: "Centering within the correct sub-region during an active swipe/hold is a UX/visual property that requires a manual swipe-and-look pass on a real device viewport, per the plan's human-check note."

duration: 5min
completed: 2026-08-10
status: complete
---

# Quick Task: Restyle swipe Undo control Summary

**Undo control in IngredientRow's swipe reveal area now renders as chrome-less text, centered within the visible reveal strip instead of a bordered button pinned to its edge**

## Performance

- **Duration:** ~5 min
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Removed `px-md` from the reveal-layer div so its edge-aligned content flushes against the true boundary of the visible (uncovered) strip, not a padded inset
- Changed the Undo `Button` to `type="text"` (antd's chrome-less variant, already used elsewhere in this file for the Edit button) to remove its border/background
- Replaced `minWidth: 48` with `width: REVEAL_OFFSET` on the Undo button so antd's internal label-centering places the text in the middle of the exact strip the swipe uncovers, rather than left-pinned against the bottle text

## Task Commits

1. **Restyle swipe Undo control** - `40a1216` (style)

**Plan metadata:** `444d298` (docs: plan)

## Files Created/Modified
- `apps/barback/src/components/IngredientRow.tsx` - Undo control styling (chrome-less, centered) inside the swipe reveal area

## Decisions Made
- Tied the Undo control's width to the `REVEAL_OFFSET` layout constant (rather than adding a new `justify-center` on the full-width reveal div) so centering stays geometrically correct relative to the actually-visible strip. See `key-decisions` in frontmatter for full rationale.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- No swipe/hold/undo interaction logic (state machine, timers, commit-on-slideback) was touched — only visual styling and positioning of the already-existing Undo control.
- `pnpm --filter barback build` (tsc --noEmit + vite build) passes clean.
- Outstanding: a manual on-device swipe/hold check to visually confirm the Undo text now sits centered and chrome-less in the reveal strip — this is a rendered-styling property automated build/grep checks can't fully observe. Recommended as part of the next end-to-end UAT pass on the Barback swipe interaction.

---
*Quick task: 260810-nth-restyle-swipe-undo-control-in-ingredient*
*Completed: 2026-08-10*
