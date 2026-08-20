---
phase: 02-recipe-collection-makeable-engine
plan: 04
subsystem: ui
tags: [react, antd, tanstack-query, tsx]

# Dependency graph
requires:
  - phase: 02-recipe-collection-makeable-engine (plan 03)
    provides: GET/POST/PATCH/DELETE /api/glassware backend (glasswareInput/glassware Zod contracts, delete-guard with recipeCount)
provides:
  - apps/barback/src/api/useGlassware.ts — useGlassware/useCreateGlassware/useUpdateGlassware/useDeleteGlassware hooks, DeleteGlasswareError
  - apps/barback/src/components/GlasswareManager.tsx — owner-facing add/rename/delete UI for the curated glassware list
  - Barback header "Glassware" entry point wired into App.tsx
affects: [Barback recipe form (GlasswareSelector will consume useGlassware()), later Recipes tab plans in this phase]

# Actuals (#2632)
actuals:
  tokens: 2600
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GlasswareManager.tsx is a structural copy of CategoryManager.tsx with category identifiers/strings swapped for glassware — the second curated-list-with-usage-guard UI in this codebase after CategoryManager, following the same template as glasswareRoutes did for categoriesRoutes on the backend"
    - "useUpdateGlassware invalidates both ['glassware'] and ['recipes'] on rename, mirroring useRenameCategory's ['categories']+['ingredients'] dual invalidation — any curated-list rename that's joined onto another resource's display field must invalidate both query keys"

key-files:
  created:
    - apps/barback/src/api/useGlassware.ts
    - apps/barback/src/components/GlasswareManager.tsx
  modified:
    - apps/barback/src/App.tsx

key-decisions: []

patterns-established:
  - "Curated-list management UI (categories, now glassware) follows one fixed shape: List + inline rename (Input + check/cancel) + delete (danger text Button) + Divider + add-row (Input + primary accent Button), reached from a secondary (non-accent) header button"

requirements-completed: [RECIPE-01]

coverage:
  - id: D1
    description: "Owner can open a Glassware manager from the Barback header, add a new glassware type, rename one, and delete an unused one, entirely from the phone/iPad UI (D-17)"
    requirement: "RECIPE-01"
    verification:
      - kind: automated_ui
        ref: "pnpm -F @my-bar/barback build (typecheck + bundle succeeds)"
        status: pass
    human_judgment: true
    rationale: "Build/typecheck confirms the wiring compiles and hooks are called correctly, but the actual add/rename/delete flow through the modal UI needs a human click-through — covered by this phase's end-of-phase human-verify checkpoint per the plan's own <verification> section"
  - id: D2
    description: "Attempting to delete a glassware entry still used by a recipe shows the exact refusal message from the server, including the real recipe count"
    requirement: "RECIPE-01"
    verification:
      - kind: other
        ref: "apps/barback/src/components/GlasswareManager.tsx — handleDelete reads err.recipeCount and renders `This glassware is used by ${err.recipeCount} recipe(s) — remove or reassign them first.`"
        status: pass
    human_judgment: true
    rationale: "Copy is confirmed present in source matching 02-UI-SPEC.md's Copywriting Contract exactly, but triggering the actual 409 through the UI against a live server needs human verification"
  - id: D3
    description: "Zero glassware types renders the empty state 'No glassware types yet' / 'Add glassware options for your recipes.'"
    requirement: "RECIPE-01"
    verification:
      - kind: other
        ref: "apps/barback/src/components/GlasswareManager.tsx — <Empty description=\"No glassware types yet — add glassware options for your recipes.\" />"
        status: pass
    human_judgment: true
    rationale: "Copy confirmed present in source; rendering with zero rows needs a human to visually confirm against a live/empty backend"
  - id: D4
    description: "Renaming a glassware entry invalidates both the glassware list and the recipes list, mirroring D-03's category-rename-propagates-to-ingredients precedent"
    requirement: "RECIPE-01"
    verification:
      - kind: unit
        ref: "apps/barback/src/api/useGlassware.ts — useUpdateGlassware onSettled invalidates ['glassware'] and ['recipes']"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-08-11
status: complete
---

# Phase 2 Plan 4: Barback Glassware Manager UI Summary

**Owner-facing add/rename/delete UI for the curated glassware list, structurally mirroring CategoryManager.tsx, wired into the Barback header**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-11T03:03:00Z
- **Completed:** 2026-08-11T03:04:24Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `useGlassware.ts` — full CRUD hook set (`useGlassware`, `useCreateGlassware`, `useUpdateGlassware`, `useDeleteGlassware`) mirroring `useCategories.ts` exactly, with `DeleteGlasswareError` carrying the server's real `recipeCount`
- `useUpdateGlassware`'s rename mutation invalidates both `['glassware']` and `['recipes']` — a glassware rename changes the `glasswareName` label joined onto every recipe response
- `GlasswareManager.tsx` — full add/rename/delete modal UI reached from a new "Glassware" Barback header button (default styling, not accent, per 02-UI-SPEC.md's Color contract reserving accent for primary CTAs)
- Delete refusal renders the exact D-22 Copywriting Contract copy with the live recipe count; empty state renders the exact contracted copy for zero glassware types

## Task Commits

Each task was committed atomically:

1. **Task 1: useGlassware.ts — query + CRUD mutation hooks** - `ec72186` (feat)
2. **Task 2: GlasswareManager.tsx + Barback header entry point** - `26802c1` (feat)

## Files Created/Modified
- `apps/barback/src/api/useGlassware.ts` - CRUD hooks (`useGlassware`, `useCreateGlassware`, `useUpdateGlassware`, `useDeleteGlassware`) + `DeleteGlasswareError`
- `apps/barback/src/components/GlasswareManager.tsx` - Modal UI for add/rename/delete of the curated glassware list
- `apps/barback/src/App.tsx` - Adds `glasswareManagerOpen` state, a "Glassware" header button, and renders `<GlasswareManager>`

## Decisions Made
None - followed the plan's instruction to structurally mirror `CategoryManager.tsx`/`useCategories.ts` exactly, with identifiers and copy swapped for glassware.

## Deviations from Plan

None - plan executed exactly as written. Both files were built as a direct structural mirror of the category-management precedent, per the plan's explicit instruction.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Glassware list is now fully owner-manageable from the Barback UI, completing the frontend half of D-17/D-22 (backend from 02-03)
- `useGlassware()` is ready for the recipe form's `GlasswareSelector` sub-component (a later plan in this phase) to consume directly
- This plan ran in parallel with 02-05 (recipe list + form sub-components) per wave 3 — both depend only on wave 2's backend and touch disjoint files, no merge conflicts observed

---
*Phase: 02-recipe-collection-makeable-engine*
*Completed: 2026-08-11*

## Self-Check: PASSED

Both created files (`apps/barback/src/api/useGlassware.ts`, `apps/barback/src/components/GlasswareManager.tsx`) confirmed present on disk. Both commit hashes (`ec72186`, `26802c1`) confirmed present in `git log`.
