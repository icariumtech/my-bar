---
phase: quick
plan: 260817-hpy
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/patron/src/components/TagRail.tsx
  - apps/patron/src/components/TagSubmenu.tsx
  - apps/patron/src/components/TagRail.test.tsx
autonomous: true
requirements: [PATR-01, PATR-06]

estimate:
  tokens: 55000
  raw_tokens: 35000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Tapping a tag-group button opens a flyout beside (right of) that button showing its tags, without changing the rail's own width/layout — the flyout is absolutely positioned, not inline-pushed."
    - "Only one flyout (a tag group's or Settings') is open at any time — opening any flyout closes whichever was previously open, via a single unified openFlyoutId state."
    - "A tag-group button renders in the filled/selected glow state whenever selectedTagId belongs to that group, regardless of whether that group's flyout is currently open or closed — it reverts to the plain outlined state only when the selection is cleared (selectedTagId undefined or belongs to a different group)."
    - "The bottom-pinned control is a single-state Settings gear icon button (same w-14 h-14 rounded-xl mt-auto footprint as the removed Eye/EyeOff toggle) that opens a flyout containing a 'Show all recipes' checkbox wired to showAvailableOnly (inverted) / onToggleAvailableOnly — unchanged prop wiring from RecipeBrowse."
    - "Any open flyout closes on: outside click (anywhere outside the whole rail), Escape keypress, or a different flyout being opened; tapping an already-open group's own trigger button also closes it (toggle-to-close, preserved from before)."
    - "RecipeBrowse.tsx's props contract into TagRail (recipes, selectedTagId, onSelectTag, showAvailableOnly, onToggleAvailableOnly) is unchanged — RecipeBrowse.tsx is not modified by this task."
  artifacts:
    - "apps/patron/src/components/TagRail.tsx — unified openFlyoutId state (group id | 'settings' | undefined), relative-positioned trigger wrappers, absolutely-positioned flyout popovers for both tag groups and Settings, persistent-selection highlight logic, single outside-click+Escape-close effect."
    - "apps/patron/src/components/TagSubmenu.tsx — top-of-file comment updated to describe its new flyout-positioned rendering context (positioning now owned by TagRail's wrapper, not TagSubmenu itself)."
    - "apps/patron/src/components/TagRail.test.tsx — coverage for flyout mutual-exclusivity (group<->group, group<->settings), persistent-selection-highlight independent of open/closed state, settings flyout open/checkbox-wiring/close, and outside-click/Escape closing."
  key_links:
    - "Group/Settings button onClick -> setOpenFlyoutId(toggle-or-switch) -> single state variable determines which one flyout (if any) renders absolutely-positioned beside its own trigger — mutual exclusivity falls out of using one state variable, no extra close-the-others logic needed."
    - "groupHasSelection (selectedTagId matches a tag inside this group's groupTags) OR isFlyoutOpen -> isSelectedState -> filled visual class + aria-pressed on the group button — these two inputs are evaluated independently so selection persists across flyout close."
    - "Settings checkbox checked={!showAvailableOnly}, onChange -> onToggleAvailableOnly() — identical wiring contract to the superseded 260817-hgo plan's design, reused here."
    - "document mousedown/keydown listeners (attached only while openFlyoutId !== undefined, via useEffect keyed on openFlyoutId) -> setOpenFlyoutId(undefined) when the click target is outside railRef.current or Escape is pressed."
---

<objective>
Convert TagRail's tag-group submenus from inline-expanding blocks into absolutely-positioned flyout popovers anchored beside their trigger button, replace the bottom-pinned Eye/EyeOff availability toggle with a Settings gear button that opens an equivalent flyout containing the "Show all recipes" checkbox, and make a tag-group's filled/selected highlight persist based on whether it owns the active tag filter — independent of whether its flyout happens to be open.

Purpose: The rail currently pushes its own column taller when a submenu expands, and loses the visual signal of "which group is filtering" the instant its submenu closes. Both are UX regressions the user has asked to fix directly, and supersede the (never-executed) 260817-hgo full-screen-modal design in favor of a lighter anchored-flyout mechanic shared by every rail control.
Output: `TagRail.tsx` with a single `openFlyoutId` state driving mutually-exclusive, absolutely-positioned flyouts for all 4 tag groups and Settings; `TagSubmenu.tsx` comment updated for its new context; `TagRail.test.tsx` covering flyout switching, persistent highlight, settings wiring, and outside-click/Escape close. `RecipeBrowse.tsx` is untouched.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@apps/patron/src/components/RecipeDetail.tsx
@apps/patron/src/index.css

RecipeBrowse.tsx passes `recipes`, `selectedTagId`, `onSelectTag`, `showAvailableOnly: boolean`, and `onToggleAvailableOnly: () => void` into TagRail and is NOT modified by this plan — only TagRail's and TagSubmenu's internal rendering changes.

The superseded 260817-hgo plan (`.planning/quick/260817-hgo-replace-availability-toggle-with-a-setti/260817-hgo-PLAN.md`) designed a full-screen backdrop+modal dialog for Settings and was never executed (confirmed via `git log` — no commits touch TagRail.tsx beyond `81ee229` feat(quick-260817-g39), which still has the Eye/EyeOff toggle). This plan reuses ONLY its checkbox-wiring detail (`checked={!showAvailableOnly}`, `onChange={onToggleAvailableOnly}`) — the container mechanic is a small anchored flyout, not a full-viewport modal+backdrop, and Settings shares the exact same open/close state machine as the tag-group flyouts rather than its own separate `isSettingsOpen` boolean.

lucide-react@1.31.0 (already a dependency) exports `Settings` — no new npm install needed. No X/close button is used inside flyouts in this design (closing is outside-click / Escape / re-tap-toggle / another-flyout-opens only, matching TagSubmenu's existing toggle-to-close convention).

Architecture decision (documented here, not re-derived by the executor): flyout positioning/card-chrome classes are NOT extracted into a shared component — TagSubmenu.tsx stays a dumb, unpositioned list renderer (its own `<div className="flex flex-col gap-xs w-full">` is untouched), and the small amount of positioning+card-chrome className duplication between the group-flyout wrapper and the Settings-flyout wrapper (both live in TagRail.tsx) is accepted inline per this codebase's stated preference against premature abstraction for 2 call sites. The outside-click/Escape-close LOGIC is not duplicated at all — it's one generic effect keyed on `openFlyoutId` that works for any flyout (group or Settings) since it only checks "is the click inside the whole rail."
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Unify flyout state, reposition TagSubmenu as an absolute flyout, add persistent-selection highlight and outside-click/Escape close</name>
  <files>apps/patron/src/components/TagRail.tsx, apps/patron/src/components/TagSubmenu.tsx, apps/patron/src/components/TagRail.test.tsx</files>
  <behavior>
    - Clicking a tag-group's trigger button opens that group's flyout (its tags become visible) positioned to the right of the button (an absolutely-positioned sibling, not an inline-pushed block) — the rail's own width is unaffected by open/closed state.
    - Clicking a DIFFERENT group's trigger button while one flyout is open closes the first (its tags stop being visible) and opens the second's — never both at once.
    - Clicking the SAME group's trigger button again while its own flyout is open closes it (toggle-to-close, preserved from current behavior).
    - `fireEvent.mouseDown(document.body)` while a flyout is open closes it. `fireEvent.keyDown(document, { key: 'Escape' })` while a flyout is open closes it.
    - A group button carries `aria-pressed="true"` whenever `selectedTagId` matches one of that group's own tags, REGARDLESS of whether that group's flyout is currently open or closed (test: render with `selectedTagId={WHISKEY.id}` and no flyout opened at all — Spirit's button already has `aria-pressed="true"`; opening a different group's flyout afterward does not clear it). It carries `aria-pressed="false"` when `selectedTagId` is undefined or belongs to a different group.
    - All prior TagRail tests (D-36 muted/inactive rendering, D-37 select/clear/replace via `onSelectTag`) continue to pass unchanged — this task does not alter selection-callback semantics, only visual/positioning/open-state mechanics.
  </behavior>
  <action>
    In TagRail.tsx: change the React import to include `useEffect` and `useRef` alongside the existing `useMemo`/`useState`. Replace `const [expandedGroupId, setExpandedGroupId] = useState...` with `const [openFlyoutId, setOpenFlyoutId] = useState&lt;string | undefined&gt;(undefined)` — this single value will represent either a group's `id` (e.g. `'spirit'`) or the literal string `'settings'` (added in Task 2) or `undefined` for "nothing open." Add `const railRef = useRef&lt;HTMLDivElement&gt;(null)` and attach `ref={railRef}` to the outer rail `&lt;div className="flex flex-col items-center gap-lg w-20 shrink-0 py-lg rounded-full glow-orange bg-patron-bg/50"&gt;`.

    Add one `useEffect` with dependency array `[openFlyoutId]`: if `openFlyoutId === undefined`, return immediately (no listeners). Otherwise define `handlePointerDown(event: MouseEvent)` that calls `setOpenFlyoutId(undefined)` when `railRef.current` exists and `!railRef.current.contains(event.target as Node)`, and `handleKeyDown(event: KeyboardEvent)` that calls `setOpenFlyoutId(undefined)` when `event.key === 'Escape'`. Register both via `document.addEventListener('mousedown', handlePointerDown)` and `document.addEventListener('keydown', handleKeyDown)`, and return a cleanup removing both. This one effect is generic across every flyout type — it never needs to know which flyout is open, only that one is.

    Inside the `TAG_GROUP_META.map()` callback: after the existing `groupTags`/`isActive` computation, add `const isFlyoutOpen = isActive && openFlyoutId === group.id` and `const groupHasSelection = selectedTagId !== undefined && groupTags.some((t) => t.id === selectedTagId)`, then `const isSelectedState = isActive && (isFlyoutOpen || groupHasSelection)`. Replace every remaining use of the old `isExpanded` variable with `isSelectedState` (the filled-vs-subtle className ternary). Add `aria-pressed={isSelectedState}` to the button. Change the button's `onClick` to `isActive ? () =&gt; setOpenFlyoutId(isFlyoutOpen ? undefined : group.id) : undefined`.

    Add `relative` to the group wrapper div's existing className (`"relative flex flex-col items-center gap-sm w-full"`). Replace the `{isExpanded && (&lt;TagSubmenu .../&gt;)}` block with `{isFlyoutOpen && (&lt;div className="absolute left-full top-0 ml-sm z-50 min-w-[160px] rounded-2xl bg-patron-surface/95 backdrop-blur-sm glow-orange p-sm"&gt;&lt;TagSubmenu tags={groupTags} selectedTagId={selectedTagId} onSelectTag={(tagId) =&gt; onSelectTag(tagId === selectedTagId ? undefined : tagId)} /&gt;&lt;/div&gt;)}` — same `onSelectTag` wrapping logic as before (toggle-to-clear), only the wrapping container and trigger condition changed.

    Update the comment above the state declaration (previously "Only one group's submenu open at a time...") to describe `openFlyoutId` as the single source of truth for which flyout (any group, or Settings once Task 2 adds it) is currently open, and note that mutual exclusivity is a natural consequence of using one variable rather than one boolean per control.

    In TagSubmenu.tsx: update only the top-of-file comment to state that this component is now rendered inside an absolutely-positioned flyout wrapper owned by TagRail (not inline-pushed below the trigger button) — TagSubmenu itself remains a dumb, unpositioned list renderer; its own `&lt;div className="flex flex-col gap-xs w-full"&gt;` and all button/selection logic are unchanged.

    In TagRail.test.tsx: add a new `describe('flyout mechanics', ...)` block with tests for: (1) clicking a different group's button closes the first flyout and opens the second (assert the first group's tag text is no longer present, the second group's tag text is present); (2) clicking the same group's button twice closes its own flyout; (3) `fireEvent.mouseDown(document.body)` while a flyout is open closes it; (4) `fireEvent.keyDown(document, { key: 'Escape' })` while a flyout is open closes it. Add a `describe('persistent selection highlight', ...)` block with tests for: (5) rendering with `selectedTagId={WHISKEY.id}` shows `aria-pressed="true"` on the Spirit button with no flyout opened at all; (6) after opening a different group's flyout (e.g. clicking Flavor), the Spirit button still has `aria-pressed="true"`; (7) rendering with `selectedTagId={undefined}` shows `aria-pressed="false"` on every active group button.
  </action>
  <verify>
    <automated>pnpm --filter patron test -- TagRail</automated>
  </verify>
  <done>TagRail.test.tsx passes in full: existing D-36/D-37 tests green unchanged, new flyout-mechanics tests (switch-between-groups, toggle-close, outside-click-close, Escape-close) green, new persistent-selection-highlight tests (aria-pressed true regardless of open/closed, false when cleared) green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Replace Eye/EyeOff toggle with a Settings gear flyout wired to showAvailableOnly/onToggleAvailableOnly</name>
  <files>apps/patron/src/components/TagRail.tsx, apps/patron/src/components/TagRail.test.tsx</files>
  <behavior>
    - The bottom-pinned control renders as a single-state Settings gear icon button (`aria-label="Settings"`, `w-14 h-14 rounded-xl` footprint, no Eye/EyeOff two-state swap) with an uppercase "SETTINGS" label, in the same rail position as the removed availability-toggle button.
    - Clicking it opens a flyout beside the gear button containing a "Settings" heading and a checkbox labeled "Show all recipes" (`aria-label="Show all recipes"`, `checked = !showAvailableOnly`).
    - Toggling the checkbox calls `onToggleAvailableOnly()` exactly once and does not itself close the flyout.
    - Opening the Settings flyout while a tag-group flyout is open closes the group flyout (and vice versa) — same single `openFlyoutId` mechanism from Task 1, no new logic needed for this beyond adding `'settings'` as a possible value.
    - Clicking the gear button again while its own flyout is open closes it (same toggle-to-close convention as the group buttons).
    - Outside-click and Escape close the Settings flyout too, via the same generic effect added in Task 1 (no duplicate listener logic).
  </behavior>
  <action>
    In TagRail.tsx: change the lucide-react import to drop `Eye, EyeOff` and add `Settings` (final import list: `Martini, Sparkles, Leaf, Flame, Settings`). Replace the entire bottom-pinned `&lt;button aria-label="Availability filter" ...&gt;...&lt;/button&gt;` block with a wrapper div sibling to the groups container, inside the outer rail div: `&lt;div className="relative flex flex-col items-center gap-sm w-full mt-auto"&gt;` containing a button `aria-label="Settings"`, `aria-pressed={openFlyoutId === 'settings'}`, `onClick={() =&gt; setOpenFlyoutId(openFlyoutId === 'settings' ? undefined : 'settings')}`, className mirroring the group button's filled/subtle ternary but keyed on `openFlyoutId === 'settings'` instead of `isSelectedState` (`glow-orange bg-patron-accent/20 text-patron-accent` when open, `glow-orange-subtle text-patron-accent` when closed — same `flex flex-col items-center justify-center gap-xs w-14 h-14 rounded-xl transition-colors` base classes as the group buttons, no `mt-auto` on the button itself since it now lives on the wrapper div), rendering `&lt;Settings size={22} aria-hidden="true" /&gt;` and `&lt;span className="text-[10px] uppercase tracking-wide"&gt;SETTINGS&lt;/span&gt;`.

    Directly below that button, still inside the same wrapper div, conditionally render (`{openFlyoutId === 'settings' && (...)}`) a flyout: `&lt;div className="absolute left-full bottom-0 ml-sm z-50 min-w-[200px] rounded-2xl bg-patron-surface/95 backdrop-blur-sm glow-orange p-md flex flex-col gap-sm"&gt;` (uses `bottom-0` instead of `top-0` since this trigger sits at the bottom of the rail — aligns the flyout's bottom edge with the button's rather than risking off-viewport overflow downward) containing an `&lt;h2 className="text-white text-sm"&gt;Settings&lt;/h2&gt;` and a `&lt;label className="flex items-center gap-sm cursor-pointer text-sm text-patron-text-secondary"&gt;` wrapping a native `&lt;input type="checkbox" aria-label="Show all recipes" checked={!showAvailableOnly} onChange={onToggleAvailableOnly} className="w-5 h-5 rounded accent-patron-accent" /&gt;` followed by the text "Show all recipes".

    In TagRail.test.tsx: delete the entire `describe('availability toggle', ...)` block (its `aria-label="Availability filter"` assertions no longer apply — that control is gone). Add a new `describe('settings flyout', ...)` block with tests for: gear button renders `aria-label="Settings"` and "Settings"/"Show all recipes" are NOT present before clicking, and both appear after clicking it; the checkbox is unchecked when `showAvailableOnly={true}` and checked when `showAvailableOnly={false}` (open the flyout first in each case); clicking the checkbox calls `onToggleAvailableOnly` exactly once and the flyout is still open afterward (heading still present); clicking a tag-group button (e.g. Spirit) while the Settings flyout is open closes Settings and opens Spirit's flyout, and vice versa (open Spirit first, then click the gear button, assert Spirit's tags are gone and Settings' heading is present); clicking the gear button twice closes its own flyout.
  </action>
  <verify>
    <automated>pnpm --filter patron test -- TagRail</automated>
  </verify>
  <done>TagRail.test.tsx passes in full: old availability-toggle-button tests removed, new settings-flyout tests (open reveals heading+checkbox, checkbox reflects !showAvailableOnly both directions, checkbox click calls callback once without closing, mutual exclusivity with group flyouts in both directions, toggle-to-close) all green, Task 1's tests remain green.</done>
</task>

<task type="auto">
  <name>Task 3: Full Patron regression — all tests and production build</name>
  <files>apps/patron/src/components/RecipeBrowse.tsx (read-only verification, not modified)</files>
  <action>Run `git diff --stat apps/patron/src/components/RecipeBrowse.tsx` and confirm zero output — RecipeBrowse.tsx must not be part of this task's diff (its props contract into TagRail is unchanged). If any diff appears, revert it with `git checkout -- apps/patron/src/components/RecipeBrowse.tsx` since that file is out of scope for this quick task. Then run the full Patron test suite (not just TagRail) and the production build to confirm nothing else in the app regressed from the TagRail/TagSubmenu changes — in particular RecipeBrowse.test.tsx and RecipeDetail.test.tsx, which exercise TagRail indirectly.</action>
  <verify>
    <automated>git diff --stat apps/patron/src/components/RecipeBrowse.tsx | wc -l | grep -qx 0 && pnpm --filter patron test && pnpm --filter patron build</automated>
  </verify>
  <done>`git diff --stat` on RecipeBrowse.tsx produces no output, `pnpm --filter patron test` passes in full (every suite, not just TagRail), and `pnpm --filter patron build` completes cleanly (tsc --noEmit + vite build, no errors).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Patron kiosk UI (client-only) | Purely presentational/interaction change; no new data flow, no new network call, no new input crossing a trust boundary — flyouts only mutate existing client-side state (`openFlyoutId` local to TagRail, and the pre-existing `showAvailableOnly` boolean in RecipeBrowse via the unchanged `onToggleAvailableOnly` callback). |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-260817hpy-01 | Denial of Service | document mousedown/keydown listeners (outside-click + Escape close) | low | accept | Listener pair is scoped to `openFlyoutId !== undefined` via the `useEffect` dependency array and removed in cleanup on every close/unmount — no listener leak across renders; each is a single cheap containment/key check, negligible cost even under rapid open/close cycling. |
| T-quick-260817hpy-02 | Tampering | N/A | low | accept | No new npm dependency installed (lucide-react's `Settings` icon already present in the existing dependency tree) — no new supply-chain surface introduced by this task. |

No new external input, no new npm dependency, no new server/API surface — this task is a self-contained client-side rendering/interaction change with no meaningful new attack surface. Full STRIDE walkthrough is not warranted beyond the two low-severity items above.
</threat_model>

<verification>
1. `pnpm --filter patron test -- TagRail` after Task 1 and again after Task 2 — TagRail.test.tsx green at each step (Nyquist: every task's automated verify is a real, currently-runnable command against the existing Vitest suite).
2. `pnpm --filter patron test` (Task 3) — full Patron suite green, including RecipeBrowse.test.tsx and RecipeDetail.test.tsx, which render TagRail indirectly and would fail on any prop-contract break.
3. `pnpm --filter patron build` (Task 3) — clean TypeScript + Vite build, confirming no type errors from removed `Eye`/`EyeOff` imports, new `Settings`/`useEffect`/`useRef` imports, or the `openFlyoutId: string | undefined` typing.
4. `git diff --stat apps/patron/src/components/RecipeBrowse.tsx` (Task 3) — empty, confirming the explicit "RecipeBrowse.tsx not modified" constraint.
5. Manual sanity (optional, not blocking): tag-group flyouts open beside their button without growing the rail column; only one flyout is ever open; a group's icon stays filled/glowing after its flyout closes as long as its tag is the active filter; the gear button opens a Settings flyout with a working "Show all recipes" checkbox in the same rail position the old Eye/EyeOff button occupied.
</verification>

<success_criteria>
- TagRail.tsx no longer imports or renders `Eye`/`EyeOff`, `expandedGroupId`, or the old `aria-label="Availability filter"` button.
- TagRail.tsx renders exactly one `openFlyoutId` state value gating which single flyout (a tag group's or `'settings'`) is open at a time, for both tag-group triggers and the new Settings gear trigger.
- Every open flyout is absolutely positioned (`absolute left-full ...`) beside its trigger button and never changes the rail's own width.
- A tag-group button's filled/selected visual state (and `aria-pressed`) reflects `selectedTagId` membership in that group independent of that group's own flyout open/closed state.
- The Settings gear button opens a flyout with a "Show all recipes" checkbox wired to `!showAvailableOnly` / `onToggleAvailableOnly`, replacing the old two-state Eye/EyeOff toggle in the same rail position.
- Outside click, Escape, and opening a different flyout all close whatever flyout is currently open — verified by automated tests.
- `RecipeBrowse.tsx` has zero diff.
- No new npm dependency added (`lucide-react`'s `Settings` already present).
- `pnpm --filter patron test` and `pnpm --filter patron build` both pass.
</success_criteria>

<output>
Create `.planning/quick/260817-hpy-convert-patron-tag-submenus-and-settings/260817-hpy-SUMMARY.md` when done
</output>