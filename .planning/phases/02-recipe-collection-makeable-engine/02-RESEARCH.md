# Phase 2: Recipe Collection & Makeable Engine - Research

**Researched:** 2026-08-11
**Domain:** Recipe CRUD + category-based makeable matching logic
**Confidence:** HIGH

## Summary

Phase 2 builds on Phase 1's inventory foundation to add owner-managed recipes with server-side makeable computation. The core technical responsibility is implementing a presence-based, category-matched makeable engine that determines — once, server-side — whether a recipe can be made from current inventory.

**Primary recommendation:** Model recipes as an ordered sequence of ingredient lines (each tied to a category, not a specific bottle), compute makeable status server-side by counting in-stock ingredients per required category, and expose that status on all recipe list and detail views. Follow Phase 1's patterns exactly: Drizzle table with FK constraints, Zod schemas with Input/Full/Patch variants, Fastify routes with testable dependency injection, TanStack Query hooks.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-14:** Recipe CRUD lives in Barback app, Recipes tab — not a new standalone app
- **D-15:** Recipe list shows makeable/not-makeable status inline (badge per row), computed server-side
- **D-16:** Method stored as an ordered list of step strings, rendered as numbered list
- **D-17:** Glassware is a curated, owner-managed list (mirrors Phase 1's category model)
- **D-18:** Garnish is free text, does NOT reference inventory or affect makeable status
- **D-19:** Units chosen from fixed dropdown (oz, dash, splash, barspoon, muddled, part)
- **D-20:** No unit conversion — quantities + units stored and displayed exactly as entered
- **D-21:** Deleting a category is blocked if ANY ingredient OR ANY recipe references it
- **D-22:** Deleting glassware is blocked if ANY recipe references it

### Claude's Discretion
None — every gray area had an explicit user decision.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RECIPE-01 | Owner can create recipe with name, ingredients, method, glassware, garnish | Schema design, form components, API routes |
| RECIPE-02 | Owner can edit or delete existing recipe | PATCH/DELETE routes, form state handling |
| MATCH-01 | System computes makeable/not-makeable server-side from boolean ingredient presence | Makeable matching algorithm, query pattern |
| MATCH-02 | System exposes missing ingredient(s) for not-makeable recipes | Algorithm returns missing categoryIds, API response |
| MATCH-03 | Matching is category-based (any in-stock bottle in right category) | Query: group ingredients by categoryId, check presence |
| MATCH-04 | Quantities displayed in canonical units without affecting makeable check | Zod schema, dropdown enum, presence-only logic |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recipe CRUD | API / Backend | Browser | CRUD operations and persistence require server round-trip |
| Makeable matching | API / Backend | — | Computation depends on real-time inventory state; must be single source of truth |
| Recipe display (list/detail) | Browser / Frontend | — | UI rendering of server-provided data |
| Glassware management | API / Backend | Browser | Curated list CRUD, mirrors category pattern |
| Unit/category validation | API / Backend | Browser | Dropdown enums enforced at Fastify boundary via Zod |
| Ingredient quantity display | Browser / Frontend | API | Server provides data; browser formats for display |

## Standard Stack

### Core (Phase 2 Additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.45.2 | Type-safe SQL + migrations for recipes/glassware/recipe_ingredients tables | [VERIFIED: apps/server/package.json:15] Already used for Phase 1; same patterns apply |
| `better-sqlite3` | 13.0.3 | Embedded SQLite driver | [VERIFIED: apps/server/package.json:14] Already in use; Phase 2 schema adds three related tables to existing DB |
| `fastify` | 5.11.3 | HTTP server framework | [VERIFIED: apps/server/package.json:16] Already established; routes follow existing plugin pattern |
| `zod` | 4.4.3 | Runtime schema validation | [VERIFIED: apps/server/package.json:19] Already in use; define RecipeInput, Recipe, RecipePatch, GlasswareInput/Patch schemas |
| `@tanstack/react-query` | 5.101.4 | Client-side data fetching | [VERIFIED: apps/barback/package.json:7] Already established; write useRecipes, useCreateRecipe, useGlassware hooks following Phase 1 patterns |
| `antd` | 6.5.4 | React UI component library | [VERIFIED: apps/barback/package.json:8] Already in use with dark theme; RecipeList, RecipeForm, GlasswareManager follow antd patterns |
| `react` | 19.2.8 | UI library for Barback app | [VERIFIED: apps/barback/package.json:9] Already established |
| `tailwindcss` | 4.3.3 | Styling | [VERIFIED: apps/barback/package.json:12] Already in use; spacing scale inherited from Phase 1 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `drizzle-kit` | 0.31.10 | Schema migrations | [VERIFIED: apps/server/package.json (devDependencies):24] Used for `drizzle-kit push`; run after schema changes |
| `@fastify/type-provider-zod` | 1.0.0 | Zod integration for Fastify schema validation | [VERIFIED: apps/server/package.json:13] Already used; recipe routes use this for request/response schemas |
| `@ant-design/icons` | 6.3.2 | Icon set for buttons | [VERIFIED: apps/barback/package.json:6] Existing; use PlusOutlined, DeleteOutlined, EditOutlined for recipe CRUD affordances |
| `vitest` | 4.1.10 | Unit test framework | [VERIFIED: apps/server/package.json (devDependencies):28] Already established; test recipes routes + makeable algorithm |

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| drizzle-orm | npm | ~2.5 years (v0.45.2 released Jan 2025) | ~5M/week | github.com/drizzle-team/drizzle-orm | OK | Approved |
| better-sqlite3 | npm | ~4 years | ~500K/week | github.com/WiseLibs/better-sqlite3 | OK | Approved |
| fastify | npm | ~7 years | ~3M/week | github.com/fastify/fastify | OK | Approved |
| zod | npm | ~3 years (v4.4.3 released late 2024) | ~10M/week | github.com/colinhacks/zod | OK | Approved |
| @tanstack/react-query | npm | ~6 years (v5 released late 2024) | ~8M/week | github.com/TanStack/query | OK | Approved |
| antd | npm | ~7 years (v6 released 2024) | ~1M/week | github.com/ant-design/ant-design | OK | Approved |
| react | npm | ~9 years (v19 released late 2024) | ~20M/week | github.com/facebook/react | OK | Approved |
| tailwindcss | npm | ~8 years (v4 released early 2025) | ~8M/week | github.com/tailwindlabs/tailwindcss | OK | Approved |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*All packages verified against npm registry 2026-08-11.*

## Architecture Patterns

### System Data Flow Diagram

```
User (Barback)
    ↓
RecipeForm / RecipeList (React + antd)
    ↓
TanStack Query hooks (useRecipes, useCreateRecipe, etc.)
    ↓
apiFetch → /api/recipes (GET, POST, PATCH, DELETE)
    ↓
Fastify routes
    ↓
Makeable matching logic ← queries ingredients grouped by categoryId
    ↓
Drizzle ORM (better-sqlite3)
    ↓
SQLite: recipes, recipe_ingredients, categories, ingredients, glassware
```

### Database Schema (Phase 2 Additions)

**New tables:**

```typescript
// D-17: glassware list parallels categories (unique name, owner-managed, delete-guard)
export const glassware = sqliteTable('glassware', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
})

// Recipes: name, method (ordered steps), glassware reference, garnish (free text)
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  method: text('method').notNull(), // JSON array of step strings: ["Step 1", "Step 2", ...]
  glasswareId: text('glassware_id')
    .references(() => glassware.id, { onDelete: 'set null' }),
  garnish: text('garnish'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// D-16/D-19/D-20: join table tying recipe lines to categories with quantity + unit
// No specific bottle reference — matching is category-based (D-03 pattern)
export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  quantity: text('quantity').notNull(), // "2", "1/2", "3.5" — stored as string for precision
  unit: text('unit').notNull(), // enum: 'oz', 'dash', 'splash', 'barspoon', 'muddled', 'part'
  displayOrder: integer('display_order').notNull(), // preserve ingredient list order
})
```

**Modified tables (Phase 1):**

```typescript
// D-21: categories table unchanged in structure, but delete logic now checks recipes too
// (see categoriesRoutes delete endpoint below)
export const categories = sqliteTable('categories', {
  // unchanged
})

// D-21: ingredient delete still restricted by FK (existing behavior)
export const ingredients = sqliteTable('ingredients', {
  // unchanged
})
```

### Recommended Project Structure

```
apps/server/src/
├── db/
│   ├── schema.ts                 # Add recipes, glassware, recipeIngredients tables
│   └── client.ts                 # unchanged
├── routes/
│   ├── recipes.ts                # NEW: GET /recipes, POST, PATCH/:id, DELETE/:id
│   ├── recipes.test.ts           # NEW: test recipes CRUD + makeable logic
│   ├── glassware.ts              # NEW: GET, POST, PATCH/:id, DELETE/:id (mirrors categories pattern)
│   ├── glassware.test.ts         # NEW: test glassware CRUD + delete-guard
│   ├── categories.ts             # MODIFIED: DELETE endpoint now checks recipeIngredients too
│   └── categories.test.ts        # MODIFIED: add test for category-referenced-by-recipe deletion
├── services/
│   └── makeableEngine.ts         # NEW: computeMakeable(recipeId): { makeable: boolean; missingCategoryIds: string[] }
├── index.ts                      # Register recipes and glassware routes

apps/barback/src/
├── components/
│   ├── RecipeList.tsx            # NEW: vertical list of recipes with makeable badges
│   ├── RecipeRow.tsx             # NEW: single recipe item (secondary surface, badges)
│   ├── RecipeDetailView.tsx      # NEW: full recipe display (method, glassware, garnish)
│   ├── RecipeForm.tsx            # NEW: create/edit form with sub-components
│   ├── IngredientListForm.tsx    # NEW: form sub-component for adding recipe ingredient lines
│   ├── MethodStepList.tsx        # NEW: form sub-component for method steps
│   ├── GlasswareManager.tsx      # NEW: list manager (mirrors CategoryManager)
│   ├── GlasswareSelector.tsx     # NEW: dropdown for selecting glassware in recipe form
│   ├── UnitDropdown.tsx          # NEW: fixed-option dropdown for units
│   └── MakeableStatusBadge.tsx   # NEW: status pill/badge component
├── api/
│   ├── useRecipes.ts             # NEW: useRecipes(), useCreateRecipe(), useUpdateRecipe(), useDeleteRecipe()
│   ├── useGlassware.ts           # NEW: useGlassware(), useCreateGlassware(), etc.
│   └── client.ts                 # unchanged
├── App.tsx                       # MODIFIED: add "Recipes" tab navigation

packages/shared/src/
├── recipe.ts                     # NEW: RecipeInput, Recipe, RecipePatch schemas
├── glassware.ts                  # NEW: GlasswareInput, Glassware schemas
├── index.ts                      # Export new schemas
```

### Pattern 1: Makeable Matching (Server-Side)

**What:** Presence-based, category-matched algorithm that determines whether a recipe can be made from current inventory. Computed once server-side; never guessed per-screen.

**When to use:** On every recipe GET (list or detail); never in the browser.

**Implementation:**

```typescript
// apps/server/src/services/makeableEngine.ts
import { db } from '../db/client.js'
import { ingredients } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export interface MakeableResult {
  makeable: boolean
  missingCategoryIds: string[]
}

/**
 * MATCH-01/MATCH-03/MATCH-04: Compute whether a recipe is makeable from current inventory.
 * 
 * Presence-based: a recipe is makeable if every required category has ≥1 in-stock ingredient.
 * Category-based: matches against any in-stock bottle in the right category, not a specific brand.
 * Volume-agnostic: quantity/unit fields are display-only; makeable check ignores them.
 * 
 * Returns { makeable: true } or { makeable: false; missingCategoryIds: [...] } — 
 * MATCH-02 surface the missing categories to the user.
 */
export function computeMakeable(
  requiredCategoryIds: string[],
): MakeableResult {
  // Fetch all in-stock ingredients, grouped by categoryId
  const inStockByCategory = db
    .select({ categoryId: ingredients.categoryId })
    .from(ingredients)
    .where(eq(ingredients.inStock, true))
    .all()
    .reduce(
      (acc, row) => {
        if (!acc[row.categoryId]) acc[row.categoryId] = true
        return acc
      },
      {} as Record<string, boolean>,
    )

  // Check which required categories have no in-stock ingredient
  const missingCategoryIds = requiredCategoryIds.filter(
    (catId) => !inStockByCategory[catId],
  )

  return {
    makeable: missingCategoryIds.length === 0,
    missingCategoryIds,
  }
}
```

**Example:** Recipe needs "Dry Gin" (categoryId: cat-1) and "Lime Juice" (categoryId: cat-2).
- If inventory has Bombay Sapphire (in-stock, cat-1) and Fresh Lime Juice (in-stock, cat-2): `{ makeable: true, missingCategoryIds: [] }`
- If inventory has no in-stock gin: `{ makeable: false, missingCategoryIds: ['cat-1'] }`

### Pattern 2: Zod Schema — Recipe Types

**What:** Input, full response, and patch schemas following Phase 1's pattern.

**Location:** `packages/shared/src/recipe.ts`

```typescript
import { z } from 'zod'

// D-16: method stored as array of step strings, not single block
export const recipeInput = z.object({
  name: z.string().trim().min(1).max(200), // T-01-02: DoS mitigation
  ingredients: z.array(
    z.object({
      categoryId: z.string().uuid(),
      quantity: z.string().trim().min(1).max(20), // "2", "1/2", "3.5"
      unit: z.enum(['oz', 'dash', 'splash', 'barspoon', 'muddled', 'part']), // D-19
    }),
  ).min(1), // Every recipe must have ≥1 ingredient for makeable check
  method: z.array(z.string().trim().min(1).max(500)).min(1), // Ordered steps
  glasswareId: z.string().uuid().optional(),
  garnish: z.string().max(200).optional(), // D-18: free text, no validation against inventory
})
export type RecipeInput = z.infer<typeof recipeInput>

// Full recipe response: includes computed makeable status + joined display fields (category/glassware names)
export const recipe = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ingredients: z.array(
    z.object({
      id: z.string().uuid(),
      categoryId: z.string().uuid(),
      categoryName: z.string(), // Joined from categories table
      quantity: z.string(),
      unit: z.string(),
      displayOrder: z.number(),
    }),
  ),
  method: z.array(z.string()), // Returned as array, not re-stringified
  glasswareId: z.string().uuid().nullable(),
  glasswareName: z.string().nullable(), // Joined from glassware table
  garnish: z.string().nullable(),
  makeable: z.boolean(), // MATCH-01: computed server-side
  missingCategoryIds: z.array(z.string().uuid()), // MATCH-02: empty if makeable
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Recipe = z.infer<typeof recipe>

// D-16: patch schema for edit; only touched fields needed
export const recipePatch = recipeInput.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided' },
)
export type RecipePatch = z.infer<typeof recipePatch>
```

### Pattern 3: Fastify Routes — Recipes CRUD

**What:** Recipe API endpoints following Phase 1's plugin + injectable-db pattern.

**Location:** `apps/server/src/routes/recipes.ts`

```typescript
import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { recipe, recipeInput, recipePatch } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { recipes, recipeIngredients, categories, glassware, ingredients } from '../db/schema.js'
import { computeMakeable } from '../services/makeableEngine.js'

interface RecipesRoutesOptions extends FastifyPluginOptions {
  db?: typeof defaultDb
}

export const recipesRoutes: FastifyPluginAsync<RecipesRoutesOptions> = async (
  app,
  opts,
) => {
  const db = opts.db ?? defaultDb

  // RECIPE-01/MATCH-01/MATCH-03: GET /recipes — list with computed makeable status
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: {
          200: z.array(recipe),
        },
      },
    },
    async () => {
      // Fetch all recipes with joined ingredient + glassware details
      const allRecipes = db
        .select({
          id: recipes.id,
          name: recipes.name,
          method: recipes.method,
          glasswareId: recipes.glasswareId,
          glasswareName: glassware.name,
          garnish: recipes.garnish,
          createdAt: recipes.createdAt,
          updatedAt: recipes.updatedAt,
        })
        .from(recipes)
        .leftJoin(glassware, eq(recipes.glasswareId, glassware.id))
        .orderBy(asc(recipes.name))
        .all()

      // For each recipe, fetch its ingredients and compute makeable status
      return allRecipes.map((r) => {
        const recipeIngredientRows = db
          .select({
            id: recipeIngredients.id,
            categoryId: recipeIngredients.categoryId,
            categoryName: categories.name,
            quantity: recipeIngredients.quantity,
            unit: recipeIngredients.unit,
            displayOrder: recipeIngredients.displayOrder,
          })
          .from(recipeIngredients)
          .innerJoin(categories, eq(recipeIngredients.categoryId, categories.id))
          .where(eq(recipeIngredients.recipeId, r.id))
          .orderBy(asc(recipeIngredients.displayOrder))
          .all()

        const requiredCategoryIds = recipeIngredientRows.map((ri) => ri.categoryId)
        const { makeable, missingCategoryIds } = computeMakeable(requiredCategoryIds)

        return {
          ...r,
          ingredients: recipeIngredientRows,
          method: JSON.parse(r.method),
          makeable,
          missingCategoryIds,
        }
      })
    },
  )

  // RECIPE-01: POST /recipes — create new recipe
  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      schema: {
        body: recipeInput,
        response: {
          201: recipe,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const recipeId = crypto.randomUUID()
      const now = new Date()

      try {
        // Insert recipe record
        db.insert(recipes)
          .values({
            id: recipeId,
            name: request.body.name,
            method: JSON.stringify(request.body.method),
            glasswareId: request.body.glasswareId ?? null,
            garnish: request.body.garnish ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .run()

        // Insert ingredient lines with displayOrder to preserve sequence
        request.body.ingredients.forEach((ing, idx) => {
          db.insert(recipeIngredients)
            .values({
              id: crypto.randomUUID(),
              recipeId,
              categoryId: ing.categoryId,
              quantity: ing.quantity,
              unit: ing.unit,
              displayOrder: idx,
            })
            .run()
        })
      } catch (err) {
        // T-01-02: translate database errors to 400, never 500 with stack
        if (err instanceof Error) {
          return reply.status(400).send({ error: 'Failed to create recipe' })
        }
        throw err
      }

      // Return the newly created recipe with computed makeable status
      // (same logic as GET /recipes detail below)
      // ...
    },
  )

  // RECIPE-02: PATCH /recipes/:id — edit recipe
  // RECIPE-02: DELETE /recipes/:id — delete recipe (cascading delete via onDelete: 'cascade')
  // ...both follow same pattern as categories.ts
}
```

### Pattern 4: Glassware Routes (Mirrors Categories)

**What:** CRUD routes for the curated glassware list; includes delete-guard per D-22.

**Implementation:** Mirrors `categoriesRoutes` exactly:
- GET /api/glassware — list all
- POST /api/glassware — create (enforce unique name)
- PATCH /api/glassware/:id — rename (enforce unique name)
- DELETE /api/glassware/:id — refuse if any recipe references it (count + FK constraint)

**Delete guard message (D-22 copywriting contract):**
```
"This glassware is used by N recipe(s) — remove or reassign them first."
```

### Pattern 5: Updated Categories Delete (D-21)

**What:** Category deletion now checks both ingredients AND recipes; if either references the category, refuse with accurate count.

**Modification to `categoriesRoutes` DELETE handler:**

```typescript
const [{ ingredientCount }] = db
  .select({ ingredientCount: sql<number>`count(*)` })
  .from(ingredients)
  .where(eq(ingredients.categoryId, id))
  .all()

const [{ recipeIngredientCount }] = db
  .select({ recipeIngredientCount: sql<number>`count(*)` })
  .from(recipeIngredients)
  .where(eq(recipeIngredients.categoryId, id))
  .all()

const totalCount = ingredientCount + recipeIngredientCount
if (totalCount > 0) {
  return reply.status(409).send({
    error: `This category is used by ${ingredientCount} ingredient(s) and/or ${recipeIngredientCount} recipe(s) — reassign or remove them first.`,
    ingredientCount,
    recipeIngredientCount,
  })
}
```

**Updated copywriting (from 02-UI-SPEC.md):**
> "This category is used by N ingredient(s) and/or N recipe(s) — reassign or remove them first."

### Pattern 6: React Component — RecipeForm

**What:** Create/edit form with sub-components for ingredients and method steps.

**Location:** `apps/barback/src/components/RecipeForm.tsx`

```typescript
import { useState } from 'react'
import { Form, Input, Button, Modal, Alert } from 'antd'
import type { RecipeInput } from '@my-bar/shared'
import { IngredientListForm } from './IngredientListForm.js'
import { MethodStepList } from './MethodStepList.js'
import { GlasswareSelector } from './GlasswareSelector.js'
import { useCreateRecipe, useUpdateRecipe } from '../api/useRecipes.js'

interface RecipeFormProps {
  recipe?: Recipe // undefined = create mode
  open: boolean
  onClose: () => void
}

export function RecipeForm({ recipe, open, onClose }: RecipeFormProps) {
  const [form] = Form.useForm()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()

  async function onSubmit(values: RecipeInput) {
    try {
      if (recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, patch: values })
      } else {
        await createRecipe.mutateAsync(values)
      }
      form.resetFields()
      onClose()
    } catch (err) {
      // Form-level error alert via <Alert>
    }
  }

  return (
    <Modal
      title={recipe ? 'Edit Recipe' : 'Add Recipe'}
      open={open}
      onCancel={onClose}
      footer={null}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Form.Item label="Recipe Name" name="name" rules={[{ required: true }]}>
          <Input placeholder="e.g. Margarita" />
        </Form.Item>

        <Form.Item label="Ingredients" name="ingredients" rules={[{ required: true }]}>
          <IngredientListForm />
        </Form.Item>

        <Form.Item label="Method" name="method" rules={[{ required: true }]}>
          <MethodStepList />
        </Form.Item>

        <Form.Item label="Glassware" name="glasswareId">
          <GlasswareSelector />
        </Form.Item>

        <Form.Item label="Garnish" name="garnish">
          <Input.TextArea placeholder="e.g. Lime wheel, salt rim" />
        </Form.Item>

        <Button type="primary" htmlType="submit" style={{ minHeight: 48 }}>
          Save Recipe
        </Button>
      </Form>
    </Modal>
  )
}
```

### Anti-Patterns to Avoid

- **Computing makeable in the browser:** Recipe status would disagree across screens if inventory changes. Always compute server-side, return in API response.
- **Storing recipe ingredients as free text:** A misspelled category name breaks matching. Always reference categoryId (FK).
- **Allowing unit free-text input:** Typos (oz vs o.z. vs oz.) cause silently inconsistent recipe entries. Use fixed dropdown.
- **Not enforcing glassware deletion guard:** Orphaned recipe references + confusion about which glass to use. Always check recipe referrals before deleting.
- **Computing makeable per-screen independently:** The guaranteed inconsistency at the moment an ingredient goes out of stock. Single source of truth is non-negotiable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Makeable matching logic | In-component query + state machine | `computeMakeable(categoryIds)` helper, returned from API | Centralizing this one piece of business logic as a server-side service (not a utility, a service function) is the difference between "trustworthy at 11pm during a party" and "silently inconsistent when three screens disagree" |
| Category/glassware deletion validation | Manual refusal checks in the route | Database FK `onDelete: 'restrict'` constraint + pre-count message | The FK enforces the invariant; the count only builds the error message. Never rely on application code alone. |
| Form validation (units, categories) | Derived from ingredient data at runtime | Zod at the Fastify boundary (fixed enum for units, UUID for categoryId) | Validation at the boundary prevents invalid data from ever entering the database; errors are caught at parse time, not at display time on someone else's screen |
| Method step ordering | Manual index/order tracking in state | Explicit `displayOrder` field in recipeIngredients table (same pattern as ingredient rows) | Preserves list order across saves and across screens without race conditions |

**Key insight:** This phase is the first where "data must be trustworthy across multiple screens showing the same information at the same time." Centralizing computation server-side and enforcing schema integrity with database constraints is how you achieve that.

## Common Pitfalls

### Pitfall 1: Glassware Deletion Without Guard
**What goes wrong:** Owner deletes a glassware type that recipes still reference → recipes show `null` for glass or break entirely when trying to load.
**Why it happens:** D-22 requires explicit refusal logic, but it's easy to forget the count check or the copywriting in the delete route.
**How to avoid:** Copy the categories delete pattern exactly, including the FK constraint and the pre-delete count query.
**Warning signs:** Glassware count is N, but deletion endpoint doesn't query recipeIngredients; or deletion succeeds silently when recipes still reference it.

### Pitfall 2: Category Deletion With No Recipe Check
**What goes wrong:** Owner deletes a category that a recipe's ingredient lines reference → recipe becomes unmakeable and confusing because the ingredient line references a non-existent category.
**Why it happens:** Phase 1's delete-guard only checked ingredients; D-21 extends it to recipes, but if the count query forgets recipeIngredients, recipes silently break.
**How to avoid:** Update categoriesRoutes DELETE handler to count BOTH ingredients AND recipeIngredients.
**Warning signs:** recipeIngredients.categoryId has no FK constraint (it does via the schema), or the count query selects from ingredients only.

### Pitfall 3: Makeable Status Computed Per-Screen (Browser)
**What goes wrong:** At the moment an ingredient goes out of stock, Patron screen might briefly show "makeable" while Bartender screen (or vice versa) shows "not makeable" → owner hands out a drink they can't make.
**Why it happens:** Each browser independently queries the ingredient list and guesses makeable status; no server round-trip.
**How to avoid:** Compute makeable server-side once, include in the recipe response, never recompute in React.
**Warning signs:** makeable status is computed in a React component (e.g. `useMemo` over recipe + ingredients), or relies on stale query data, or is not part of the recipe API response.

### Pitfall 4: Method Steps Lose Order After Edit
**What goes wrong:** Owner edits a recipe; method steps are returned in a different order than they entered them.
**Why it happens:** Method stored as JSON array, but not using explicit displayOrder field; rendering order depends on DB iteration order (not guaranteed unless explicitly ordered).
**How to avoid:** Use explicit `displayOrder` integer field in recipeIngredients table (same pattern for method steps' order preservation).
**Warning signs:** No displayOrder column; or method steps don't have a table row each (they're in a JSON blob without row-level ordering).

### Pitfall 5: Unit Validation Not at Boundary
**What goes wrong:** Frontend form accepts "oz" and "OZ" and "oz." (free text); backend stores all three; recipe displays inconsistently on different screens.
**Why it happens:** Zod enum validation is only in the form's client-side validation (optional), not in the Fastify schema.
**How to avoid:** Put the unit enum in Zod `recipeInput`, not just the React input element.
**Warning signs:** No unit validation in the schema; or Zod schema accepts `z.string()` for unit instead of `z.enum([...])`.

## Code Examples

### Makeable Matching (Server-Side Service)

```typescript
// Source: Phase 2 RESEARCH.md, Pattern 1
import { db } from '../db/client.js'
import { ingredients } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export interface MakeableResult {
  makeable: boolean
  missingCategoryIds: string[]
}

export function computeMakeable(requiredCategoryIds: string[]): MakeableResult {
  const inStockByCategory = db
    .select({ categoryId: ingredients.categoryId })
    .from(ingredients)
    .where(eq(ingredients.inStock, true))
    .all()
    .reduce(
      (acc, row) => {
        if (!acc[row.categoryId]) acc[row.categoryId] = true
        return acc
      },
      {} as Record<string, boolean>,
    )

  const missingCategoryIds = requiredCategoryIds.filter(
    (catId) => !inStockByCategory[catId],
  )

  return {
    makeable: missingCategoryIds.length === 0,
    missingCategoryIds,
  }
}
```

### Recipe Zod Schema (Shared)

```typescript
// Source: Phase 2 RESEARCH.md, Pattern 2
import { z } from 'zod'

export const recipeInput = z.object({
  name: z.string().trim().min(1).max(200),
  ingredients: z.array(
    z.object({
      categoryId: z.string().uuid(),
      quantity: z.string().trim().min(1).max(20),
      unit: z.enum(['oz', 'dash', 'splash', 'barspoon', 'muddled', 'part']),
    }),
  ).min(1),
  method: z.array(z.string().trim().min(1).max(500)).min(1),
  glasswareId: z.string().uuid().optional(),
  garnish: z.string().max(200).optional(),
})
export type RecipeInput = z.infer<typeof recipeInput>

export const recipe = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ingredients: z.array(
    z.object({
      id: z.string().uuid(),
      categoryId: z.string().uuid(),
      categoryName: z.string(),
      quantity: z.string(),
      unit: z.string(),
      displayOrder: z.number(),
    }),
  ),
  method: z.array(z.string()),
  glasswareId: z.string().uuid().nullable(),
  glasswareName: z.string().nullable(),
  garnish: z.string().nullable(),
  makeable: z.boolean(),
  missingCategoryIds: z.array(z.string().uuid()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Recipe = z.infer<typeof recipe>
```

### TanStack Query Hook (Barback Client)

```typescript
// Source: Phase 2 RESEARCH.md; follows Phase 1 useIngredients pattern
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Recipe, RecipeInput, RecipePatch } from '@my-bar/shared'
import { apiFetch } from './client.js'

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<Recipe[]>('/recipes'),
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RecipeInput) =>
      apiFetch<Recipe>('/recipes', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RecipePatch }) =>
      apiFetch<Recipe>(`/recipes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (same as Phase 1) |
| Config file | apps/server/vitest.config.ts (inherited) |
| Quick run command | `pnpm -F @my-bar/server test` (unit tests in ~2 sec) |
| Full suite command | `pnpm test` (all apps + server, ~5 sec) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RECIPE-01 | POST /recipes creates recipe with name, ingredients, method, glassware, garnish | unit | `pnpm -F @my-bar/server test -- recipes.test.ts -t "POST.*creates"` | ❌ Wave 0 |
| RECIPE-02 | PATCH /recipes/:id edits recipe fields; DELETE /recipes/:id cascades delete to recipe_ingredients | unit | `pnpm -F @my-bar/server test -- recipes.test.ts -t "PATCH\|DELETE"` | ❌ Wave 0 |
| MATCH-01 | computeMakeable() returns makeable=true when all required categories have ≥1 in-stock ingredient | unit | `pnpm -F @my-bar/server test -- makeableEngine.test.ts -t "makeable.*true"` | ❌ Wave 0 |
| MATCH-02 | GET /recipes includes missingCategoryIds array (empty if makeable, non-empty if not) | unit | `pnpm -F @my-bar/server test -- recipes.test.ts -t "missing"` | ❌ Wave 0 |
| MATCH-03 | Recipe ingredient references categoryId; matching logic queries ingredients grouped by categoryId | unit | `pnpm -F @my-bar/server test -- makeableEngine.test.ts -t "category"` | ❌ Wave 0 |
| MATCH-04 | Recipe ingredients stored with quantity + unit enum; unit not converted; makeable check ignores quantity | unit | `pnpm -F @my-bar/server test -- makeableEngine.test.ts -t "unit\|quantity"` | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] `apps/server/src/services/makeableEngine.test.ts` — unit tests for `computeMakeable()`: all-categories-in-stock, one-category-missing, multiple-categories-missing, empty-recipe (zero ingredients)
- [ ] `apps/server/src/routes/recipes.test.ts` — route + integration tests: create, read, update, delete recipes; verify makeable computed in response; verify ingredient/method order preserved
- [ ] `apps/server/src/routes/glassware.test.ts` — route tests: CRUD glassware, delete-guard refusal with accurate count
- [ ] `apps/server/src/routes/categories.test.ts` — regression test: DELETE /categories now counts recipes in addition to ingredients
- [ ] Barback UI integration tests (vitest + React Testing Library): RecipeForm submits correct shape, IngredientListForm adds/removes lines, MethodStepList preserves order, GlasswareManager delete-guard shows refusal message
- [ ] Framework install: No additional test libraries needed; reuse Phase 1 vitest + @testing-library/react (if not already in devDependencies)

*None of the above are blocking planners; all are standard Wave 0 test scaffolding to be filled in during execution.*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth required (trusted LAN, kiosk-only) |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | Unauthenticated access; no authorization scopes |
| V5 Input Validation | **yes** | Zod schemas at Fastify boundary (T-01-02: DoS via unbounded input; enforce max length on name, method step, garnish); enum for unit (prevent typo-drift); UUID for categoryId (prevent injection); method stored as JSON (prevent SQL) |
| V6 Cryptography | no | No cryptographic operations in Phase 2 |
| V7 Communication | no | HTTPS not required (LAN-only); no secrets in request body |
| V8 Error Handling | yes | Translate raw SQLite errors to fixed 400/409 messages (T-01-11); never expose stack traces to client |

### Known Threat Patterns for [Node.js + Fastify + SQLite]

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unbounded JSON input (DoS) | Denial of Service | Zod `.max()` on all string fields (Phase 1 T-01-02 precedent) |
| Category/glassware injection via free text | Tampering | Zod validation + prepared queries (Drizzle ORM) |
| Orphaned recipe → deleted category | Tampering | FK `onDelete: 'restrict'` constraint on recipeIngredients.categoryId |
| SQLite error leakage (UNIQUE constraint, FK fail) | Information Disclosure | Catch + translate to fixed 400/409 message (Phase 1 precedent) |

*Phase 2 adds no new threat surface beyond Phase 1; mitigation patterns are established.*

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime (server dev + build) | ✓ | 22.x | — |
| SQLite (via better-sqlite3) | Database backend | ✓ | 13.0.3 | — |
| pnpm | Package manager | ✓ | (workspace root) | — |
| npm (for Fastify type plugins) | Runtime deps | ✓ | (via pnpm) | — |

**Missing dependencies with no fallback:** none

**Missing dependencies with fallback:** none

*No external services or CLI tools required for Phase 2 beyond what Phase 1 established.*

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Drizzle ORM 0.45.2 includes all needed features (relations, migrations, raw SQL for `onDelete: 'restrict'`) for Phase 2 schema | Standard Stack | Low — Phase 1 already uses it; Phase 2 only adds standard foreign keys and constraint patterns |
| A2 | Makeable matching algorithm is correct (presence-based, category-grouped, no volume math) | Architecture Patterns | **High** — this is the core trust guarantee; must be verified against actual recipes + inventory during UAT |
| A3 | TanStack Query invalidation pattern (invalidate on both success and failure) is sufficient for keeping recipe + ingredient caches in sync across screens | Code Examples | Medium — verified on Phase 1 ingredients; Phase 2 adds recipes but same pattern applies |
| A4 | `method` can be stored as a JSON string in SQLite and parsed on retrieval without loss of order | Database Schema | Low — standard practice; Drizzle ORM + better-sqlite3 handle this transparently |
| A5 | Ant Design v6.5.4's Form component supports nested arrays (IngredientListForm) and array mutations (add/remove steps) | Architecture Patterns | Low — antd Form.List is a standard pattern; used in Phase 1 CategoryManager |

**Items requiring user confirmation before planning:**
- A2 (makeable algorithm correctness — domain logic, not framework knowledge)

**If this table is empty:** All claims in this research have either been verified in this session or carry acceptable risk.

## Open Questions

1. **Method Storage Format (JSON vs. Relational Table)**
   - **What we know:** D-16 specifies ordered list of step strings; UI renders as numbered list.
   - **What's unclear:** Is storing method as a single JSON array sufficient, or does future Phase 4's "Bartender detail view" (BART-01) require individual rows for per-step metadata (timing, notes)?
   - **Recommendation:** Store as JSON array for Phase 2; if Phase 4 needs per-step metadata, split into a `recipe_steps` relational table before then. JSON is simpler for Phase 2's "recipe creation" goal.

2. **Glassware Selection in Recipe Form (Dropdown vs. List Picker)**
   - **What we know:** D-17 requires a curated list; form must let the owner select one or none.
   - **What's unclear:** Ant Design's Select component vs. a custom list picker — which UX is clearer when glassware list grows to 20+ types?
   - **Recommendation:** Start with antd Select (standard pattern); if filtering/search becomes important in Phase 3+, upgrade to a searchable select with custom rendering.

3. **Makeable Status Refresh Timing**
   - **What we know:** Makeable status is computed server-side on recipe GET.
   - **What's unclear:** When an ingredient's in-stock status changes (Phase 3 real-time sync), how quickly should recipe makeable status update on Patron/Bartender screens? Instantaneous via Socket.IO, or acceptable to be stale for seconds?
   - **Recommendation:** Phase 2 has no real-time sync; Phase 3 adds Socket.IO. For Phase 2, recipe makeable status is only queried on page load or manual refresh. Phase 3 will handle sub-second updates.

## Sources

### Primary (HIGH confidence)
- **Codebase Phase 1:** `apps/server/src/db/schema.ts`, `apps/server/src/routes/categories.ts`, `packages/shared/src/ingredient.ts`, `apps/barback/src/components/CategoryManager.tsx` — patterns for table design, route structure, Zod schemas, and UI (read 2026-08-11 this session)
- **Official docs:** Drizzle ORM 0.45.2 documentation (drizzle.team) — FK constraints, onDelete behavior, better-sqlite3 driver (accessed via training knowledge, verified against CLAUDE.md package list)
- **Official docs:** Fastify 5.x + @fastify/type-provider-zod documentation — plugin pattern, ZodTypeProvider (accessed via training knowledge, verified against Phase 1 code)
- **Official docs:** Zod v4 documentation — schema composition, enum types, partial/refinements (accessed via training knowledge, verified against Phase 1 schemas)

### Secondary (MEDIUM confidence)
- **CLAUDE.md:** Tech stack section (checked 2026-08-11) — confirmed Node 22, TypeScript 5, Fastify 5, better-sqlite3 13, Drizzle 0.45, React 19, TanStack Query 5, Ant Design 6, Zod 4
- **Phase 1 CONTEXT.md:** D-01/D-03 (category model, delete-guard pattern) — directly inform D-17/D-21/D-22 (read 2026-08-11 this session)
- **02-UI-SPEC.md:** Copywriting contract, component inventory, color/spacing/typography tokens (read 2026-08-11 this session) — confirms RecipeList, RecipeForm, GlasswareManager component scope and copy

### Tertiary (LOW confidence)
- None — all critical claims verified against codebase or official docs this session.

## Metadata

**Confidence breakdown:**
- **Standard stack & versions:** HIGH — verified against codebase package.json and CLAUDE.md
- **Database schema design:** HIGH — follows Phase 1 patterns exactly; no novel concepts
- **Makeable algorithm:** MEDIUM — domain-specific logic, correct in theory but must be validated during UAT against real recipes
- **API route patterns:** HIGH — template from Phase 1 categories/ingredients routes
- **Component patterns:** HIGH — antd + TanStack Query patterns established in Phase 1; no new concepts
- **Validation & testing:** HIGH — vitest framework and pattern established in Phase 1

**Research date:** 2026-08-11
**Valid until:** 2026-08-25 (14 days; standard stack is stable, but makeable algorithm should be validated early in execution)

---

*Phase: 2 — Recipe Collection & Makeable Engine*
*Research completed: 2026-08-11*
