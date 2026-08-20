# Walking Skeleton — My Bar

**Phase:** 1
**Generated:** 2026-08-09

## Capability Proven End-to-End

> The smallest user-visible capability that exercises the full stack.

"The owner opens `http://<server-lan-ip>:3000/barback/` on their phone, adds a bottle with a name and a category, and sees it persist in the inventory list across a page refresh — served by the same Fastify process that owns the SQLite file."

This single path exercises: pnpm workspace resolution → shared Zod contract → React/antd form → TanStack Query mutation → Fastify route validation → Drizzle insert → better-sqlite3 write → Drizzle select → JSON response → list render.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Monorepo | pnpm workspaces: `apps/server`, `apps/barback`, `packages/shared` | One backend + N frontends (Patron and Bartender land in Phases 3-4). `packages/shared` is the compile-time guard against the three screens drifting on the ingredient/recipe data model. |
| Language | TypeScript pinned exact at `5.9.3` | `.claude/CLAUDE.md` locks "TypeScript 5.x". npm `latest` now resolves to the `7.x` native-compiler rewrite — an explicitly different risk surface. Pin exact, do not float. |
| Backend | Fastify 5.11.3 | ~3x Express throughput on a Pi-class device; one process serves API + WebSocket (Phase 3) + static SPA bundles. |
| Data layer | better-sqlite3 13.0.3 + Drizzle ORM 0.45.2 | Single-file DB, trivial backup (copy the file), zero extra resident process. WAL mode gives concurrent reads across all three future screens. |
| Schema migrations | `drizzle-kit push` for local dev; generated SQL under `apps/server/drizzle/` committed | Guarantees dev machine and eventual Pi deployment converge on one schema. |
| ID strategy | `text` primary keys holding `crypto.randomUUID()` | Client can construct an ID before the round-trip if optimistic inserts are ever needed; avoids integer-sequence collisions if the DB file is ever merged or seeded. |
| Frontend | Vite 8.2.1 + React 19.2.8, plain SPA (no SSR) | LAN-only kiosk app with no SEO or cold-load requirement. Avoids running a framework SSR runtime on the Pi. |
| Component library | Ant Design `antd` 6.5.4 + `@ant-design/icons` 6.3.2 | Per `01-UI-SPEC.md` (explicit user decision). Version raised from the UI-SPEC's "v5.x" to v6 because v6 is the React-19-native line — see "Version Deviation" below. |
| Styling | Tailwind CSS 4.3.3 via `@tailwindcss/vite`, CSS-first config | Custom swipe-row visuals and layout live in Tailwind; antd owns form/feedback components. No `tailwind.config.js`, no PostCSS config — v4 uses `@import "tailwindcss"` and `@theme`. |
| Client data cache | `@tanstack/react-query` 5.101.4 | REST is the single source of truth. Phase 3's Socket.IO events will carry no payload — they will only trigger a refetch. Establishing that discipline now prevents hand-rolled cache-sync divergence later. |
| Auth | None, by project constraint | LAN-only, trusted friends/family. `.claude/CLAUDE.md` "Access model". Revisit only if the server is ever exposed beyond the LAN. |
| Deployment target | `node apps/server/dist/index.js` bound to `0.0.0.0:3000`, documented local full-stack run command | Phase 1 proves LAN reachability from the owner's phone. systemd unit hardening is deferred until a Pi exists to host it. |
| Directory layout | Layer folders inside each app (`src/db`, `src/routes`, `src/components`, `src/api`) | Matches `01-RESEARCH.md`'s recommended structure; small enough at this scale that feature-folders would add ceremony without payoff. |

### Version Deviation from `01-UI-SPEC.md` (gated)

`01-UI-SPEC.md` names "Ant Design (antd) v5.x" and explicitly delegates the exact version to the planner via a live registry check. That check (2026-08-09) found:

- `antd@5` latest is `5.29.3`, peer `react >=16.9.0`, but the v5 line needs the `@ant-design/v5-patch-for-react-19` shim for `message`/`notification`/`Modal` static methods under React 19.
- `antd@6.5.4` is `latest`, peer `react >=18.0.0`, and per the official v6 migration guide **React 19 no longer needs the patch package**.

Since React `19.2.8` is a locked project constraint, v6 removes a compatibility shim rather than adding risk. `ConfigProvider` + `theme.darkAlgorithm` and all four UI-SPEC tokens (`colorBgLayout`, `colorBgContainer`, `colorPrimary`, `colorError`) are unchanged in v6. v6 renames some props the plans use — noted inline in `01-01-PLAN.md`.

This deviation is gated behind the blocking package-legitimacy checkpoint in `01-01-PLAN.md` Task 1, where the owner approves both the version line and the `antd` [SUS] registry verdict.

## Stack Touched in Phase 1

- [ ] Project scaffold — pnpm workspace, three packages, TypeScript project references, Vite build, Vitest runner
- [ ] Routing — `GET /api/ingredients`, `GET /api/categories` live; SPA served at `/barback/`
- [ ] Database — real read (`GET /api/ingredients` selects from SQLite) AND real write (`POST /api/ingredients` inserts)
- [ ] UI — antd form submits to the API and the list re-renders from server truth
- [ ] Deployment — `pnpm dev` runs the full stack; server binds `0.0.0.0` and is reachable from the owner's phone on the LAN

## Out of Scope (Deferred to Later Slices)

> Explicit so later phases do not re-litigate Phase 1's minimalism.

- Recipes, the makeable/not-makeable engine, and any category-to-recipe matching (Phase 2)
- Patron and Bartender screens, and the dark-neon guest-facing aesthetic (Phases 3-4)
- Socket.IO / any live cross-screen push — Phase 1 has only one screen, so there is nothing to sync with (SYNC-01 is Phase 3)
- AI features: recommendations, substitutions, recipe-image parsing (v2 — AI-01/02/03)
- Barcode scanning (v2 — SCAN-01/02)
- Flavor-profile data on ingredients (D-07, deferred)
- Fractional stock levels and shopping lists (STOCK-01/02, future)
- Authentication, TLS, reverse proxy — deliberately absent per project constraints
- systemd unit / Pi provisioning — no target hardware in this phase
- Server-side search endpoint — client-side filter is correct at ~50-100 rows
- Guided "reassign these N ingredients" category-delete flow — Phase 1 blocks the delete with a 409 and clear copy instead

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- **Phase 2:** Owner builds recipes and the server computes makeable/not-makeable from live inventory — adds `recipes` + `recipe_ingredients` tables and a `packages/shared` recipe contract; reuses the category FK established here as the matching key.
- **Phase 3:** Patron browses the styled menu with a live makeable indicator — adds `apps/patron`, and introduces Socket.IO as a payload-free "refetch now" signal on top of the REST-is-truth pattern established here.
- **Phase 4:** Bartender console and order workflow — adds `apps/bartender`, an `orders` table, and the ticket lifecycle.
