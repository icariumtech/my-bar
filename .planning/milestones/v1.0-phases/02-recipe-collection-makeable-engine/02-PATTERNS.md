# Phase 02: Recipe Collection & Makeable Engine - Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 25 (18 new, 5 modified, 2 infrastructure)
**Analogs found:** 23 / 25 (92%)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/shared/src/recipe.ts` | model | CRUD | `ingredient.ts` | exact |
| `packages/shared/src/glassware.ts` | model | CRUD | `category.ts` | exact |
| `packages/shared/src/index.ts` | model (modified) | CRUD | existing | same |
| `apps/server/src/db/schema.ts` | model (modified) | CRUD | existing | same |
| `apps/server/src/services/makeableEngine.ts` | service | transform | ingredients query patterns | role-match |
| `apps/server/src/routes/recipes.ts` | route | request-response + CRUD | `ingredients.ts` | exact |
| `apps/server/src/routes/recipes.test.ts` | test | CRUD | `ingredients.test.ts` | exact |
| `apps/server/src/routes/glassware.ts` | route | request-response + CRUD | `categories.ts` | exact |
| `apps/server/src/routes/glassware.test.ts` | test | CRUD | `categories.test.ts` | exact |
| `apps/server/src/routes/categories.ts` | route (modified) | request-response + CRUD | existing | same |
| `apps/server/src/routes/categories.test.ts` | test (modified) | CRUD | existing | same |
| `apps/server/src/index.ts` | route registration | request-response | existing | same |
| `apps/barback/src/components/RecipeList.tsx` | component | request-response | `IngredientList.tsx` | exact |
| `apps/barback/src/components/RecipeRow.tsx` | component | request-response | `IngredientRow.tsx` | role-match |
| `apps/barback/src/components/RecipeDetailView.tsx` | component | request-response | N/A (new UX) | minimal |
| `apps/barback/src/components/RecipeForm.tsx` | component | request-response + CRUD | `AddEditIngredientForm.tsx` | exact |
| `apps/barback/src/components/IngredientListForm.tsx` | component | request-response + transform | antd `Form.List` pattern | role-match |
| `apps/barback/src/components/MethodStepList.tsx` | component | request-response + transform | antd `Form.List` pattern | role-match |
| `apps/barback/src/components/GlasswareManager.tsx` | component | request-response + CRUD | `CategoryManager.tsx` | exact |
| `apps/barback/src/components/GlasswareSelector.tsx` | component | request-response | antd `Select` + category dropdown | role-match |
| `apps/barback/src/components/UnitDropdown.tsx` | component | request-response | antd `Select` with fixed enum | role-match |
| `apps/barback/src/components/MakeableStatusBadge.tsx` | component | request-response | antd `Tag` component pattern | minimal |
| `apps/barback/src/api/useRecipes.ts` | hook | request-response + CRUD | `useIngredients.ts` | exact |
| `apps/barback/src/api/useGlassware.ts` | hook | request-response + CRUD | `useCategories.ts` | exact |
| `apps/barback/src/App.tsx` | component (modified) | request-response | existing | same |

## Pattern Assignments

### Shared Type Models

#### `packages/shared/src/recipe.ts` (model, CRUD)

**Analog:** `packages/shared/src/ingredient.ts` and research specification

**Imports pattern** (lines 1-4):
```typescript
import { z } from 'zod'
// No other imports needed for Zod schemas
```

**RecipeInput schema** (required fields for creation):
```typescript
export const recipeInput = z.object({
  name: z.string().trim().min(1).max(200), // D-16 constraint from ingredientInput pattern
  ingredients: z.array(
    z.object({
      categoryId: z.string().uuid(), // D-03 pattern: always reference by id
      quantity: z.string().trim().min(1).max(20), // D-20: stored as string
      unit: z.enum(['oz', 'dash', 'splash', 'barspoon', 'muddled', 'part']), // D-19
    }),
  ).min(1),
  method: z.array(z.string().trim().min(1).max(500)).min(1), // D-16: ordered steps
  glasswareId: z.string().uuid().optional(), // D-17: nullable reference
  garnish: z.string().max(200).optional(), // D-18: free text only
})
export type RecipeInput = z.infer<typeof recipeInput>
```

**Recipe full response schema** (includes computed fields):
```typescript
export const recipe = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ingredients: z.array(
    z.object({
      id: z.string().uuid(),
      categoryId: z.string().uuid(),
      categoryName: z.string(), // Joined from categories table (ingredient pattern)
      quantity: z.string(),
      unit: z.string(),
      displayOrder: z.number(), // D-16: preserve ingredient order
    }),
  ),
  method: z.array(z.string()), // Returned as array, not re-stringified
  glasswareId: z.string().uuid().nullable(),
  glasswareName: z.string().nullable(), // Joined from glassware table
  garnish: z.string().nullable(),
  makeable: z.boolean(), // MATCH-01: computed server-side
  missingCategoryIds: z.array(z.string().uuid()), // MATCH-02
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Recipe = z.infer<typeof recipe>
```

**RecipePatch schema** (for updates, reuses ingredientPatch pattern):
```typescript
export const recipePatch = recipeInput
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
export type RecipePatch = z.infer<typeof recipePatch>
```

---

#### `packages/shared/src/glassware.ts` (model, CRUD)

**Analog:** `packages/shared/src/category.ts` (exact mirror)

**Input schema**:
```typescript
import { z } from 'zod'

export const glasswareInput = z.object({
  name: z.string().trim().min(1).max(60), // D-17: mirrors categoryInput pattern
})
export type GlasswareInput = z.infer<typeof glasswareInput>

export const glassware = glasswareInput.extend({
  id: z.string().uuid(),
})
export type Glassware = z.infer<typeof glassware>
```

---

### Backend Database Schema

#### `apps/server/src/db/schema.ts` (model, CRUD - MODIFIED)

**Analog:** existing categories and ingredients table patterns

**Add three new tables** (follow sqliteTable pattern from lines 1-22):

```typescript
// D-17: glassware list parallels categories (unique name, owner-managed, delete-guard)
export const glassware = sqliteTable('glassware', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(), // D-17: enforce unique glassware names
})

// Recipes: name, method (ordered steps), glassware reference, garnish (free text)
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  method: text('method').notNull(), // D-16: JSON array of step strings
  glasswareId: text('glassware_id')
    .references(() => glassware.id, { onDelete: 'set null' }), // Nullable
  garnish: text('garnish'), // D-18: free text only
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// D-16/D-19/D-20: join table tying recipe lines to categories with quantity + unit
export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }), // D-21: guard category deletion
  quantity: text('quantity').notNull(), // "2", "1/2", "3.5" — stored as string
  unit: text('unit').notNull(), // enum enforced at Zod boundary, not DB
  displayOrder: integer('display_order').notNull(), // Preserve ingredient order
})
```

**No changes to existing categories/ingredients tables** — D-21's new guard is in the routes layer.

---

### Backend Route Handlers

#### `apps/server/src/services/makeableEngine.ts` (service, transform - NEW)

**Analog:** ingredient query patterns from `ingredients.ts` (lines 36-50)

**Pure service function** (no route dependency):
```typescript
import { db } from '../db/client.js'
import { ingredients } from '../db/schema.js'
import { eq } from 'drizzle-orm'

export interface MakeableResult {
  makeable: boolean
  missingCategoryIds: string[]
}

/**
 * MATCH-01/MATCH-03/MATCH-04: Compute whether a recipe is makeable from current inventory.
 * Presence-based: a recipe is makeable if every required category has ≥1 in-stock ingredient.
 * Category-based: matches against any in-stock bottle in the right category.
 * Volume-agnostic: quantity/unit fields are display-only; makeable check ignores them.
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

---

#### `apps/server/src/routes/recipes.ts` (route, request-response + CRUD - NEW)

**Analog:** `apps/server/src/routes/ingredients.ts` (lines 1-109 for structure)

**Plugin structure and GET handler** (lines 1-50):
```typescript
import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { recipe, recipeInput, recipePatch } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { recipes, recipeIngredients, categories, glassware, ingredients } from '../db/schema.js'
import { computeMakeable } from '../services/makeableEngine.js'

interface RecipesRoutesOptions extends FastifyPluginOptions {
  db?: typeof defaultDb // Dependency injection for tests (same pattern as ingredients.ts:9-15)
}

export const recipesRoutes: FastifyPluginAsync<RecipesRoutesOptions> = async (
  app,
  opts,
) => {
  const db = opts.db ?? defaultDb // Same pattern as ingredients.ts:24

  // RECIPE-01/MATCH-01: GET /recipes — list with computed makeable status
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
      // Fetch all recipes with joined glassware details (similar to ingredients.ts:36-50)
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

      // For each recipe, fetch ingredients and compute makeable status
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
  // RECIPE-02: PATCH /recipes/:id — edit recipe
  // RECIPE-02: DELETE /recipes/:id — delete (cascades via recipeIngredients FK)
  // [Implementation follows ingredients.ts POST/PATCH/DELETE pattern, lines 57-223]
}
```

**POST handler pattern** (similar to ingredients.ts lines 57-108):
```typescript
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
          method: JSON.stringify(request.body.method), // D-16: store as JSON string
          glasswareId: request.body.glasswareId ?? null,
          garnish: request.body.garnish ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run()

      // Insert ingredient lines with displayOrder (parallel to recipeIngredients table pattern)
      request.body.ingredients.forEach((ing, idx) => {
        db.insert(recipeIngredients)
          .values({
            id: crypto.randomUUID(),
            recipeId,
            categoryId: ing.categoryId,
            quantity: ing.quantity,
            unit: ing.unit,
            displayOrder: idx, // D-16: preserve order
          })
          .run()
      })
    } catch (err) {
      // T-01-10: translate FK errors (e.g., unknown categoryId) to 400 (same pattern as ingredients.ts:83-90)
      if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
        return reply.status(400).send({ error: 'Unknown category or glassware' })
      }
      throw err
    }

    // Fetch and return the newly created recipe with makeable status computed
    // [Use same GET detail logic above to build response]
    return reply.status(201).send(created)
  },
)
```

---

#### `apps/server/src/routes/glassware.ts` (route, request-response + CRUD - NEW)

**Analog:** `apps/server/src/routes/categories.ts` (exact mirror, lines 1-177)

**Structure**: Mirrors categories.ts exactly:
- GET /api/glassware — list all
- POST /api/glassware — create with unique name constraint
- PATCH /api/glassware/:id — rename with unique name constraint
- DELETE /api/glassware/:id — refuse if any recipe references it (D-22)

**Delete guard implementation** (copy from categories.ts lines 120-175, adapted for glassware):
```typescript
function inUseMessage(count: number) {
  return `This glassware is used by ${count} recipe(s) — remove or reassign them first.` // D-22 copy
}

app.withTypeProvider<ZodTypeProvider>().delete(
  '/:id',
  {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: {
        204: z.void(),
        404: z.object({ error: z.string() }),
        409: z.object({ error: z.string(), recipeCount: z.number() }),
      },
    },
  },
  async (request, reply) => {
    const { id } = request.params

    // Pre-count check for usage (categories.ts:147-155)
    const [{ recipeCount }] = db
      .select({ recipeCount: sql<number>`count(*)` })
      .from(recipes)
      .where(eq(recipes.glasswareId, id))
      .all()

    if (recipeCount > 0) {
      return reply.status(409).send({ error: inUseMessage(recipeCount), recipeCount })
    }

    try {
      db.delete(glassware).where(eq(glassware.id, id)).run()
    } catch (err) {
      // Handle race condition (categories.ts:159-171)
      if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
        const [{ recipeCount: raceCount }] = db
          .select({ recipeCount: sql<number>`count(*)` })
          .from(recipes)
          .where(eq(recipes.glasswareId, id))
          .all()
        return reply.status(409).send({ error: inUseMessage(raceCount), recipeCount: raceCount })
      }
      throw err
    }

    return reply.status(204).send()
  },
)
```

---

#### `apps/server/src/routes/categories.ts` (route, request-response + CRUD - MODIFIED)

**Analog:** existing categories.ts

**Modification**: Extend DELETE handler (lines 120-175) to count recipes in addition to ingredients.

**Update the inUseMessage function** (line 13):
```typescript
function inUseMessage(ingredientCount: number, recipeCount: number) {
  const parts: string[] = []
  if (ingredientCount > 0) parts.push(`${ingredientCount} ingredient(s)`)
  if (recipeCount > 0) parts.push(`${recipeCount} recipe(s)`)
  return `This category is used by ${parts.join(' and/or ')} — reassign or remove them first.`
}
```

**Update DELETE handler** (lines 147-155 in categories.ts), replace ingredient-only count:
```typescript
const [{ ingredientCount }] = db
  .select({ ingredientCount: sql<number>`count(*)` })
  .from(ingredients)
  .where(eq(ingredients.categoryId, id))
  .all()

const [{ recipeIngredientCount }] = db // NEW: check recipes too (D-21)
  .select({ recipeIngredientCount: sql<number>`count(*)` })
  .from(recipeIngredients)
  .where(eq(recipeIngredients.categoryId, id))
  .all()

const totalCount = ingredientCount + recipeIngredientCount
if (totalCount > 0) {
  return reply.status(409).send({ 
    error: inUseMessage(ingredientCount, recipeIngredientCount), 
    ingredientCount, 
    recipeIngredientCount // NEW: return both counts
  })
}
```

**Update response schema** (line 135):
```typescript
409: z.object({ 
  error: z.string(), 
  ingredientCount: z.number(),
  recipeIngredientCount: z.number() // NEW
}),
```

---

#### `apps/server/src/index.ts` (route registration - MODIFIED)

**Analog:** existing index.ts (lines 1-50)

**Add imports and register recipes/glassware routes** (add after line 8):
```typescript
import { recipesRoutes } from './routes/recipes.js'
import { glasswareRoutes } from './routes/glassware.js'
```

**Register routes** (add after line 28):
```typescript
app.register(recipesRoutes, { prefix: '/api/recipes' })
app.register(glasswareRoutes, { prefix: '/api/glassware' })
```

---

### Frontend Components

#### `apps/barback/src/components/RecipeList.tsx` (component, request-response - NEW)

**Analog:** `apps/barback/src/components/IngredientList.tsx` (lines 1-124)

**Structure**: Same layout as IngredientList with search/filter, loading/error states:
```typescript
import { useMemo, useState } from 'react'
import { Alert, Button, Spin } from 'antd'
import type { Recipe } from '@my-bar/shared'
import { useRecipes } from '../api/useRecipes.js'
import { RecipeRow } from './RecipeRow.js'

interface RecipeListProps {
  onEdit?: (recipe: Recipe) => void
  onView?: (recipe: Recipe) => void
}

export function RecipeList({ onEdit, onView }: RecipeListProps = {}) {
  const { data: recipes, isPending, isError, refetch } = useRecipes()
  const [query, setQuery] = useState('')

  // Filter recipes by name search (same pattern as IngredientList:37-50)
  const filteredRecipes = useMemo(() => {
    if (!recipes) return undefined
    const normalizedQuery = query.trim().toLowerCase()
    return recipes.filter((recipe) =>
      normalizedQuery === '' ||
      recipe.name.toLowerCase().includes(normalizedQuery)
    )
  }, [recipes, query])

  if (isPending) {
    return (
      <div className="flex justify-center pt-3xl">
        <Spin description="Loading recipes…" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="pt-lg px-md">
        <Alert
          type="error"
          showIcon
          title="Couldn't load recipes — check your connection and try again."
          action={
            <Button size="small" style={{ minHeight: 48 }} onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  const hasAnyRecipes = (recipes?.length ?? 0) > 0
  const hasFilteredResults = (filteredRecipes?.length ?? 0) > 0

  return (
    <div>
      <div className="sticky top-0 z-10 bg-bar-bg pt-sm pb-sm safe-area-inset-top">
        <Input
          placeholder="Search recipes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!hasAnyRecipes && (
        <div className="text-center pt-3xl px-md">
          <h2 className="text-white">No recipes yet</h2>
          <p className="text-zinc-400 mt-sm">Add your first recipe to get started.</p>
        </div>
      )}

      {hasAnyRecipes && !hasFilteredResults && (
        <div className="text-center pt-3xl px-md">
          <p className="text-zinc-400">No matches for '{query}'</p>
        </div>
      )}

      {hasFilteredResults && (
        <ul className="flex flex-col gap-sm mt-md safe-area-inset-bottom">
          {filteredRecipes?.map((recipe) => (
            <li key={recipe.id}>
              <RecipeRow
                recipe={recipe}
                onEdit={onEdit}
                onView={onView}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

#### `apps/barback/src/components/RecipeForm.tsx` (component, request-response + CRUD - NEW)

**Analog:** `apps/barback/src/components/AddEditIngredientForm.tsx` (lines 1-176)

**Structure**: Same create/edit modal pattern:
```typescript
import { useEffect, useState } from 'react'
import { Alert, Form, Input, Modal, Button } from 'antd'
import type { Recipe, RecipeInput } from '@my-bar/shared'
import { useCreateRecipe, useUpdateRecipe } from '../api/useRecipes.js'
import { useGlassware } from '../api/useGlassware.js'
import { IngredientListForm } from './IngredientListForm.js'
import { MethodStepList } from './MethodStepList.js'
import { GlasswareSelector } from './GlasswareSelector.js'

interface RecipeFormProps {
  recipe?: Recipe // undefined = create mode (same pattern as AddEditIngredientForm:12-16)
  open: boolean
  onClose: () => void
}

const nameRules = [
  { required: true, message: 'Recipe name is required' },
  { max: 200, message: 'Recipe name must be 200 characters or fewer' },
]

export function RecipeForm({ recipe, open, onClose }: RecipeFormProps) {
  const [form] = Form.useForm<RecipeInput>()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()
  const { data: glassware } = useGlassware()

  const isEditing = recipe !== undefined
  const saving = isEditing ? updateRecipe.isPending : createRecipe.isPending

  // Re-populate form when modal opens (same pattern as AddEditIngredientForm:55-66)
  useEffect(() => {
    if (!open) return
    if (recipe) {
      form.setFieldsValue({
        name: recipe.name,
        ingredients: recipe.ingredients.map((ing) => ({
          categoryId: ing.categoryId,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
        method: recipe.method,
        glasswareId: recipe.glasswareId ?? undefined,
        garnish: recipe.garnish ?? undefined,
      })
    } else {
      form.resetFields()
    }
  }, [open, recipe, form])

  async function handleSubmit(values: RecipeInput) {
    try {
      if (recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, patch: values })
      } else {
        await createRecipe.mutateAsync(values)
      }
      form.resetFields()
      onClose()
    } catch {
      // Keep the owner's typed values on failure — do not reset the form
    }
  }

  function handleCancel() {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={isEditing ? 'Edit Recipe' : 'Add Recipe'}
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Form.Item name="name" label="Recipe Name" rules={nameRules}>
          <Input placeholder="e.g. Margarita" maxLength={200} />
        </Form.Item>

        <Form.Item name="ingredients" label="Ingredients" rules={[{ required: true }]}>
          <IngredientListForm />
        </Form.Item>

        <Form.Item name="method" label="Method" rules={[{ required: true }]}>
          <MethodStepList />
        </Form.Item>

        <Form.Item name="glasswareId" label="Glassware">
          <GlasswareSelector glassware={glassware} />
        </Form.Item>

        <Form.Item name="garnish" label="Garnish">
          <Input.TextArea placeholder="e.g. Lime wheel, salt rim" maxLength={200} />
        </Form.Item>

        <div>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            block
            style={{ minHeight: 48 }}
          >
            Save Recipe
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
```

---

#### `apps/barback/src/components/GlasswareManager.tsx` (component, request-response + CRUD - NEW)

**Analog:** `apps/barback/src/components/CategoryManager.tsx` (lines 1-213 - exact mirror for glassware)

**Copy CategoryManager.tsx pattern verbatim, replacing**:
- `useCategories` → `useGlassware`
- `useCreateCategory` → `useCreateGlassware`
- `useRenameCategory` → `useUpdateGlassware`
- `useDeleteCategory` → `useDeleteGlassware`
- "category" → "glassware" (UI labels)
- Error message: `"This glassware is used by N recipe(s) — remove or reassign them first."` (D-22)
- `DeleteCategoryError` → `DeleteGlasswareError` (custom error class for recipe count surfacing)

---

### Frontend Data Fetching Hooks

#### `apps/barback/src/api/useRecipes.ts` (hook, request-response + CRUD - NEW)

**Analog:** `apps/barback/src/api/useIngredients.ts` (lines 1-73)

**useRecipes hook** (lines 1-11):
```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Recipe, RecipeInput, RecipePatch } from '@my-bar/shared'
import { apiFetch } from './client.js'

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<Recipe[]>('/recipes'),
  })
}
```

**useCreateRecipe** (pattern from useIngredients:13-28):
```typescript
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
```

**useUpdateRecipe** (pattern from useIngredients:36-49):
```typescript
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

**useDeleteRecipe** (pattern from useCategories:68-92, adapted for recipe deletion):
```typescript
export class DeleteRecipeError extends Error {
  message: string

  constructor(message: string) {
    super(message)
    this.name = 'DeleteRecipeError'
  }
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' })

      if (res.status === 204) {
        return
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string
      }
      throw new DeleteRecipeError(
        body.error ?? `Request to /recipes/${id} failed: ${res.status} ${res.statusText}`,
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
```

---

#### `apps/barback/src/api/useGlassware.ts` (hook, request-response + CRUD - NEW)

**Analog:** `apps/barback/src/api/useCategories.ts` (lines 1-93 - exact mirror)

**Copy useCategories.ts pattern verbatim, replacing**:
- `useCategories` → `useGlassware`
- `useCreateCategory` → `useCreateGlassware`
- `useRenameCategory` → `useUpdateGlassware`
- `useDeleteCategory` → `useDeleteGlassware`
- `DeleteCategoryError` → `DeleteGlasswareError`
- Error message surfacing: return `recipeCount` instead of `ingredientCount` in delete error
- API endpoints: `/categories` → `/glassware`

---

### Frontend Components (Supporting)

#### `apps/barback/src/components/IngredientListForm.tsx` (component, transform - NEW)

**Analog:** antd `Form.List` pattern + ingredient selection logic from `AddEditIngredientForm.tsx`

**Purpose**: Sub-component for adding/removing recipe ingredient lines

**Pattern**: Use antd `Form.List` (same as CategoryManager uses for array management):
```typescript
import { Button, Form, Input, Select } from 'antd'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import type { RecipeInput } from '@my-bar/shared'
import { useCategories } from '../api/useCategories.js'
import { UnitDropdown } from './UnitDropdown.js'

const UNIT_OPTIONS = ['oz', 'dash', 'splash', 'barspoon', 'muddled', 'part']

export function IngredientListForm() {
  const { data: categories } = useCategories()

  const categoryOptions = (categories ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }))

  return (
    <Form.List name="ingredients">
      {(fields, { add, remove }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fields.map((field) => (
            <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Form.Item {...field} name={[field.name, 'categoryId']} style={{ flex: 1, margin: 0 }}>
                <Select placeholder="Category" options={categoryOptions} />
              </Form.Item>
              <Form.Item {...field} name={[field.name, 'quantity']} style={{ flex: 0.5, margin: 0 }}>
                <Input placeholder="Qty" maxLength={20} />
              </Form.Item>
              <Form.Item {...field} name={[field.name, 'unit']} style={{ flex: 0.75, margin: 0 }}>
                <UnitDropdown />
              </Form.Item>
              <Button
                danger
                icon={<MinusOutlined />}
                onClick={() => remove(field.name)}
                style={{ minHeight: 48, minWidth: 48 }}
              />
            </div>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => add()}
            block
            style={{ minHeight: 48 }}
          >
            Add Ingredient
          </Button>
        </div>
      )}
    </Form.List>
  )
}
```

---

#### `apps/barback/src/components/MethodStepList.tsx` (component, transform - NEW)

**Analog:** antd `Form.List` pattern (same as IngredientListForm)

**Purpose**: Sub-component for adding/removing ordered method steps (D-16)

**Pattern**: Use antd `Form.List` for ordered array:
```typescript
import { Button, Form, Input } from 'antd'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'

export function MethodStepList() {
  return (
    <Form.List name="method">
      {(fields, { add, remove }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fields.map((field, index) => (
            <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ color: '#a1a1a1', minWidth: 24, marginTop: 8 }}>
                {index + 1}.
              </span>
              <Form.Item {...field} style={{ flex: 1, margin: 0 }}>
                <Input.TextArea
                  placeholder={`Step ${index + 1}`}
                  maxLength={500}
                  rows={2}
                />
              </Form.Item>
              <Button
                danger
                icon={<MinusOutlined />}
                onClick={() => remove(field.name)}
                style={{ minHeight: 48, minWidth: 48 }}
              />
            </div>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => add()}
            block
            style={{ minHeight: 48 }}
          >
            Add Step
          </Button>
        </div>
      )}
    </Form.List>
  )
}
```

---

#### `apps/barback/src/components/GlasswareSelector.tsx` (component, request-response - NEW)

**Analog:** antd `Select` component pattern from `AddEditIngredientForm.tsx` (lines 155)

**Purpose**: Dropdown for selecting glassware in recipe form (nullable)

```typescript
import { Select } from 'antd'
import type { Glassware } from '@my-bar/shared'

interface GlaswareSelectorProps {
  glassware?: Glassware[]
}

export function GlasswareSelector({ glassware }: GlaswareSelectorProps) {
  const options = (glassware ?? []).map((g) => ({
    value: g.id,
    label: g.name,
  }))

  return (
    <Select
      placeholder="Select a glassware type (optional)"
      options={options}
      allowClear
    />
  )
}
```

---

#### `apps/barback/src/components/UnitDropdown.tsx` (component, request-response - NEW)

**Analog:** antd `Select` with enum options (D-19 constraint)

**Purpose**: Fixed-option dropdown for recipe ingredient units

```typescript
import { Select } from 'antd'

const UNIT_OPTIONS = [
  'oz',
  'dash',
  'splash',
  'barspoon',
  'muddled',
  'part',
]

export function UnitDropdown() {
  const options = UNIT_OPTIONS.map((unit) => ({
    value: unit,
    label: unit,
  }))

  return (
    <Select
      placeholder="Unit"
      options={options}
    />
  )
}
```

---

#### `apps/barback/src/components/MakeableStatusBadge.tsx` (component, request-response - NEW)

**Analog:** antd `Tag` component (minimal, new component for D-15 requirement)

**Purpose**: Visual badge showing makeable/not-makeable status inline in recipe list

```typescript
import { Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'

interface MakeableStatusBadgeProps {
  makeable: boolean
  missingCategoryIds?: string[]
}

export function MakeableStatusBadge({ makeable, missingCategoryIds }: MakeableStatusBadgeProps) {
  if (makeable) {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success">
        Makeable
      </Tag>
    )
  }

  return (
    <Tag icon={<CloseCircleOutlined />} color="error">
      Missing {missingCategoryIds?.length || 1} ingredient(s)
    </Tag>
  )
}
```

---

#### `apps/barback/src/components/RecipeRow.tsx` (component, request-response - NEW)

**Analog:** `apps/barback/src/components/IngredientRow.tsx` (analogous list item pattern)

**Purpose**: Single recipe item row with makeable badge and edit/delete affordances

```typescript
import { Button } from 'antd'
import { DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
import type { Recipe } from '@my-bar/shared'
import { MakeableStatusBadge } from './MakeableStatusBadge.js'
import { useDeleteRecipe } from '../api/useRecipes.js'

interface RecipeRowProps {
  recipe: Recipe
  onEdit?: (recipe: Recipe) => void
  onView?: (recipe: Recipe) => void
}

export function RecipeRow({ recipe, onEdit, onView }: RecipeRowProps) {
  const deleteRecipe = useDeleteRecipe()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        border: '1px solid #404040',
        borderRadius: '4px',
        minHeight: 48,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="text-white font-medium">{recipe.name}</span>
          <MakeableStatusBadge makeable={recipe.makeable} missingCategoryIds={recipe.missingCategoryIds} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onView && (
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => onView(recipe)}
            style={{ minHeight: 48, minWidth: 48 }}
          />
        )}
        {onEdit && (
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(recipe)}
            style={{ minHeight: 48, minWidth: 48 }}
          />
        )}
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          loading={deleteRecipe.isPending}
          onClick={() => deleteRecipe.mutate(recipe.id)}
          style={{ minHeight: 48, minWidth: 48 }}
        />
      </div>
    </div>
  )
}
```

---

#### `apps/barback/src/components/RecipeDetailView.tsx` (component, request-response - NEW)

**Analog**: Minimal (new UX component, no direct Phase 1 precedent)

**Purpose**: Full recipe display modal showing name, ingredients (with category names), method (numbered), glassware, garnish, and makeable status

**Structure**: Modal with tabbed layout or vertical sections:
- Recipe name (heading)
- Makeable status badge
- Ingredients list (with category names)
- Method steps (numbered)
- Glassware + garnish (side info)
- Missing categories (if not makeable)

---

#### `apps/barback/src/App.tsx` (component - MODIFIED)

**Analog:** existing App.tsx (lines 1-83)

**Add Recipes tab navigation**. The phase decision is that recipes live in Barback, not a separate app. Two options:

1. **Modal-based** (lighter change): Keep current single-screen layout, add "Recipes" button to header (mirrors "Categories" button)
2. **Tab-based** (larger refactor): Switch to tab navigation (Inventory tab, Recipes tab)

**Recommend modal-based for Phase 2** — add to header like CategoryManager:

```typescript
// After line 18 (categoryManagerOpen state)
const [recipesOpen, setRecipesOpen] = useState(false)
const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined)

// Add to header buttons (after CategoryManager button, line 54-60):
<Button
  style={{ minHeight: 48 }}
  onClick={() => setRecipesOpen(true)}
>
  Recipes
</Button>

// Add new modals before closing </div>:
<RecipeListModal
  open={recipesOpen}
  onClose={() => setRecipesOpen(false)}
/>
<RecipeForm
  recipe={editingRecipe}
  open={/* formOpen */}
  onClose={/* closeForm */}
/>
```

Alternatively, create a `RecipeListModal.tsx` wrapper that owns the list + form state.

---

## Shared Patterns

### Fastify Route Plugin Pattern

**Source:** `apps/server/src/routes/ingredients.ts` (lines 1-25)
**Apply to:** All new route files (`recipes.ts`, `glassware.ts`)

```typescript
import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'

interface RoutesOptions extends FastifyPluginOptions {
  db?: typeof defaultDb // Dependency injection for testing
}

export const myRoutes: FastifyPluginAsync<RoutesOptions> = async (
  app,
  opts,
) => {
  const db = opts.db ?? defaultDb

  // Route handlers use app.withTypeProvider<ZodTypeProvider>()
  app.withTypeProvider<ZodTypeProvider>().get(/* ... */)
}
```

---

### Zod Schema Pattern (Input + Full + Patch)

**Source:** `packages/shared/src/ingredient.ts` (lines 1-53)
**Apply to:** All new shared schema files (`recipe.ts`, `glassware.ts`)

```typescript
import { z } from 'zod'

// Input schema (for create/edit forms)
export const entityInput = z.object({
  field1: z.string().trim().min(1).max(200), // T-01-02: DoS mitigation
  field2: z.string().uuid(),
})
export type EntityInput = z.infer<typeof entityInput>

// Full response schema (includes computed/joined fields)
export const entity = entityInput.extend({
  id: z.string().uuid(),
  joinedField: z.string(), // From JOIN
})
export type Entity = z.infer<typeof entity>

// Patch schema (partial, with empty-object guard)
export const entityPatch = entityInput
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
export type EntityPatch = z.infer<typeof entityPatch>
```

---

### Delete-Guard Pattern (With Usage Count)

**Source:** `apps/server/src/routes/categories.ts` (lines 13-175)
**Apply to:** `glassware.ts` DELETE, modified `categories.ts` DELETE

```typescript
function inUseMessage(count: number) {
  return `This resource is used by ${count} item(s) — reassign or remove them first.`
}

app.withTypeProvider<ZodTypeProvider>().delete(
  '/:id',
  {
    schema: {
      params: z.object({ id: z.string().uuid() }),
      response: {
        204: z.void(),
        404: z.object({ error: z.string() }),
        409: z.object({ error: z.string(), itemCount: z.number() }),
      },
    },
  },
  async (request, reply) => {
    const { id } = request.params

    // Pre-count check
    const [{ itemCount }] = db
      .select({ itemCount: sql<number>`count(*)` })
      .from(referencingTable)
      .where(eq(referencingTable.resourceId, id))
      .all()

    if (itemCount > 0) {
      return reply.status(409).send({ error: inUseMessage(itemCount), itemCount })
    }

    try {
      db.delete(resourceTable).where(eq(resourceTable.id, id)).run()
    } catch (err) {
      // Handle race condition: re-count and return stale count
      if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
        const [{ itemCount: raceCount }] = db
          .select({ itemCount: sql<number>`count(*)` })
          .from(referencingTable)
          .where(eq(referencingTable.resourceId, id))
          .all()
        return reply.status(409).send({ error: inUseMessage(raceCount), itemCount: raceCount })
      }
      throw err
    }

    return reply.status(204).send()
  },
)
```

---

### TanStack Query Hook Pattern (CRUD)

**Source:** `apps/barback/src/api/useIngredients.ts` and `useCategories.ts` (lines 1-93)
**Apply to:** All new hook files (`useRecipes.ts`, `useGlassware.ts`)

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// Read hook
export function useEntity() {
  return useQuery({
    queryKey: ['entities'],
    queryFn: () => apiFetch<Entity[]>('/entities'),
  })
}

// Create hook
export function useCreateEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EntityInput) =>
      apiFetch<Entity>('/entities', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })
}

// Update hook (invalidate related queries too if needed)
export function useUpdateEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EntityPatch }) =>
      apiFetch<Entity>(`/entities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
      queryClient.invalidateQueries({ queryKey: ['relatedEntities'] }) // If needed
    },
  })
}

// Delete hook (surface error details if needed for UI)
export class DeleteEntityError extends Error {
  itemCount?: number
  constructor(message: string, itemCount?: number) {
    super(message)
    this.name = 'DeleteEntityError'
    this.itemCount = itemCount
  }
}

export function useDeleteEntity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/entities/${id}`, { method: 'DELETE' })
      if (res.status === 204) return
      const body = (await res.json().catch(() => ({}))) as { error?: string; itemCount?: number }
      throw new DeleteEntityError(
        body.error ?? `Request failed: ${res.status}`,
        body.itemCount,
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })
}
```

---

### React Modal Form Pattern (Create + Edit)

**Source:** `apps/barback/src/components/AddEditIngredientForm.tsx` (lines 1-176)
**Apply to:** All new form components (`RecipeForm.tsx`, mirrors for sub-forms)

```typescript
import { useEffect, useState } from 'react'
import { Alert, Form, Input, Modal, Button } from 'antd'

interface FormProps {
  entity?: Entity // undefined = create mode
  open: boolean
  onClose: () => void
}

export function EntityForm({ entity, open, onClose }: FormProps) {
  const [form] = Form.useForm<EntityInput>()
  const createEntity = useCreateEntity()
  const updateEntity = useUpdateEntity()

  const isEditing = entity !== undefined
  const saving = isEditing ? updateEntity.isPending : createEntity.isPending

  // Re-populate when modal opens (handles mode switching)
  useEffect(() => {
    if (!open) return
    if (entity) {
      form.setFieldsValue({ /* entity fields */ })
    } else {
      form.resetFields()
    }
  }, [open, entity, form])

  async function handleSubmit(values: EntityInput) {
    try {
      if (entity) {
        await updateEntity.mutateAsync({ id: entity.id, patch: values })
      } else {
        await createEntity.mutateAsync(values)
      }
      form.resetFields()
      onClose()
    } catch {
      // Keep values on failure — do not reset
    }
  }

  return (
    <Modal
      title={isEditing ? 'Edit Entity' : 'Add Entity'}
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        {/* Form items */}
        <div>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            block
            style={{ minHeight: 48 }}
          >
            Save
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
```

---

## No Analog Found

Files with no close existing match in the codebase:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/barback/src/components/RecipeDetailView.tsx` | component | request-response | Full recipe detail modal is new UX; no Phase 1 precedent. Use antd Modal + basic layout pattern. |
| `apps/barback/src/components/MakeableStatusBadge.tsx` | component | request-response | Visual status badge is new; use antd `Tag` component for styling. |
| `apps/server/src/services/makeableEngine.ts` | service | transform | Makeable computation service is new business logic; uses existing ingredient query patterns from routes. |

---

## Metadata

**Phase:** 02 - Recipe Collection & Makeable Engine
**Analysis date:** 2026-08-11
**Analog search scope:** `apps/server/src/routes/`, `apps/server/src/db/`, `apps/barback/src/components/`, `apps/barback/src/api/`, `packages/shared/src/`
**Files scanned:** 14 existing analog files
**Pattern extraction method:** Direct code excerpts with line references from closest role/data-flow matches

### Coverage Summary
- **Files with exact analog:** 17 (68%)
- **Files with role-match analog:** 6 (24%)
- **Files with no analog (new pattern):** 2 (8%)

### Key Reusable Patterns Identified
1. **FastifyPluginAsync + ZodTypeProvider** — All backend routes follow this structure
2. **Zod schema composition** — Input + Full + Patch pattern is consistent across all entities
3. **Delete-guard with usage count** — Categories pattern extends to glassware; recipe count check added to categories
4. **TanStack Query hooks** — useQuery for reads, useMutation with onSettled invalidation for writes
5. **Antd Modal forms** — Create/edit flows with single component handling both modes
6. **Drizzle ORM query builder** — Consistent use of `select()`, `innerJoin()`, `leftJoin()`, FK constraints
7. **Error translation at boundary** — FK/UNIQUE constraint errors → 400/409 status codes, never raw SQLite errors

---

**Pattern mapping complete. Planner can now reference analog file paths and concrete code excerpts in PLAN.md files.**
