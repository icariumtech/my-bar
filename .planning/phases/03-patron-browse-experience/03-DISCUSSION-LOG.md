# Phase 3: Patron Browse Experience - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-12
**Phase:** 3-Patron Browse Experience
**Areas discussed:** Category rail & tag taxonomy, Card & detail content, Makeable indicator design, Live sync behavior

---

## Category Rail & Tag Taxonomy

| Question | Options | Selected |
|---|---|---|
| What should the rail categorize drinks by? | New recipe-level category (owner-assigned) / Derived from primary spirit's ingredient category / You decide | Free text — owner wants multi-value tags across grouped rail submenus (e.g. Spirit → Whiskey, Type → Classics), illustrated with an Old Fashioned tagged Whiskey + Sweet + Classics |
| Fixed curated list or owner-managed like ingredient categories? | Fixed curated set, matching reference / Owner-managed, like ingredient categories | Fixed for now — "let's think of some really good defaults" |
| What are the top-level rail groups? | Spirit + Type (2 groups) / Spirit + Type + Flavor (3 groups) / You decide, I'll approve tag lists | You decide the groups, I'll approve tag lists |
| How does tapping a submenu tag filter browsing? | Single active filter at a time / Multi-select (AND across groups, OR within group) / You decide | Single active filter at a time |
| Proposed 4-group taxonomy (Spirit/Type/Season/Flavor with starter tags) | Approve as-is / Approve but trim groups / Different tags entirely | Approve as-is |

**User's choice:** 4 rail groups (Spirit/Type/Season/Flavor), single-active-filter browsing, fixed default taxonomy.
**Notes:** Follow-up (via the "more questions" check) — the owner does not want a rail submenu tag to appear if zero recipes currently carry it (e.g. no "Shots" recipes exist yet, so "Shots" shouldn't be tappable-into-empty). This must be computed live as recipes/tags are added.

---

## Card & Detail Content

| Question | Options | Selected |
|---|---|---|
| How should photos work this phase (no photo field, no library)? | Owner uploads photo per recipe / Placeholder only this phase, real upload later / You decide | Placeholder only this phase, real upload later |
| What should the detail screen show given no description/story field exists? | Add a free-text description field to recipes / Derive from existing fields only / You decide | Add a description field, filled out from Barback |
| What shows on the drink card (list view)? | Name + flavor tags + makeable indicator / Name + makeable only, tags on detail only / You decide | Name + tags + makeable + ingredients without amounts, "just like the one photo" |
| Ingredient list — flat names or grouped by role? | Flat list of ingredient names / Grouped/ordered by role | Flat list; only things with an amount print (no garnish/glassware) |
| Clarify "in place of photo, makeable indicator" | Detail screen hero slot / Both card and detail / Card only | Clarified: meant in place of **price** (not photo) on both card and detail — photo placeholder stays, price slot becomes the makeable badge |

**User's choice:** Card shows name/tags/makeable badge (in the price slot)/ingredients without amounts. Detail adds a description/story section (rendered only if non-empty) and keeps a placeholder photo slot separate from the makeable badge.
**Notes:** Detail screen layout modeled directly on the reference photo: name → tags → ingredients → story-if-present.

---

## Makeable Indicator Design

| Question | Options | Selected |
|---|---|---|
| Reuse Barback's tri-state (green/yellow/red) or collapse to 2-state? | Reuse tri-state / Collapse to 2-state (makeable/not) | Collapse to 2-state — substitution judgment belongs to the bartender, not the patron |
| Where does missing-ingredient detail (PATR-04) show? | Detail screen only / Both card and detail | Detail screen only |
| Visual treatment for the indicator | Colored badge/pill / Card dimming + badge / You decide | Card dimming + badge (both together) |
| Should not-makeable drinks stay visible/tappable? | Always visible, tappable, clearly marked / Visible with a hide-toggle | Always visible, tappable, clearly marked |

**User's choice:** 2-state model, dimming + badge visual, missing-ingredients on detail only, no hide/filter toggle.
**Notes:** Yellow (substitution-available) collapses into "not-makeable" for guests.

---

## Live Sync Behavior

| Question | Options | Selected |
|---|---|---|
| How should a live status change appear to the patron? | Silent update / Brief pulse/flash on the changed card / You decide | Silent update |
| Does an open detail screen also update live, or only the grid? | Detail screen updates live too / Grid only, detail is a snapshot | Detail screen updates live too |

**User's choice:** Silent in-place updates on both the browse grid and any open detail screen.
**Notes:** None beyond the selections.

---

## Claude's Discretion

- Rail group icon choices (Spirit/Type/Season/Flavor) and their sub-tag glyphs — follow reference photo's line-icon style; specific glyphs deferred to UI-phase.
- Grid layout proportions (columns/spacing) for the card view.
- Detail hero-slot placeholder treatment (generic glass silhouette vs. solid block).
- Whether tags are a fixed enum or an owner-extensible table pre-seeded with defaults — technical detail for research/planning; UI-wise, no tag-management screens ship this phase (per D-35).

## Deferred Ideas

- Owner-managed tag CRUD (add/rename/delete tags/groups) — deferred past the fixed-taxonomy-for-now decision.
- Real recipe photo upload / AI photo-import — already an Active PROJECT.md requirement, explicitly deferred past this phase.
- Multi-select/AND-across-groups tag filtering — deferred past the single-active-filter decision.
