---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 4
current_phase_name: Bartender Console & Order Workflow
status: planning
stopped_at: "Completed quick task 260817-o11: Add ingredient delete (DELETE /api/ingredients/:id, useDeleteIngredient, Delete button on IngredientRow)"
last_updated: "2026-08-17T22:35:00.000Z"
last_activity: 2026-08-17
last_activity_desc: "Completed quick task 260817-o11: Add ingredient delete (DELETE /api/ingredients/:id, useDeleteIngredient, Delete button on IngredientRow)"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 26
  completed_plans: 26
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-11)

**Core value:** The inventory must be the single source of truth: at any moment, the Patron and Bartender screens must correctly show which drinks are makeable right now, and which are missing ingredients.
**Current focus:** Phase 3 — patron-browse-experience

## Current Position

Phase: 4 — Bartender Console & Order Workflow
Plan: Not started
Status: Ready to plan
Last activity: 2026-08-17 - Completed quick task 260817-hpy: Convert Patron tag submenus and settings to flyout popovers with persistent selection highlight

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 26
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 6 | - | - |
| 02 | 8 | - | - |
| 02.1 | 7 | - | - |
| 3 | 5 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02 P01 | 8min | 2 tasks | 9 files |
| Phase 02 P02 | 12min | 2 tasks | 4 files |
| Phase 02 P03 | 5min | 2 tasks | 5 files |
| Phase 02 P04 | 3min | 2 tasks | 3 files |
| Phase 02 P05 | 4min | 2 tasks | 8 files |
| Phase 02 P06 | 6min | 2 tasks | 4 files |
| Phase 02 P07 | 35min | 3 tasks | 10 files |
| Phase 02 P08 | 8min | 2 tasks | 2 files |
| Phase 02.1 P06 | 22min | 3 tasks | 10 files |
| Phase 02.1 P07 | 12min | 2 tasks | 5 files |
| Phase quick P260817-k8o | 8min | 2 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Project mode is Vertical MVP — each phase delivers an end-to-end usable slice (e.g. Phase 2 pairs recipe creation with the makeable engine so results are immediately observable, rather than splitting "backend engine" and "UI" into separate phases)
- Roadmap: Phases sequenced Barback → Recipes/Makeable Engine → Patron Browse → Bartender/Ordering, matching real dependency order (inventory must exist before makeable computation; makeable computation must exist before Patron/Bartender can display it trustworthily; both screens must exist before the order workflow connects them)
- [Phase ?]: computeMakeable takes db as an explicit second parameter defaulting to the real client (corrects RESEARCH.md sketch) so injected test dbs are never bypassed
- [Phase ?]: missingCategoryNames added to the recipe response schema beyond RESEARCH.md's sketch so MATCH-02 is satisfiable without frontend cross-referencing two lists
- [Phase ?]: PATCH /api/recipes/:id checks recipe existence via a direct SELECT before calling loadRecipe, since loadRecipe (from 02-01) throws rather than returns undefined on a miss — preserves loadRecipe's contract for GET/POST while still producing a clean 404 for PATCH
- [Phase ?]: Split combined test file into two RED/GREEN cycles per task (02-03) so each task's test/feat commit pair is distinct in git log
- [Phase ?]: MakeableStatusBadge excludes missingCategoryNames prop — the longer 'Missing: [...]' sentence is reserved for 02-06's RecipeDetailView
- [Phase ?]: Gap closure 02-07: fixed UnitDropdown/GlasswareSelector to forward Form.Item's value/onChange (root cause of G-02-6 recipe-save failure); wired apiFetch's real error message into RecipeForm's Alert (Rule 2 deviation beyond Task 3's file scope)
- [Phase ?]: antd 6 Select test interaction pattern: click dropdown options via title attribute, not role=option (which is a virtualization-only accessibility mirror with no click handler)
- [Phase ?]: Gap closure 02-08 (G-02-9): useToggleStock and useUpdateIngredient now invalidate ['recipes'] in onSettled, mirroring useUpdateGlassware/useRenameCategory's cross-entity-invalidation pattern — fixes stale makeable badge after Barback stock changes
- [Phase ?]: [Phase 02.1-06]: form.setFieldValue() inside a Form.List row does NOT register a Field entity — composite-value pickers (IngredientPicker) need an invisible per-field Form.Item registration or their values are silently dropped from the submitted payload despite form.getFieldValue() reading them correctly
- [Phase ?]: [Phase 02.1-06]: BARBACK-02 deliberately left unmarked in REQUIREMENTS.md pending plan 02.1-07's RecipeDetailView full-screen conversion, which explicitly closes out the requirement
- [Phase ?]: [Phase 02.1-07]: RecipeDetailView converted from Modal to full-screen view (D-26) with per-line tri-state status dots and yellow-hint copy — closes MATCH-05's remaining UI surface and BARBACK-02 as the phase's final plan
- [Phase ?]: [Phase 02.1-07]: Added RecipesTab.test.tsx (not in plan's file list) as a Rule 3 fix — the plan's verify command had no matching test file to run since no container-tab test precedent existed in the codebase

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260810-g1w | Fix WR-01/WR-02 swipe-toggle race conditions in IngredientRow | 2026-08-10 | ec01784 | [260810-g1w-fix-wr-01-wr-02-swipe-toggle-race-condit](./quick/260810-g1w-fix-wr-01-wr-02-swipe-toggle-race-condit/) |
| 260810-hmh | Add setup.sh and start_server.sh scripts modeled on janus-console's pattern | 2026-08-10 | 5f111fa | [260810-hmh-add-setup-sh-and-start-server-sh-scripts](./quick/260810-hmh-add-setup-sh-and-start-server-sh-scripts/) |
| 260810-nth | Restyle swipe Undo control in IngredientRow.tsx: plain text, centered in reveal area | 2026-08-10 | 40a1216 | [260810-nth-restyle-swipe-undo-control-in-ingredient](./quick/260810-nth-restyle-swipe-undo-control-in-ingredient/) |
| 260812-drh | Fix Barback layout: BottomTabBar isn't visible on full-screen sub-views (sticky→fixed positioning) | 2026-08-12 | 7a1b178 | [260812-drh-fix-barback-layout-1-bottomtabbar-isn-t-](./quick/260812-drh-fix-barback-layout-1-bottomtabbar-isn-t-/) |
| 260812-e8j | Fix Barback top-section anchoring: bounded scroll container + sticky title/Add/search/filter header per tab | 2026-08-12 | b62b744 | [260812-e8j-fix-barback-top-section-anchoring-on-eac](./quick/260812-e8j-fix-barback-top-section-anchoring-on-eac/) |
| 260812-fpi | Barback UI polish: remove redundant tab titles, header gap, re-theme BottomTabBar with icons + color-based selection | 2026-08-12 | fa1bda4 | [260812-fpi-barback-ui-polish-1-add-a-small-gap-padd](./quick/260812-fpi-barback-ui-polish-1-add-a-small-gap-padd/) |
| 260812-gcp | Barback UI polish round 2: vertically center BottomTabBar content, increase sticky header top padding | 2026-08-12 | 4a4415c | [260812-gcp-barback-ui-polish-round-2-based-on-user-](./quick/260812-gcp-barback-ui-polish-round-2-based-on-user-/) |
| 260812-j0q | Fix safe-area-inset-top CSS cascade-layer bug that silently zeroed the sticky header's top padding | 2026-08-12 | e6cd035 | [260812-j0q-fix-css-specificity-bug-in-apps-barback-](./quick/260812-j0q-fix-css-specificity-bug-in-apps-barback-/) |
| 260812-jz9 | Replace full-width Add Ingredient/Add Recipe button with a square icon-only button beside the search bar | 2026-08-12 | 5ded93e | [260812-jz9-barback-ui-change-replace-the-full-width](./quick/260812-jz9-barback-ui-change-replace-the-full-width/) |
| 260812-m0i | Extract shared FullScreenHeader: centered titles + circular green back button across all 5 full-screen views | 2026-08-12 | a193d4c | [260812-m0i-barback-full-screen-view-headers-fix-two](./quick/260812-m0i-barback-full-screen-view-headers-fix-two/) |
| 260813-ea3 | Restyle Patron app to match neon-glow dark-bar-menu reference screenshots | 2026-08-13 | 6554942 | [260813-ea3-restyle-patron-app-to-match-neon-glow-da](./quick/260813-ea3-restyle-patron-app-to-match-neon-glow-da/) |
| 260817-fkv | Convert Patron browse grid to continuous list layout matching reference screenshots | 2026-08-17 | a1cea8d | [260817-fkv-convert-patron-browse-grid-to-continuous](./quick/260817-fkv-convert-patron-browse-grid-to-continuous/) |
| 13 | Make Patron TagRail stretch to full screen height, icons stay top-anchored | 2026-08-17 | 72af407 | — |
| 14 | Add bright glowing divider between Patron recipe rows | 2026-08-17 | 3b44a95 | — |
| 15 | Remove Patron name-row divider line; fade row divider at left/right edges | 2026-08-17 | 9936c37 | — |
| 260817-g39 | Remove makeable badge and add availability toggle to Patron rail | 2026-08-17 | bab1d3a | [260817-g39-remove-available-not-available-badge-eve](./quick/260817-g39-remove-available-not-available-badge-eve/) |
| 260817-hpy | Convert Patron tag submenus and settings to flyout popovers with persistent selection highlight | 2026-08-17 | d2a1c52 | [260817-hpy-convert-patron-tag-submenus-and-settings](./quick/260817-hpy-convert-patron-tag-submenus-and-settings/) |
| 18 | Close tag flyout on selection; remove settings button label and flyout heading | 2026-08-17 | 7c7c1f6 | — |
| 19 | Fix IngredientPicker.tsx: filter categoryOptions/ingredientOptions by typed search text (recipe ingredient combobox now search-as-you-type like CategoryPicker/GlasswarePicker) | 2026-08-17 | 80c0fa2 | — |
| 260817-l46 | Add inline "+ Add new category" option to IngredientPicker's top-level recipe ingredient-line search, alongside the existing create-new-ingredient option | 2026-08-17 | 26d4a1e | [260817-l46-add-inline-create-new-category-option-to](./quick/260817-l46-add-inline-create-new-category-option-to/) |
| 260817-o11 | Add ingredient delete: DELETE /api/ingredients/:id endpoint, useDeleteIngredient hook, and a Delete button on IngredientRow mirroring the existing recipe-delete pattern | 2026-08-17 | f4a051c | [260817-o11-add-ingredient-delete-delete-api-ingredi](./quick/260817-o11-add-ingredient-delete-delete-api-ingredi/) |

### Roadmap Evolution

- Phase 02.1 inserted after Phase 2: Recipe UI cleanup (URGENT)

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-17T22:35:00.000Z
Stopped at: Completed quick task 260817-o11: Add ingredient delete (DELETE /api/ingredients/:id, useDeleteIngredient, Delete button on IngredientRow)
Resume file: None
