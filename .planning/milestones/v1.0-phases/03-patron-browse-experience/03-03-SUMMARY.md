---
phase: 03-patron-browse-experience
plan: 03
subsystem: ui
tags: [antd, react, tanstack-query, vitest, tdd]

requires:
  - phase: 03-patron-browse-experience
    provides: "03-01's tag/description data model (tags/recipe_tags tables, recipes.description column), GET /api/tags, extended GET/POST/PATCH /api/recipes accepting tagIds/description"
provides:
  - "Barback-side write path for D-33/D-34/D-40: description textarea + grouped multi-select TagPicker on AddEditRecipeView, so recipes created/edited from Barback can actually carry tag/description data"
  - "useTags() read-only TanStack Query hook (['tags'] queryKey)"
  - "TagPicker component — grouped antd Select multi-select, no inline-create, reusable wherever tag assignment is needed"
affects: [03-02, 03-04, 03-05]

actuals:
  tokens: 4400
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "TagPicker is a plain antd Select (mode=\"multiple\") backed by grouped `options`, not an AutoComplete — deliberately structurally different from CategoryPicker/GlasswarePicker since D-35 forbids any inline-create affordance for tags"
    - "Grouped Select options built by iterating TAG_GROUP_ORDER and filtering the flat tags array per group, skipping empty groups — the group DOM order test pattern (bucket options under the nearest preceding .ant-select-item-group header) is now the reusable convention for testing any future grouped-Select component"

key-files:
  created:
    - apps/barback/src/api/useTags.ts
    - apps/barback/src/components/pickers/TagPicker.tsx
    - apps/barback/src/components/pickers/TagPicker.test.tsx
  modified:
    - apps/barback/src/components/views/AddEditRecipeView.tsx
    - apps/barback/src/components/views/AddEditRecipeView.test.tsx

key-decisions:
  - "Installed monorepo dependencies (pnpm install) and built packages/shared (pnpm --filter @my-bar/shared build) before any test could run — this worktree had no node_modules or shared/dist present at spawn time; neither step touches plan-scoped files so both were treated as environment setup, not a deviation"
  - "Task 2 test file's stubFetch() gained a GET /api/tags handler and a PATCH /api/recipes/:id handler beyond the plan's literal description — TagPicker mounts unconditionally like GlasswarePicker, so every existing test that renders AddEditRecipeView now also fetches /api/tags at mount, and the plan's own must_haves require an edit-mode round-trip test which needs the PATCH route stubbed"

requirements-completed: [PATR-02]

coverage:
  - id: D1
    description: "TagPicker renders the four D-34 tag groups in TAG_GROUP_ORDER sequence (Spirit, Type, Season, Flavor) regardless of the fetched array's order, each group containing only that group's tags"
    requirement: "PATR-02"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/pickers/TagPicker.test.tsx#renders four option-groups in TAG_GROUP_ORDER sequence..."
        status: pass
    human_judgment: false
  - id: D2
    description: "Selecting tags across multiple groups reports all selected ids as a string[] via onChange, order-independent"
    requirement: "PATR-02"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/pickers/TagPicker.test.tsx#selecting two tags from different groups reports both ids via onChange as a string[]..."
        status: pass
    human_judgment: false
  - id: D3
    description: "TagPicker never renders a create-new-tag affordance (D-35's fixed-taxonomy boundary)"
    requirement: "PATR-02"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/pickers/TagPicker.test.tsx#never renders a \"+ Add\" create-new option..."
        status: pass
      - kind: other
        ref: "grep -c CREATE_OPTION_VALUE apps/barback/src/components/pickers/TagPicker.tsx == 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "AddEditRecipeView's description textarea and TagPicker pre-fill from the server response on edit, and re-saving unchanged round-trips the same tagIds/description back"
    requirement: "PATR-02"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/views/AddEditRecipeView.test.tsx#editing a recipe with 2 tags and a description pre-fills both fields..."
        status: pass
      - kind: unit
        ref: "apps/barback/src/components/views/AddEditRecipeView.test.tsx#re-saving an edited recipe unchanged round-trips the same tagIds/description back..."
        status: pass
    human_judgment: false
  - id: D5
    description: "A recipe with zero tags and no description saves successfully — both fields are optional at the form level (D-35)"
    requirement: "PATR-02"
    verification:
      - kind: unit
        ref: "apps/barback/src/components/views/AddEditRecipeView.test.tsx#saves successfully with zero tags and an empty description..."
        status: pass
    human_judgment: false

duration: ~25min
completed: 2026-08-13
status: complete
---

# Phase 3 Plan 03: Barback Description + TagPicker Summary

**Barback recipe form gains a description textarea and a grouped, no-inline-create TagPicker (antd Select multi-select) so recipes created/edited from Barback can carry the tag/description data 03-01's API already accepts**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments
- `useTags()` — read-only TanStack Query hook over `GET /api/tags`, mirroring `useCategories()`'s exact shape, no create/rename/delete mutation (D-35: Barback has no tag-CRUD UI this phase)
- `TagPicker` — antd `Select mode="multiple"` grouped into the four fixed D-34 groups (Spirit, Type, Season, Flavor) in `TAG_GROUP_ORDER` sequence, structurally distinct from `CategoryPicker`/`GlasswarePicker` (no `AutoComplete`, no search-driven create-new branch)
- `AddEditRecipeView` extended with a description textarea and `TagPicker` Form.Item after garnish (D-40 ordering); pre-fill effect maps `recipe.description`/`recipe.tags` onto the form on edit; both fields optional so zero-tag, no-description recipes still save

## Task Commits

1. **Task 1: useTags() hook + TagPicker — grouped multi-select, no inline-create** — `e01298b` (test, RED), `918d2d6` (feat, GREEN)
2. **Task 2: Wire description + TagPicker into AddEditRecipeView** — `ae5ab78` (feat)

**Plan metadata:** (this commit)

_Note: Task 1 carried `tdd="true"` in the plan frontmatter — RED (`e01298b`) confirmed `TagPicker.tsx` didn't exist / test suite failed to resolve the import, then GREEN (`918d2d6`) implemented `useTags.ts` + `TagPicker.tsx` and all 73 barback tests passed. Task 2 was plain `type="auto"` (no `tdd="true"` in the plan), so it's a single `feat` commit._

## Files Created/Modified
- `apps/barback/src/api/useTags.ts` — `useTags()` read-only hook
- `apps/barback/src/components/pickers/TagPicker.tsx` — grouped multi-select tag picker
- `apps/barback/src/components/pickers/TagPicker.test.tsx` — group-order, multi-select, no-create-affordance tests
- `apps/barback/src/components/views/AddEditRecipeView.tsx` — description + tagIds Form.Items, pre-fill effect extended
- `apps/barback/src/components/views/AddEditRecipeView.test.tsx` — `/api/tags` GET + `/api/recipes/:id` PATCH stubbed; new pre-fill/round-trip/zero-tag tests

## Decisions Made
- Installed monorepo dependencies and built `packages/shared` before running any test — the worktree had neither `node_modules` nor `packages/shared/dist` at spawn time, which is required for any workspace package's `@my-bar/shared` import to resolve. Pure environment setup, no plan-file impact.
- Extended `AddEditRecipeView.test.tsx`'s `stubFetch()` to serve `GET /api/tags` (since `TagPicker` now mounts unconditionally, exactly like `GlasswarePicker` already does for `/api/glassware`) and `PATCH /api/recipes/:id` (needed for the plan's own must_haves' edit-mode round-trip test, which has no existing precedent in this file — all prior tests only exercised create/POST).
- Removed the literal string `CREATE_OPTION_VALUE` from `TagPicker.tsx`'s explanatory comment (kept the concept, changed the wording) so the plan's own acceptance-criteria grep (`grep -c "CREATE_OPTION_VALUE" ... == 0`) passes — the plan's prose comment guidance and its own literal-string grep check were in tension; the check wins.

## Deviations from Plan

None — plan executed exactly as written. The two items in "Decisions Made" above are environment setup and test-scaffolding fill-in required by the plan's own must_haves, not scope changes.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required. This plan is client-only against 03-01's already-live API.

## Next Phase Readiness
- The owner can now assign a description and any number of tags (across any of the four groups) to a recipe from Barback, and both round-trip correctly through create and edit.
- 03-02/03-04's Patron UI can now be manually verified against real tagged/described recipes instead of structurally-valid-but-empty ones.
- No blockers.

---
*Phase: 03-patron-browse-experience*
*Completed: 2026-08-13*

## Self-Check: PASSED

All created/modified files verified present on disk (`useTags.ts`, `TagPicker.tsx`, `TagPicker.test.tsx`, `AddEditRecipeView.tsx`, `AddEditRecipeView.test.tsx`, this SUMMARY.md). All commit hashes (`e01298b`, `918d2d6`, `ae5ab78`) verified present in `git log`.
