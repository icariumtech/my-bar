---
status: diagnosed
phase: 01-barback-inventory-foundation
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md
started: 2026-08-10T18:20:00Z
updated: 2026-08-10T19:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files) if desired. Start the application from scratch (./start_server.sh). Server boots without errors, any seed/migration completes, and the Barback screen loads with live data.
result: pass

### 2. View inventory on your phone (INV-05)
expected: Loading http://<lan-ip>:3000/barback/ on your phone shows the real inventory list rendered from the server's SQLite data — not a blank page, not a loading spinner stuck forever. Dark, utilitarian styling (not the neon Patron look).
result: pass

### 3. Add a new bottle (INV-01)
expected: Tap "Add Ingredient", fill in Name + Category (+ optional Note), save. The bottle appears in the inventory list, marked in-stock by default. Form fields are comfortably tappable, keyboard behaves normally, the Category dropdown is usable.
result: pass

### 4. Add the first category from a bar with none (D-03)
expected: If you clear all categories (or test on a fresh DB before seeding), the Add Ingredient form's Category dropdown offers an inline "create category" option instead of leaving you stuck with an empty dropdown and no way to proceed.
result: pass

### 5. Swipe a bottle to toggle stock (INV-03)
expected: Swiping a row left marks it out-of-stock; swiping right marks it in-stock. The row responds immediately to the swipe (feels responsive, not laggy), and a brief "Undo" affordance appears before the change commits.
result: issue
reported: "The swipe works but out-of-stock items are highlighted green — should be greyed out instead (or otherwise not green, since green is the in-stock/accent color). Also: when swiping left or right I would like the swipe to hold in place when I remove my finger, with Undo shown inside the revealed green/red area (not a separate floating button). If I don't tap Undo, the row should slide back and the new state take effect; only then does the commit fire."
severity: major

### 6. Undo a swipe within the grace window (D-08, D-10)
expected: After swiping, tapping "Undo" within the grace window cancels the change — no network request happens, the row's state stays exactly as it was, and no confirmation dialog interrupts the gesture.
result: pass

### 7. Edit an existing bottle (INV-02)
expected: Tapping Edit on a bottle opens a form pre-filled with its current name/category/note. Changing a field and saving updates the row in the list immediately, without a manual page refresh.
result: pass

### 8. Manage categories — add, rename, delete (D-03)
expected: From the Barback screen you can add a new category, rename an existing one (renamed name shows up on its bottles), and delete a category that has no bottles in it — all without leaving the screen. Tap targets feel appropriately sized, no accidental mis-taps.
result: pass

### 9. Editing a bottle never touches its stock state (D-08)
expected: The edit form for a bottle has no stock toggle/switch in it — editing name/category/note never accidentally flips a bottle's in-stock/out-of-stock state.
result: pass

### 10. Add and Edit share one form (copy check)
expected: The same form component is used for adding a new bottle and editing an existing one; both cases show a "Save Changes" button (not "Add" vs "Update" as separate labels).
result: pass

### 11. Category manager empty-state wording (planner assumption — confirm with owner)
expected: When there are zero categories, the category manager shows the message "No categories yet — add your first one below." Confirm this wording reads naturally to you (it was a planner assumption filling an unresolved UI-SPEC item, not a decision you explicitly approved).
result: pass

### 12. Search narrows the list instantly (INV-04)
expected: Typing part of a bottle's name into the search box narrows the visible list as you type, with no perceptible delay and no network round-trip per keystroke.
result: pass

### 13. Filter by category chip, combined with search (INV-04)
expected: Tapping a category chip filters the list to that category. Typing a search query while a chip is active combines both filters (AND, not OR) — e.g. tapping "Gin" then typing "bomb" shows only gin bottles matching "bomb".
result: pass

### 14. One-handed comfort and tap targets (INV-05)
expected: Search input, category chips, ingredient rows, and the Add button all feel comfortably tappable (not cramped) one-handed on your phone. The search bar stays reachable near the top as you scroll (sticky), and everything is legible in dim light.
result: pass

### 15. GET /api/ingredients joins category + defaults in-stock
expected: Ingredients endpoint returns each row with its category name attached and inStock true by default.
result: pass
source: automated
coverage_id: D4

### 16. Foreign-key enforcement on ingredients/categories
expected: An ingredient cannot reference a missing category; a category still in use cannot be deleted.
result: pass
source: automated
coverage_id: D3

### 17. Ingredient rows persist across a server restart
expected: Data survives a server kill + restart (real SQLite file, not in-memory).
result: pass
source: automated
coverage_id: D2

### 18. Duplicate category name rejected (D-01 typo-proofing)
expected: Creating a category with a name that already exists returns 409, not a second duplicate row.
result: pass
source: automated
coverage_id: D3

### 19. Bad ingredient input rejected before DB write
expected: Unknown categoryId on ingredient create returns 400 not 500; blank/oversized name rejected by validation before any DB work.
result: pass
source: automated
coverage_id: D4

### 20. Swipe direction is fixed (D-08)
expected: Left swipe always means out-of-stock, right swipe always means in-stock.
result: pass
source: automated
coverage_id: D2

### 21. No blocking confirmation dialog on toggle (D-10)
expected: No modal/dialog interrupts a stock toggle swipe.
result: pass
source: automated
coverage_id: D4

### 22. Stock state survives a page refresh
expected: A fresh GET after a toggle reflects the new value (server is the source of truth).
result: pass
source: automated
coverage_id: D5

### 23. Malformed stock-toggle request can't corrupt other fields
expected: A stock-toggle PATCH cannot rename a bottle or move its category; an unmatched id 404s rather than silently succeeding.
result: pass
source: automated
coverage_id: D6

### 24. In-use category delete is refused with an accurate count (D-03)
expected: Deleting a category with ingredients in it is refused (409) with the exact message naming the real ingredient count; nothing is deleted.
result: pass
source: automated
coverage_id: D3

### 25. Category rename propagates to its ingredients (D-01)
expected: Renaming a category immediately changes the categoryName shown on every ingredient in it.
result: pass
source: automated
coverage_id: D4

### 26. Empty and filtered-empty states are visually distinct
expected: Zero ingredients ever added shows "No ingredients yet"; a filtered search with zero matches shows the visually distinct "No matches for {query}".
result: pass
source: automated
coverage_id: D4

### 27. Loading and error states render distinctly
expected: A loading spinner with "Loading inventory…" while the first fetch is pending; an error Alert with a working Retry button on failure.
result: pass
source: automated
coverage_id: D5

### 28. Barback stays in the dark utilitarian palette
expected: No Patron dark-neon colors leak into the Barback screen; only the established dark palette is used.
result: pass
source: automated
coverage_id: D6

## Summary

total: 28
passed: 27
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-01-5
  truth: "Out-of-stock rows are visually distinguished without using the reserved in-stock/accent green; the swipe reveal background only shows while actively swiping or pending undo, not at rest."
  status: failed
  reason: "User reported: out-of-stock items are highlighted green (the reveal div's ternary defaults to bg-bar-accent when swipeOffset===0, and out-of-stock rows' opacity-60 lets it bleed through) — should be greyed out, not green."
  severity: major
  test: 5
  root_cause: "apps/barback/src/components/IngredientRow.tsx:123 — revealColorClass = swipeOffset < 0 ? 'bg-bar-destructive' : 'bg-bar-accent'. At rest (swipeOffset === 0, the common case), the ternary's false branch fires, defaulting the always-rendered reveal div (line 129) to bg-bar-accent (#22c55e green — the reserved in-stock/CTA color per 01-UI-SPEC.md's Color table). Out-of-stock rows render at 60% opacity (line 131-132: displayedInStock ? '' : 'opacity-60'), which lets that green reveal layer bleed through visibly behind the semi-transparent row. In-stock rows are fully opaque, so the same bleed-through is invisible there — explaining why only out-of-stock rows appeared tinted."
  artifacts:
    - path: "apps/barback/src/components/IngredientRow.tsx"
      issue: "revealColorClass ternary has no neutral/hidden state for swipeOffset === 0 — it always resolves to a color, defaulting to accent green"
  missing:
    - "Give the reveal div a neutral state (transparent, or bg-bar-surface matching the row's own resting background) whenever swipeOffset === 0 and no toggle is pending/mid-grace-period, so it only shows destructive/accent color while actively swiping or during the undo-visible window"
    - "Out-of-stock resting-state styling should not rely on opacity alone bleeding through an always-colored layer underneath — grey/dim the row via its own background or a dedicated out-of-stock treatment, independent of the swipe-reveal layer's color"
  debug_session: ""
- gap_id: G-01-5b
  truth: "Swipe interaction: after releasing a swipe, the row holds in the revealed position with Undo shown inside the revealed color area (not a separate floating button). If Undo isn't tapped within the grace period, the row slides back and the new state takes effect — commit fires only at that point, not immediately on release."
  status: failed
  reason: "User requested a different swipe-hold/undo-placement mechanic than what was implemented: current implementation flips the row instantly on release (swipeOffset resets to 0 immediately via onSwiped, line 114) with Undo as a separate floating Button element (line 144-148) placed among the row's trailing controls, rather than holding the revealed state with Undo inside the colored reveal area."
  severity: major
  test: 5
  root_cause: "Not a bug — a deliberate interaction-model change. Current implementation (react-swipeable's onSwiped immediately zeroes swipeOffset, decoupling the visual swipe position from the pending/grace-period state which is tracked separately via `pending`/`canUndo`). The requested design instead ties the swipe-held visual position to the pending/grace-period lifecycle: the row should stay translated to its revealed position (matching the swiped direction's reveal color) for the duration of the grace period, with the Undo control rendered inside that revealed area, then animate back to rest (triggering the commit) only when the grace period elapses without an Undo tap."
  artifacts:
    - path: "apps/barback/src/components/IngredientRow.tsx"
      issue: "onSwiped resets swipeOffset to 0 immediately on release instead of holding it at a fixed revealed offset for the grace-period duration; Undo button is rendered among the row's trailing controls rather than inside the reveal div"
  missing:
    - "Replace the immediate onSwiped reset with logic that snaps swipeOffset to a fixed 'revealed' value (matching swipe direction) once a swipe crosses the toggle threshold, and holds it there for the grace period"
    - "Move the Undo control into the reveal div (the colored background layer) so it appears inside the red/green revealed area rather than as a separate row-trailing button"
    - "On grace-period elapse (no Undo tap), animate/transition swipeOffset back to 0 as the visual cue that the commit is taking effect, coordinated with the existing commit-timer logic in startToggle"
    - "Preserve existing invariants: no network request on undo (D-10), no blocking confirmation dialog (D-10), swipe direction mapping unchanged (D-08)"
  debug_session: ""
