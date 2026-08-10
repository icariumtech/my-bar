---
phase: quick/260810-nth-restyle-swipe-undo-control-in-ingredient
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/barback/src/components/IngredientRow.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "The Undo control renders as plain text with no visible border/background box around it while a stock toggle is pending"
    - "The Undo control is horizontally centered within the colored reveal strip that is actually visible on screen, not flush against its inner edge"
    - "The Undo control remains a real, tappable interactive element, reachable to assistive tech exactly when canUndo is true, identical to today"
  artifacts:
    - "apps/barback/src/components/IngredientRow.tsx — Undo `Button` restyled to `type=\"text\"` with `width: REVEAL_OFFSET`, reveal-layer `px-md` padding removed"
  key_links:
    - "REVEAL_OFFSET constant -> Undo Button's `width` style -> antd Button's internal `justify-content: center` label centering, so the visible label lands in the middle of the exact strip the swipe uncovers"
---

<objective>
Restyle the swipe Undo control in `IngredientRow.tsx` so it renders as plain text (no button
chrome) inside the red/green reveal area, horizontally centered within that revealed strip
instead of left-aligned/pressed against its inner edge — a pure visual/positioning change with
zero change to the swipe/hold/undo state machine, timers, or commit behavior (G-01-5b's
interaction model stays exactly as implemented in phase 01 plan 01-06).

Purpose: the Undo control was just introduced in the 01-06 gap-closure redesign with a default
antd `Button` (visible border + background box) left-aligned via `justify-start`/`justify-end`
on a full-width, padded flex container — this reads as a floating chrome-heavy button awkwardly
stuck to one side, not as a control that belongs to the colored reveal area it lives inside.

Output: `apps/barback/src/components/IngredientRow.tsx` updated so, while `canUndo` is true, the
"Undo" label appears as unstyled text (no border/background) centered within the exact strip of
the row that the swipe has uncovered — still a real `<button>` element, still gated by the same
`canUndo`/`aria-hidden` logic as today. `pnpm --filter barback build` passes clean.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@apps/barback/src/components/IngredientRow.tsx
@apps/barback/src/components/swipeVisuals.ts
</context>

<tasks>

<task type="auto">
  <name>Task: Restyle Undo control to chrome-less, centered text within the reveal strip</name>
  <files>apps/barback/src/components/IngredientRow.tsx</files>
  <action>
Two coordinated edits to the reveal-layer `<div>` and the Undo `Button` it renders (both live in
the JSX returned by `IngredientRow`, currently around lines 169-180) — do not touch any state,
effect, timer, or handler above the `return`.

Background on why both edits are needed together: the reveal `<div>` spans the row's full width
(`absolute inset-0`), but because the foreground row on top of it translates by exactly
`swipeOffset` and the outer wrapper clips overflow, only a strip exactly `REVEAL_OFFSET`px wide
at one edge of that div is ever actually visible on screen — the rest is covered by the opaque
foreground. `canUndo` is only ever true while `swipeOffset` is held at exactly `REVEAL_OFFSET`
(signed), so `REVEAL_OFFSET` is the right fixed width to reason about here, not a computed
`Math.abs(swipeOffset)`. Centering content in the *full-width* div (e.g. swapping to
`justify-center`) would place it in the middle of the row, which is exactly the part still
covered by the opaque foreground — it would center the control into invisibility. So: keep the
existing `swipeOffset > 0 ? 'justify-start' : 'justify-end'` edge-selection ternary exactly as
it is (it correctly flushes content to whichever edge the swipe actually uncovered) — the fix is
to give the Undo element a fixed box exactly as wide as the visible strip, flush against the
true edge of that div (not inset by padding), so antd's own internal content-centering places
the label in the middle of the strip a user can actually see.

Edit 1 — reveal `<div>`'s className: remove `px-md` from the template string (currently
`` `absolute inset-0 rounded-lg flex items-center px-md ${revealColorClass} ${...}` ``, become
`` `absolute inset-0 rounded-lg flex items-center ${revealColorClass} ${...}` ``). Leave
`items-center`, `rounded-lg`, `revealColorClass`, `aria-hidden`, and the justify-start/justify-end
ternary untouched. This padding removal matters: with it still present, `justify-start`/
`justify-end` would flush content against the *padded* inner edge rather than the div's true
edge, so a box sized to exactly `REVEAL_OFFSET` would overhang past the visible strip's boundary
and get partly clipped by the foreground — undermining the centering fix below.

Edit 2 — the Undo `Button` itself (currently `<Button onClick={undo} style={{ minHeight: 48,
minWidth: 48 }}>Undo</Button>`): add the `type="text"` prop (antd's chrome-less button variant —
the same prop already used for the Edit button lower in this same file and in
`CategoryManager.tsx`/`AddEditIngredientForm.tsx`, so this matches an established convention
rather than introducing a new one). `type="text"` removes the default visible border and
background box, leaving only the label styled as plain text. Replace the `minWidth: 48` style
key with `width: REVEAL_OFFSET` (keep `minHeight: 48` unchanged for the existing 48px touch-
target height). `REVEAL_OFFSET` is already an in-scope module-level constant in this file — no
new import needed. Setting an explicit `width` equal to the visible strip's width, combined with
antd's `Button` internally centering its label content, is what produces the "horizontally
centered within the reveal area" result — no extra wrapper `<div>` is needed for this.

Do not change `onClick={undo}`, the `canUndo &&` render guard, `aria-hidden={!revealIsInteractive}`,
the `justify-start`/`justify-end` ternary, `revealColorClass`, `swipeOffset`, `REVEAL_OFFSET`'s
value or declaration, or anything in the foreground row `<div>` below the reveal layer (its own
separate `px-md` on the row itself must stay — only the reveal layer's `px-md` is removed).
  </action>
  <verify>
    <automated>pnpm --filter barback build && grep -c 'type="text"' apps/barback/src/components/IngredientRow.tsx | grep -qx 2 && grep -q 'width: REVEAL_OFFSET' apps/barback/src/components/IngredientRow.tsx && grep -c 'px-md' apps/barback/src/components/IngredientRow.tsx | grep -qx 1</automated>
    <human-check>On a phone/iPad viewport, swipe an ingredient row far enough to trigger the hold (left for out-of-stock/red, right for in-stock/green): confirm "Undo" appears as plain text with no visible border or background box around it, sitting in the middle of the colored strip that the swipe uncovered rather than pressed against its inner edge, and that tapping it still undoes the pending toggle exactly as before.</human-check>
  </verify>
  <done>
The reveal layer's className no longer contains `px-md`; the Undo `Button` has `type="text"` and
`style={{ minHeight: 48, width: REVEAL_OFFSET }}` (no `minWidth: 48`). `pnpm --filter barback
build` exits 0. Visually: while `canUndo` is true, "Undo" renders with no border/background box
and sits centered within the visible colored strip instead of flush against its inner edge. No
change to `onClick={undo}`, the `canUndo` render guard, `aria-hidden`, the justify-start/
justify-end edge-selection ternary, or any state/effect/timer/handler — only the reveal `<div>`'s
className and the Undo `Button`'s props changed. Only `apps/barback/src/components/IngredientRow.tsx`
is modified; no new files or dependencies.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Phone/tablet browser (Undo tap) -> local component state only | Unchanged from phase 01 plan 01-06 — this task introduces no new trust boundary. `undo()` still only clears a local timer and local state; no network request is made on undo (D-10), and this task does not touch `undo()`'s body. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-Q260810NTH-01 | Denial of Service (of the control itself) | Undo `Button` in reveal layer | low | mitigate | Removing visible chrome (`type="text"`) must not remove tappability or shrink the touch target below the existing 48px minimum — `minHeight: 48` is preserved and `width: REVEAL_OFFSET` (80px) stays above the 48px floor, so the real `<button>` element keeps its full tap area even though it now looks like plain text. |
</threat_model>

<verification>
Run `pnpm --filter barback build` from the repo root — must exit 0. Confirm via grep that the
reveal layer's `px-md` was removed (count drops from 2 to 1 in the file), the Undo `Button` has
`type="text"`, and its style now includes `width: REVEAL_OFFSET`. Optionally, visually confirm on
a real device per the task's `<human-check>`: Undo reads as plain text (no button box) centered
in the revealed colored strip, and still undoes the pending toggle on tap.
</verification>

<success_criteria>
- Undo control has no visible border/background box — reads as plain text on the reveal color.
- Undo control is horizontally centered within the strip the swipe actually uncovers, not left-aligned/pressed against its edge.
- Undo remains a real, tappable `<button>` element with an unchanged `onClick`/`canUndo`/`aria-hidden` gating.
- No change to the swipe/hold/undo state machine, timers, or commit behavior.
- `pnpm --filter barback build` passes clean.
- Only `apps/barback/src/components/IngredientRow.tsx` is modified.
</success_criteria>

<output>
Create `.planning/quick/260810-nth-restyle-swipe-undo-control-in-ingredient/260810-nth-SUMMARY.md` when done.
</output>
