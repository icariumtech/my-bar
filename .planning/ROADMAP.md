# Roadmap: My Bar

## Overview

My Bar ships as four vertical slices, each one a real, usable capability rather than an isolated technical layer. First the owner gets a trustworthy way to manage real inventory from their phone. Then recipes and the server-side makeable engine come online together, so the moment a recipe exists its makeable/not-makeable status is correct and live. That same live truth then surfaces on the Patron screen's full browse experience, and finally on the Bartender console — where the loop closes with real order submission flowing into a live ticket queue. By the end of Phase 4, all three interfaces agree on what's in stock and what's makeable, which is the project's core value.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Barback Inventory Foundation** - Owner can fully manage real bottle/ingredient inventory from their phone (completed 2026-08-10)
- [ ] **Phase 2: Recipe Collection & Makeable Engine** - Owner builds recipes; system computes correct, live makeable/not-makeable status
- [ ] **Phase 3: Patron Browse Experience** - Patron can browse the styled menu with a live, trustworthy makeable indicator
- [ ] **Phase 4: Bartender Console & Order Workflow** - Orders flow live from Patron to a working Bartender ticket queue

## Phase Details

### Phase 1: Barback Inventory Foundation

**Goal**: Owner can fully manage the bar's real inventory from their phone, with entries persisted to a live backend and reflected back immediately
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: INV-01, INV-02, INV-03, INV-04, INV-05
**Success Criteria** (what must be TRUE):

  1. Owner can add a new bottle/ingredient with name and category from their phone
  2. Owner can edit an existing ingredient's name or category
  3. Owner can toggle any ingredient in-stock/out-of-stock and see the change take effect immediately
  4. Owner can search or filter the inventory list by name or category to quickly find an item
  5. The inventory screen is comfortably usable one-handed on a phone (mobile-first responsive)

**Plans**: 6/6 plans executed

Plans:

- [x] 01-06-PLAN.md

- [x] 01-01-PLAN.md — Walking Skeleton: monorepo, SQLite-backed read path, dark antd Barback shell reachable from a phone
- [x] 01-02-PLAN.md — Add a bottle: create endpoints and the antd add form with inline category creation (INV-01)
- [x] 01-03-PLAN.md — Swipe to toggle stock, with a deferred commit and undo window (INV-03)
- [x] 01-04-PLAN.md — Edit a bottle and manage the category taxonomy, with a guarded delete (INV-02)
- [x] 01-05-PLAN.md — Search, category filtering, full state coverage, one-handed mobile layout (INV-04, INV-05)

**UI hint**: yes

### Phase 2: Recipe Collection & Makeable Engine

**Goal**: Owner can build a real recipe collection, and the system correctly and consistently determines whether each recipe is makeable from live inventory — the core trust guarantee, computed once, server-side
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: RECIPE-01, RECIPE-02, MATCH-01, MATCH-02, MATCH-03, MATCH-04
**Success Criteria** (what must be TRUE):

  1. Owner can create a new recipe with name, ingredients (quantity/unit and category reference), method, glassware, and garnish
  2. Owner can edit or delete an existing recipe
  3. Viewing any recipe on its screen shows a correct makeable/not-makeable status, computed once server-side from real current inventory — never guessed independently per screen
  4. For a not-makeable recipe, the missing ingredient(s) are shown exactly
  5. Recipes match against any in-stock bottle in the right category (e.g. any orange liqueur, not just one exact brand), and ingredient quantities display in normal units (oz/dash) without affecting the makeable check itself

**Plans**: 2/6 plans executed

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Tracer: recipe schema, shared contracts, makeable engine, GET/POST /api/recipes + DB push (RECIPE-01, MATCH-01–04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Recipe edit/delete + category delete-guard extension (RECIPE-02, D-21)
- [ ] 02-03-PLAN.md — Glassware CRUD backend with recipe-usage delete guard (D-17, D-22)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 02-04-PLAN.md — Glassware management UI (D-17, D-22)
- [ ] 02-05-PLAN.md — Recipe list + delete + form sub-components (ingredients/method/unit/glassware selector)

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 02-06-PLAN.md — Recipe create/edit form + detail view + Barback header wiring (D-14)

**UI hint**: yes

### Phase 3: Patron Browse Experience

**Goal**: A patron standing at the wall-mounted iPad can browse the full drink menu and trust what they see — makeable status always matches real inventory, live
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: PATR-01, PATR-02, PATR-03, PATR-04, PATR-06, SYNC-01
**Success Criteria** (what must be TRUE):

  1. Patron can browse drinks by category via an icon rail/tabs styled on the dark-neon reference design
  2. Patron can tap into a drink to see its detail screen (photo, description, flavor tags)
  3. Every drink card and detail view shows a clear makeable/not-makeable indicator
  4. For a not-makeable drink, the patron sees exactly which ingredient(s) are missing
  5. Patron can browse freely without being forced into an order, and when inventory changes on the Barback screen, the Patron screen's makeable status updates live without a manual refresh

**Plans**: TBD
**UI hint**: yes

### Phase 4: Bartender Console & Order Workflow

**Goal**: A patron can submit a real order that flows live into the bartender's queue, and the bartender can fulfill it using the same trusted recipe/inventory data, while the Patron screen behaves like an unattended kiosk
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: PATR-05, PATR-07, PATR-08, BART-01, BART-02, BART-03, BART-04, BART-05, BART-06, SYNC-02
**Success Criteria** (what must be TRUE):

  1. Patron can submit an order (with an optional "who's this for" note), and it appears immediately in the Bartender's live queue without a manual refresh — and status changes propagate live between the two screens
  2. Bartender can view full recipe detail and search/filter recipes by name or base spirit, seeing the same live makeable/not-makeable state as the Patron screen
  3. Bartender can move a ticket through new → in progress → done, with each ticket showing elapsed time since submission
  4. Patron screen runs in a kiosk-locked/fullscreen mode suited to an unauthenticated wall-mounted tablet, and returns to the browse/home view after a period of inactivity

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Barback Inventory Foundation | 6/6 | Complete    | 2026-08-10 |
| 2. Recipe Collection & Makeable Engine | 2/6 | In Progress|  |
| 3. Patron Browse Experience | 0/TBD | Not started | - |
| 4. Bartender Console & Order Workflow | 0/TBD | Not started | - |
