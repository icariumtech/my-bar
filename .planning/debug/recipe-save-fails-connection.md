---
status: resolved
trigger: "DATA_START\nfail, when I try to save a recipe I get an error \"Couldn't save recipe - check your connection and try again.\"\nDATA_END"
created: 2026-08-11T00:00:00Z
updated: 2026-08-19T00:00:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "UnitDropdown.tsx renders `<Select>` but its component signature (`export function UnitDropdown()`) accepts zero props, so it never receives — and therefore never forwards — the `value`/`onChange` props that antd's Form.Item injects via cloneElement into its direct child. The unit Select visually shows a selection (rc-select manages its own internal uncontrolled display state) but the choice is never written back into the surrounding Form's data store. Every submitted ingredient line therefore has `unit: undefined`. The shared Zod contract's `unit: z.enum([...])` (required, non-optional) rejects this, so Fastify returns 400 on every POST/PATCH that includes an ingredient line — i.e. always, since recipeInput requires >=1 ingredient and every ingredient requires a unit."
  confirming_evidence:
    - "Direct curl POST to the running server with a fully realistic payload (valid name/ingredients/method/glasswareId/garnish) succeeds 201 — rules out server-side schema/FK/CORS/proxy defects for well-formed input."
    - "Curl POST omitting the `unit` key from the one ingredient line (all else identical/valid) reproduces the exact failure class: 400 Bad Request, `{\"error\":\"Bad Request\"}` — the same generic error shape apiFetch collapses into RecipeForm's static Alert text."
    - "Read-traced the actual data flow through @rc-component/form (antd 6's Form.Item/Field engine, installed in node_modules) — Form.Item passes `value`/`onChange` to its child via injected props; the child must destructure/use them. IngredientListForm's categoryId and quantity fields bind antd's built-in `<Select>`/`<Input>` DIRECTLY inside Form.Item (this works). UnitDropdown instead interposes a custom wrapper component with a no-args signature (`function UnitDropdown()`), silently discarding every prop Form.Item tries to inject — this is the one nested ingredient field that goes through a broken indirection layer instead of binding directly."
    - "GlasswareSelector.tsx has the structurally identical bug (destructures only `{ glassware }`, discards value/onChange) but glasswareId is optional and not part of the mandatory repro path, so it's a latent/secondary instance of the same pattern, not the trigger of this specific blocker."
  falsification_test: "If UnitDropdown correctly forwarded value/onChange (or if unit were submitted as the user-selected string), the curl-equivalent payload would be schema-valid and return 201, matching the payloads that already succeed. Confirmed by the omit-unit curl test returning exactly the same 400/generic-error class the user reports."
  fix_rationale: "N/A — find_root_cause_only mode, no fix applied. (For the follow-up planning step: the fix is in UnitDropdown — and separately GlasswareSelector — to accept and forward `value`/`onChange` props to the wrapped antd `<Select>`, matching the direct-binding pattern already used elsewhere in IngredientListForm/AddEditIngredientForm.)"
  blind_spots: "Did not reproduce via an actual browser/headless DOM (none available in this environment — no jsdom/testing-library installed, no browser binary present) — confirmed the data-binding defect by reading @rc-component/form's actual Field/Select-injection source rather than by executing it. Did not verify with 100% certainty what the real UAT tester's exact click sequence was (dev-proxy vs production build) — but showed both access paths behave identically for the server side, and the defect is purely client-side (React prop-forwarding), so it reproduces regardless of which path was used."
  candidate_causes:
    - "code: UnitDropdown.tsx doesn't forward Form.Item's injected value/onChange to the underlying antd Select (component prop-forwarding defect)"
    - "code (contributing, secondary): RecipeForm/apiFetch's generic error handling discards the server's actual `{error: string}` body and always shows the same static 'check your connection' Alert text regardless of cause — not itself the reason the save fails, but the reason the user-visible message misleadingly suggests a network/connection problem instead of a validation failure"
  and_gate: "No — a single root cause (UnitDropdown's broken prop-forwarding) fully and deterministically explains the 100%-reproducible failure on every recipe-creation attempt that includes a unit selection, which is unconditionally required by recipeInput's schema. The misleading error copy is a real, independently-worth-fixing issue but is not itself a necessary condition for the save to fail — it only affects what the user sees, not whether the request succeeds."

hypothesis: "CONFIRMED — UnitDropdown.tsx (apps/barback/src/components/UnitDropdown.tsx) never forwards Form.Item's injected value/onChange down to its wrapped antd <Select>, so every ingredient line's `unit` field submits as undefined, failing the required z.enum() validation server-side (400) on every recipe save attempt."
test: "curl POST /api/recipes with a realistic payload missing only the `unit` key on one ingredient line"
expecting: "400 Bad Request matching the generic error class RecipeForm's Alert always displays"
next_action: "DONE — return ROOT CAUSE FOUND to caller (goal: find_root_cause_only, no fix applied)"

## Symptoms

expected: From the Barback UI, create a recipe with name, ingredients, method, optional glassware, optional garnish. It appears in the list immediately after saving.
actual: RecipeForm submit fails with contracted Alert copy "Couldn't save recipe - check your connection and try again." — meaning mutation onError fired, not a JS crash.
errors: "Couldn't save recipe - check your connection and try again." (RecipeForm save-failure Alert copy)
reproduction: Open Barback app, click Recipes in header, click Add Recipe, fill name + >=1 ingredient (category/qty/unit) + >=1 method step, click Save.
started: Fresh feature, Phase 02, never previously working (discovered during manual UAT)

## Eliminated

- hypothesis: "Request/response Zod contract shape mismatch between RecipeForm's payload and packages/shared/src/recipe.ts (name/ingredients/method/glasswareId/garnish structure itself)"
  evidence: "Direct curl POST with a full realistic payload (name, one ingredient with categoryId/quantity/unit, method array, glasswareId, garnish) matching RecipeForm's exact submitted shape returned 201 Created with a correctly-serialized Recipe response."
  timestamp: 2026-08-11T15:31:21Z

- hypothesis: "CORS misconfiguration between Barback dev server (vite :5173) and API server (:3000)"
  evidence: "Tested the real vite dev proxy path directly (started `pnpm --filter barback dev`, POSTed through `http://localhost:5173/api/recipes`) — succeeded 201. Also confirmed CORS preflight OPTIONS on :3000 returns correct Access-Control-Allow-* headers for origin http://localhost:5173. Additionally: Categories/Glassware CRUD (POST/PATCH/DELETE) go through the identical apiFetch/CORS/proxy plumbing and pass their UAT tests (test 3) — ruling out any general network/CORS/proxy defect, since it would affect those flows identically."
  timestamp: 2026-08-11T15:33:44Z

- hypothesis: "Wrong API base URL / fetch client misconfiguration (dev vs production)"
  evidence: "apiFetch (apps/barback/src/api/client.ts) uses a same-origin relative path `/api${path}` in both dev (proxied by vite) and production (served same-origin by Fastify's @fastify/static under /barback/) — verified in both raw source and the actual built dist bundle (grep confirmed literal `fetch(\`/api${e}\`,...)`with no hardcoded host). Both access modes tested directly via curl and succeeded for well-formed payloads."
  timestamp: 2026-08-11T15:33:44Z

- hypothesis: "Stale build (barback dist and/or server dist compiled against an older/mismatched shared contract)"
  evidence: "Checked mtimes: packages/shared/src/recipe.ts (21:45) < packages/shared/dist/recipe.js (22:29, rebuilt) < apps/server/dist (22:02, wait — actually server dist 22:02 predates shared dist rebuild at 22:29; re-verified via direct curl against the actually-running process, which is authoritative over mtimes — 201 responses with correct current-contract shape (missingCategoryNames, glasswareName, etc. all present) confirm the live server IS running current-contract code, not stale."
  timestamp: 2026-08-11T15:31:21Z

- hypothesis: "glasswareId/garnish submitted as `null` (vs `undefined`) for untouched optional fields, failing Zod's `.optional()` (which rejects null, only accepts undefined/missing)"
  evidence: "Confirmed via curl that explicit `glasswareId: null` DOES cause 400 (a real, valid finding — see Evidence log) — but traced the actual antd 6 Form engine source (@rc-component/form's useForm.js/Field.js/valueUtil.js, installed in node_modules) end to end: resetFields() with no initialValues sets the store to `{}`; an untouched field's value resolves to JS `undefined`, and `JSON.stringify` drops keys whose value is `undefined` entirely — so an untouched glasswareId/garnish is OMITTED from the request body, not sent as null. This eliminates null-optional-fields as the trigger for the mandatory (glassware/garnish-untouched) repro path, though the null-rejection behavior itself is real and worth noting for whenever glasswareId's clear behavior is exercised."
  timestamp: 2026-08-11T15:41:00Z

## Evidence

- timestamp: 2026-08-11T15:31:21Z
  checked: "Direct curl POST http://localhost:3000/api/recipes with realistic full payload (name/ingredients/method/glasswareId/garnish) against the actual running dev server (production build, `node dist/index.js`)"
  found: "201 Created, correct Recipe response shape"
  implication: "Server-side schema, FK validation, and same-origin production static-serving all function correctly for well-formed input — the bug is not in apps/server/src/routes/recipes.ts or the shared Zod contract's structure itself."

- timestamp: 2026-08-11T15:31:34Z
  checked: "OPTIONS preflight to /api/recipes with Origin: http://localhost:5173"
  found: "204 No Content, Access-Control-Allow-Origin/Methods/Headers all correct"
  implication: "CORS is correctly configured for the dev origin — not a preflight/CORS misconfiguration issue."

- timestamp: 2026-08-11T15:33:44Z
  checked: "Started the real `pnpm --filter barback dev` vite server and POSTed a realistic payload through its actual /api proxy (http://localhost:5173/api/recipes)"
  found: "201 Created — proxy forwards correctly end-to-end"
  implication: "The dev-mode vite proxy path (likely how Phase 02 UAT was actually run, per root package.json's `dev` script running server+barback concurrently) is not the source of the failure."

- timestamp: 2026-08-11T15:36:43Z
  checked: "curl POST with glasswareId: null and garnish: null explicitly in the body"
  found: "400 Bad Request, {\"error\":\"Bad Request\"}"
  implication: "Confirms Zod's `.optional()` (without `.nullable()`) rejects explicit null — a real, generically-applicable finding, but traced to NOT be what antd submits for untouched fields (see Eliminated) so not the trigger for the mandatory repro path."

- timestamp: 2026-08-11T15:41:00Z
  checked: "curl POST with the `unit` key omitted from the one ingredient line (categoryId + quantity present, unit absent) — all else a valid, realistic payload"
  found: "400 Bad Request, {\"error\":\"Bad Request\"}"
  implication: "Reproduces the exact failure class (generic 400, same error shape the frontend's apiFetch/RecipeForm Alert collapses into the static 'check your connection' message) purely from a missing/undefined `unit` value — matching what UnitDropdown's broken prop-forwarding would actually submit."

- timestamp: 2026-08-11T15:41:00Z
  checked: "apps/barback/src/components/UnitDropdown.tsx vs apps/barback/src/components/IngredientListForm.tsx (categoryId/quantity fields) vs apps/barback/src/components/AddEditIngredientForm.tsx (categoryId field) vs apps/barback/src/components/GlasswareSelector.tsx"
  found: "UnitDropdown's function signature (`export function UnitDropdown()`) accepts zero props and renders a bare `<Select placeholder=... options=... />` — it never receives, let alone forwards, the `value`/`onChange` that Form.Item injects into its direct child via cloneElement. Every OTHER working Select binding in this codebase (IngredientListForm's categoryId Select, AddEditIngredientForm's categoryId Select) places the antd `<Select>` DIRECTLY as Form.Item's child with no intermediate wrapper. GlasswareSelector has the identical structural defect (destructures only `{ glassware }`, drops value/onChange) but is optional so doesn't block the mandatory repro."
  implication: "This is the client-side root cause: UnitDropdown is a broken controlled-component wrapper. The unit Select visually appears to work (rc-select manages its own internal display state once clicked) but the selection is never written back into the Form's data store, so `unit` is always undefined at submit time for every ingredient line — which recipeInput requires (z.enum, non-optional) on the one ingredient recipeInput itself requires (.min(1))."

- timestamp: 2026-08-11T15:41:00Z
  checked: "@rc-component/form (antd 6's Form engine, node_modules/.pnpm/@rc-component+form@1.8.6/.../es/{Field.js,hooks/useForm.js,utils/valueUtil.js}) and @rc-component/util's set.js"
  found: "Field value injection into a child element happens via props Form.Item passes to whatever element is its direct child (cloneElement-based); getFieldsValue()/validateFields() read the internal `store` object built purely from what Field components report back via onChange — there is no independent DOM-reading fallback. An untouched/never-changed field's value stays exactly what was set by resetFields()/initialValues (undefined here, since RecipeForm passes no initialValues), and undefined-valued keys are dropped by JSON.stringify."
  implication: "Fully explains why the unit field is silently undefined at submit rather than throwing any client-side JS error — consistent with the task's framing that this is a genuine onError from a real (failed) network round-trip, not a JS crash."

## Resolution

root_cause: "apps/barback/src/components/UnitDropdown.tsx does not accept or forward the `value`/`onChange` props that antd's Form.Item injects into it — it renders a bare, prop-less `<Select>` instead of a controlled component wired to the surrounding Form. As a result every ingredient line's `unit` field is always submitted as `undefined` regardless of what the user visually picks in the dropdown. The shared Zod contract (packages/shared/src/recipe.ts: `recipeIngredientInput.unit: z.enum([...])`, required/non-optional) rejects this, so POST /api/recipes (and PATCH) returns 400 Bad Request on every recipe save that includes an ingredient line — which is unconditionally required (recipeInput.ingredients.min(1)), so the bug is 100% reproducible on every create attempt. Contributing/secondary: apps/barback/src/api/client.ts's apiFetch() discards the server's actual `{error: string}` response body on any non-2xx response and throws a generic Error, and RecipeForm.tsx's Alert always shows the same static 'Couldn't save recipe — check your connection and try again.' text regardless of the real cause — which is why a pure client-side data-binding bug surfaces to the user as a misleading connection-sounding error rather than a validation message. GlasswareSelector.tsx (apps/barback/src/components/GlasswareSelector.tsx) has the structurally identical value/onChange-forwarding defect, but since glasswareId is optional it does not block the minimal repro — it will surface as a second bug the moment someone tries to actually save a recipe WITH a glassware selected."
fix:
verification:
fix: "Fixed in commit 46f4cbf (plan 02-07): UnitDropdown and GlasswareSelector now accept and forward value/onChange props to the wrapped antd Select, matching the direct-binding pattern used elsewhere in IngredientListForm."
verification: "Verified live in apps/barback/src/components/UnitDropdown.tsx — `export function UnitDropdown({ value, onChange }: UnitDropdownProps)` forwards both props to the underlying Select."
files_changed: ["apps/barback/src/components/UnitDropdown.tsx", "apps/barback/src/components/GlasswareSelector.tsx"]
