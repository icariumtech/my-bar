---
phase: 02
slug: recipe-collection-makeable-engine
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-11
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Owner-entered form values (RecipeForm/GlasswareManager) → POST/PATCH /api/recipes, /api/glassware | Barback UI submits recipe/glassware data across the browser→server boundary | Recipe/ingredient/glassware fields; validated at the Fastify Zod boundary |
| apiFetch error body → RecipeForm/GlasswareManager Alert text | Server-authored validation error strings reach the browser verbatim (post-02-07 fix) | Zod/route validation messages only — never stack traces or internals |
| recipes/categories/glassware DELETE handlers → referential integrity | Delete requests checked against cross-table references before removal | Recipe/ingredient/glassware counts (non-sensitive, trusted-LAN-only) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Tampering | POST /api/recipes ingredient lines | high | mitigate | `categoryId`/`glasswareId` validated as `z.string().uuid()`; FK failures translated to fixed 400 | closed |
| T-02-02 | Denial of Service | POST /api/recipes body (name/method/garnish) | medium | mitigate | `.max()` bounds on all string fields | closed |
| T-02-03 | Information Disclosure | recipes.ts error handling | high | mitigate | FK/constraint errors translated to fixed `{error}` bodies; raw SQLite text never returned | closed |
| T-02-04 | Tampering | recipeIngredients.categoryId referential integrity | high | mitigate | DB-level `onDelete: 'restrict'` FK | closed |
| T-02-05 | Repudiation | computeMakeable() correctness under client-side override | high | mitigate | makeable/missing fields computed exclusively server-side; no client-writable field | closed |
| T-02-06 | Tampering | PATCH /api/recipes/:id ingredients replace | high | mitigate | `db.transaction()` wraps delete-then-reinsert | closed |
| T-02-07 | Tampering | DELETE /api/categories/:id vs. recipe references | high | mitigate | Pre-count + FK `onDelete: 'restrict'` backstop | closed |
| T-02-08 | Information Disclosure | PATCH /api/recipes/:id error handling | medium | mitigate | FK errors translated to fixed 400 | closed |
| T-02-09 | Repudiation | Repeated DELETE /api/recipes/:id | low | mitigate | Existence check before delete; repeat returns 404 not false-success 204 | closed |
| T-02-10 | Tampering | POST/PATCH /api/glassware name uniqueness | medium | mitigate | DB `UNIQUE` constraint, translated to fixed 409 | closed |
| T-02-11 | Tampering | DELETE /api/glassware/:id vs. recipe references | high | mitigate | Pre-count + race-condition re-count fallback on FK catch | closed |
| T-02-12 | Information Disclosure | glassware.ts error handling | medium | mitigate | UNIQUE/FK errors translated to fixed 409/404 | closed |
| T-02-13 | Information Disclosure | Delete refusal rendering | low | accept | Recipe count in refusal message is non-sensitive, already visible to the same trusted-LAN owner | open — below high threshold (non-blocking) |
| T-02-14 | Tampering | RecipeRow delete confirmation | low | mitigate | `Modal.confirm` names the recipe before delete mutation fires | closed |
| T-02-15 | Spoofing | Client-rendered makeable badge | high | mitigate | Badge renders only the server-computed `makeable` boolean; no client recomputation | closed |
| T-02-16 | Spoofing | RecipeDetailView missing-ingredient rendering | high | mitigate | Renders `missingCategoryNames` verbatim, no client derivation | closed |
| T-02-17 | Tampering | RecipeForm submission of stale id on edit | low | accept | `recipe.id` read from server-sourced object; no client-writable id field | open — below high threshold (non-blocking) |
| T-02-18-SC | Tampering (supply chain) | 4 new dev-only test dependencies (testing-library/jsdom) | high | mitigate | Package-legitimacy gate + blocking-human checkpoint verified registry age/downloads/source-repo before install | closed |
| T-02-19 | Information Disclosure | apiFetch surfacing server's error field to browser | low | accept | Error string originates exclusively from server's own validation messages, never stack traces/internals | open — below high threshold (non-blocking) |
| T-02-20 | Tampering | UnitDropdown/GlasswareSelector reading a value prop from Form.Item | low | accept | Value only reaches these components via antd's own Form store, populated from fixed enum or fetched glassware list | open — below high threshold (non-blocking) |
| T-02-21 | Denial of Service | useToggleStock/useUpdateIngredient onSettled invalidating ['recipes'] | low | accept | At most one extra GET /api/recipes per stock toggle/edit — negligible at LAN-only scale | open — below high threshold (non-blocking) |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-13 | Delete-refusal recipe count is non-sensitive operational data already visible to the same trusted-LAN owner via the recipe list | gsd-security-auditor (Phase 2 audit) | 2026-08-11 |
| AR-02-02 | T-02-17 | `recipe.id` on edit submission is always read from the already-fetched, server-sourced object — no client-writable id field exists to tamper with | gsd-security-auditor (Phase 2 audit) | 2026-08-11 |
| AR-02-03 | T-02-19 | Server-authored error strings never contain stack traces, internals, or secrets — surfacing them fixes a UX bug without adding disclosure risk | gsd-security-auditor (Phase 2 audit) | 2026-08-11 |
| AR-02-04 | T-02-20 | Form.Item's injected `value` is always sourced from a fixed enum or the fetched glassware list — no new free-text input path | gsd-security-auditor (Phase 2 audit) | 2026-08-11 |
| AR-02-05 | T-02-21 | At most one extra `GET /api/recipes` per stock toggle — negligible at this app's single-digit-concurrent-client, LAN-only scale | gsd-security-auditor (Phase 2 audit) | 2026-08-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-11 | 21 | 16 | 5 (all below block_on threshold) | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-11
