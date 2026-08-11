import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Recipe, RecipeIngredient } from '@my-bar/shared'
import { recipe, recipeInput } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { categories, glassware, recipeIngredients, recipes } from '../db/schema.js'
import { computeMakeable } from '../services/makeableEngine.js'

interface RecipesRoutesOptions extends FastifyPluginOptions {
  // Injection point for tests (src/routes/recipes.test.ts) so the route can
  // be exercised via .inject() against a temp-file test DB instead of the
  // production database — the plugin still defaults to the real db in
  // normal server bootstrap.
  db?: typeof defaultDb
}

/**
 * Loads a single recipe row joined to its glassware and ingredient lines
 * (joined to categories), computes makeable status server-side via
 * computeMakeable(), and maps missingCategoryIds to missingCategoryNames
 * (MATCH-02). Every missing id is necessarily one of the recipe's own
 * required categories, so the ingredient-line category rows already fetched
 * are sufficient — no extra query is needed to resolve the names.
 *
 * Throws if `recipeId` does not match any row — callers only ever invoke
 * this with an id freshly read from `recipes`, so a miss here indicates a
 * bug, not a valid 404 case.
 */
function loadRecipe(db: typeof defaultDb, recipeId: string): Recipe {
  const [row] = db
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
    .where(eq(recipes.id, recipeId))
    .all()

  if (!row) {
    throw new Error(`Recipe ${recipeId} not found`)
  }

  const ingredientRows = db
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
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.displayOrder))
    .all()

  const requiredCategoryIds = ingredientRows.map((r) => r.categoryId)
  // MATCH-01: makeable is computed exclusively here, server-side — never in
  // the browser. The route's own resolved `db` (real or injected test db)
  // is threaded through so makeable status is computed against the exact
  // same data this response is built from.
  const { makeable, missingCategoryIds } = computeMakeable(requiredCategoryIds, db)

  const categoryNameById = new Map(ingredientRows.map((r) => [r.categoryId, r.categoryName]))
  const missingCategoryNames = missingCategoryIds.map(
    (categoryId) => categoryNameById.get(categoryId) ?? 'Unknown category',
  )

  return {
    id: row.id,
    name: row.name,
    // `unit` is stored as a plain text column (schema.ts) — the enum
    // constraint lives at the Zod boundary on write, not a DB CHECK — so
    // the cast below is narrowing a known-valid runtime value back to the
    // RecipeIngredient union type, not bypassing any real validation.
    ingredients: ingredientRows as RecipeIngredient[],
    method: JSON.parse(row.method) as string[],
    glasswareId: row.glasswareId,
    glasswareName: row.glasswareName,
    garnish: row.garnish,
    makeable,
    missingCategoryIds,
    missingCategoryNames,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export const recipesRoutes: FastifyPluginAsync<RecipesRoutesOptions> = async (app, opts) => {
  const db = opts.db ?? defaultDb

  // RECIPE-01/MATCH-01: GET /api/recipes — every recipe with computed
  // makeable status, never client-computed (D-15: shown inline per row).
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
      const rows = db.select({ id: recipes.id }).from(recipes).orderBy(asc(recipes.name)).all()
      return rows.map((r) => loadRecipe(db, r.id))
    },
  )

  // RECIPE-01: POST /api/recipes — create a recipe. `schema.body` reuses
  // the shared `recipeInput` Zod object (not a restated local schema) so
  // the `.min(1)` empty-input rejections and `.max()` DoS bounds (T-02-02)
  // stay in one place.
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
        db.insert(recipes)
          .values({
            id: recipeId,
            name: request.body.name,
            // D-16: method is stored as a JSON-stringified array of step
            // strings — returned as an array (never re-stringified) by
            // loadRecipe above.
            method: JSON.stringify(request.body.method),
            glasswareId: request.body.glasswareId ?? null,
            garnish: request.body.garnish ?? null,
            createdAt: now,
            updatedAt: now,
          })
          .run()

        // D-16: displayOrder preserves submitted ingredient-line order.
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
        // T-02-01/T-02-03: an unknown categoryId or glasswareId trips the
        // FK constraint (enforced by the `foreign_keys = ON` pragma) —
        // translate that into a 400 rather than letting a raw 500 (with
        // SQLite's own error text/stack) escape to the client.
        if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
          return reply.status(400).send({ error: 'Unknown category or glassware' })
        }
        throw err
      }

      return reply.status(201).send(loadRecipe(db, recipeId))
    },
  )
}
