import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Recipe, RecipeIngredient } from '@my-bar/shared'
import { recipe, recipeInput, recipePatch, TAG_GROUP_ORDER } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import {
  categories,
  glassware,
  ingredients,
  recipeIngredients,
  recipeTags,
  recipes,
  tags,
} from '../db/schema.js'
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
export function loadRecipe(db: typeof defaultDb, recipeId: string): Recipe {
  const [row] = db
    .select({
      id: recipes.id,
      name: recipes.name,
      method: recipes.method,
      glasswareId: recipes.glasswareId,
      glasswareName: glassware.name,
      garnish: recipes.garnish,
      description: recipes.description,
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
      ingredientId: recipeIngredients.ingredientId,
      ingredientName: ingredients.name,
      requiresSpecific: recipeIngredients.requiresSpecific,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
      displayOrder: recipeIngredients.displayOrder,
    })
    .from(recipeIngredients)
    .innerJoin(categories, eq(recipeIngredients.categoryId, categories.id))
    // Nullable join — a category-only line has no ingredientId, so no
    // matching ingredients row (ingredientName resolves to null via
    // ingredientId's own nullability, not an inner-join miss).
    .leftJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(asc(recipeIngredients.displayOrder))
    .all()

  // D-33: tags join, sorted with the identical TAG_GROUP_ORDER-then-name
  // comparator used in tags.ts (small enough duplication to keep the two
  // route files independently readable — no shared helper for a
  // two-call-site, few-line comparator).
  const tagRows = db
    .select({ id: tags.id, name: tags.name, group: tags.group })
    .from(recipeTags)
    .innerJoin(tags, eq(recipeTags.tagId, tags.id))
    .where(eq(recipeTags.recipeId, recipeId))
    .all()
  const tagsResponse = tagRows.sort(
    (a, b) => TAG_GROUP_ORDER.indexOf(a.group) - TAG_GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name),
  )

  // MATCH-01/MATCH-05: tri-state status is computed exclusively here,
  // server-side — never in the browser. The route's own resolved `db`
  // (real or injected test db) is threaded through so status is computed
  // against the exact same data this response is built from.
  const {
    lines: lineStatuses,
    overallStatus,
    missingCategoryIds,
  } = computeMakeable(
    ingredientRows.map((r) => ({
      id: r.id,
      categoryId: r.categoryId,
      ingredientId: r.ingredientId,
      requiresSpecific: r.requiresSpecific,
    })),
    db,
  )
  const statusByLineId = new Map(lineStatuses.map((s) => [s.id, s]))

  const categoryNameById = new Map(ingredientRows.map((r) => [r.categoryId, r.categoryName]))
  const missingCategoryNames = missingCategoryIds.map(
    (categoryId) => categoryNameById.get(categoryId) ?? 'Unknown category',
  )

  const ingredientsResponse: RecipeIngredient[] = ingredientRows.map((r) => {
    const lineStatus = statusByLineId.get(r.id)
    return {
      id: r.id,
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      ingredientId: r.ingredientId,
      ingredientName: r.ingredientName,
      requiresSpecific: r.requiresSpecific,
      quantity: r.quantity,
      // `unit` is stored as a plain text column (schema.ts) — the enum
      // constraint lives at the Zod boundary on write, not a DB CHECK — so
      // this cast narrows a known-valid runtime value to the union type,
      // not bypassing any real validation.
      unit: r.unit as RecipeIngredient['unit'],
      displayOrder: r.displayOrder,
      status: lineStatus?.status ?? 'red',
      alternativeIngredientName: lineStatus?.alternativeIngredientName ?? null,
    }
  })

  return {
    id: row.id,
    name: row.name,
    ingredients: ingredientsResponse,
    method: JSON.parse(row.method) as string[],
    glasswareId: row.glasswareId,
    glasswareName: row.glasswareName,
    garnish: row.garnish,
    description: row.description,
    tags: tagsResponse,
    overallStatus,
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

  // D-39/03-04's useRecipeDetail: fetch a single recipe by id — Rule 2
  // auto-add. Missing from Phase 2 and required by this plan's own
  // must_haves ("GET /api/recipes and GET /api/recipes/:id both return a
  // tags array... and a description field") plus 03-04-PLAN.md's
  // useRecipeDetail hook, which already assumes this route exists. Same
  // existence-check-before-loadRecipe pattern PATCH uses below, since
  // loadRecipe throws (rather than returning undefined) on a miss.
  app.withTypeProvider<ZodTypeProvider>().get(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: recipe,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      const [existing] = db.select({ id: recipes.id }).from(recipes).where(eq(recipes.id, id)).all()
      if (!existing) {
        return reply.status(404).send({ error: 'Recipe not found' })
      }

      return reply.status(200).send(loadRecipe(db, id))
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
        // T-02-01/T-02-03/T-02.1-01/T-03-01: wrapped in a single
        // db.transaction() call (matching the PATCH handler's own
        // reasoning below) so a mid-loop FK failure on a later ingredient
        // line or tag rolls back the recipe insert and every ingredient
        // line already written — never a partially-created recipe row
        // committed to the database while the client is told the whole
        // request failed with a 400.
        db.transaction((tx) => {
          tx.insert(recipes)
            .values({
              id: recipeId,
              name: request.body.name,
              // D-16: method is stored as a JSON-stringified array of step
              // strings — returned as an array (never re-stringified) by
              // loadRecipe above.
              method: JSON.stringify(request.body.method),
              glasswareId: request.body.glasswareId ?? null,
              garnish: request.body.garnish ?? null,
              description: request.body.description ?? null,
              createdAt: now,
              updatedAt: now,
            })
            .run()

          // D-16: displayOrder preserves submitted ingredient-line order.
          // D-30/MATCH-05: ingredientId/requiresSpecific are persisted
          // exactly as submitted — a category-only line omits ingredientId
          // (persisted as null); requiresSpecific defaults to true (D-30).
          request.body.ingredients.forEach((ing, idx) => {
            tx.insert(recipeIngredients)
              .values({
                id: crypto.randomUUID(),
                recipeId,
                categoryId: ing.categoryId,
                ingredientId: ing.ingredientId ?? null,
                requiresSpecific: ing.requiresSpecific ?? true,
                quantity: ing.quantity,
                unit: ing.unit,
                displayOrder: idx,
              })
              .run()
          })

          // D-35: tags are optional at create time (owner assigns from
          // Barback, possibly later) — omitting tagIds creates a recipe with
          // tags: []. De-duplicated: a repeated id would otherwise trip the
          // recipe_tags UNIQUE(recipe_id, tag_id) constraint below.
          const tagIds = [...new Set(request.body.tagIds ?? [])]
          tagIds.forEach((tagId) => {
            tx.insert(recipeTags)
              .values({ id: crypto.randomUUID(), recipeId, tagId })
              .run()
          })
        })
      } catch (err) {
        // T-02-01/T-02-03/T-02.1-01/T-03-01: an unknown categoryId,
        // ingredientId, glasswareId, or tagId trips the FK constraint
        // (enforced by the `foreign_keys = ON` pragma) — translate that
        // into a 400 rather than letting a raw 500 (with SQLite's own
        // error text/stack) escape to the client.
        if (err instanceof Error && /(FOREIGN KEY|UNIQUE) constraint failed/i.test(err.message)) {
          return reply.status(400).send({ error: 'Unknown category, ingredient, glassware, or tag' })
        }
        throw err
      }

      // SYNC-01: `?.` is REQUIRED, not stylistic — recipes.test.ts builds a
      // bare Fastify() with no hub registered, so `app.io` is undefined
      // there; an unguarded `.emit()` would throw and break that whole
      // existing suite. Payload carries only the id — clients re-fetch via
      // REST, never trust a WS payload as the data itself.
      app.io?.emit('recipe:updated', { recipeId })

      return reply.status(201).send(loadRecipe(db, recipeId))
    },
  )

  // RECIPE-02: PATCH /api/recipes/:id — edit a recipe. `schema.body` reuses
  // the shared `recipePatch` contract (a `.partial()` of `recipeInput` that
  // rejects an empty object via `.refine()`), so PATCH `{}` is rejected with
  // 400 by validation alone, before any write. Only the fields present in
  // the body are written — mirrors the conditional-field-set pattern
  // `ingredients.ts`'s PATCH uses.
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: recipePatch,
        response: {
          200: recipe,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const patch = request.body

      try {
        // T-02-06: when `ingredients` is replaced, the delete-then-reinsert
        // is wrapped in a single db.transaction() call so a failed insert
        // mid-loop rolls back the delete too — never a partially-replaced
        // ingredient set. better-sqlite3's transaction wrapper is
        // synchronous and invoked immediately. D-33: the tag replace shares
        // this SAME transaction so a failure in either rolls back both,
        // extending the existing atomicity guarantee rather than adding a
        // second separate transaction. Omitting tagIds from a patch body
        // leaves the existing tag set untouched.
        const newIngredients = patch.ingredients
        const newTagIds = patch.tagIds
        if (newIngredients !== undefined || newTagIds !== undefined) {
          db.transaction((tx) => {
            if (newIngredients !== undefined) {
              tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id)).run()
              newIngredients.forEach((ing, idx) => {
                tx.insert(recipeIngredients)
                  .values({
                    id: crypto.randomUUID(),
                    recipeId: id,
                    categoryId: ing.categoryId,
                    ingredientId: ing.ingredientId ?? null,
                    requiresSpecific: ing.requiresSpecific ?? true,
                    quantity: ing.quantity,
                    unit: ing.unit,
                    displayOrder: idx,
                  })
                  .run()
              })
            }

            if (newTagIds !== undefined) {
              tx.delete(recipeTags).where(eq(recipeTags.recipeId, id)).run()
              // De-duplicated: a repeated id would otherwise trip the
              // recipe_tags UNIQUE(recipe_id, tag_id) constraint below.
              ;[...new Set(newTagIds)].forEach((tagId) => {
                tx.insert(recipeTags)
                  .values({ id: crypto.randomUUID(), recipeId: id, tagId })
                  .run()
              })
            }
          })
        }

        db.update(recipes)
          .set({
            ...(patch.name !== undefined && { name: patch.name }),
            ...(patch.method !== undefined && { method: JSON.stringify(patch.method) }),
            ...(patch.glasswareId !== undefined && { glasswareId: patch.glasswareId }),
            ...(patch.garnish !== undefined && { garnish: patch.garnish }),
            ...(patch.description !== undefined && { description: patch.description }),
            updatedAt: new Date(),
          })
          .where(eq(recipes.id, id))
          .run()
      } catch (err) {
        // T-02-08/T-02.1-01/T-03-01: an unknown categoryId or ingredientId
        // (in a replaced ingredients array), an unknown glasswareId, or an
        // unknown tagId (in a replaced tagIds array) trips the FK
        // constraint — translate to 400 rather than letting a raw 500
        // escape.
        if (err instanceof Error && /(FOREIGN KEY|UNIQUE) constraint failed/i.test(err.message)) {
          return reply.status(400).send({ error: 'Unknown category, ingredient, glassware, or tag' })
        }
        throw err
      }

      // An unknown id matches zero rows on the UPDATE above (a no-op, not an
      // error) — checked directly here (rather than relying on loadRecipe's
      // return, which throws on a miss) so an unknown id becomes a 404
      // instead of an uncaught exception.
      const [existing] = db.select({ id: recipes.id }).from(recipes).where(eq(recipes.id, id)).all()
      if (!existing) {
        return reply.status(404).send({ error: 'Recipe not found' })
      }

      // SYNC-01: same optional-chaining requirement as the POST handler
      // above — a no-op when no hub is registered (bare-Fastify test apps).
      app.io?.emit('recipe:updated', { recipeId: id })

      return reply.status(200).send(loadRecipe(db, id))
    },
  )

  // RECIPE-02: DELETE /api/recipes/:id — delete a recipe. Unlike
  // categories/glassware, recipes have no downstream reference-count guard
  // to build (nothing else references recipes.id except recipeIngredients,
  // which is onDelete: 'cascade') — the cascade is the DB's job, no manual
  // recipeIngredients delete is added here.
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          204: z.void(),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      const [existing] = db.select({ id: recipes.id }).from(recipes).where(eq(recipes.id, id)).all()
      // T-02-09: repeated DELETE on an already-gone id must 404, never a
      // false-success 204.
      if (!existing) {
        return reply.status(404).send({ error: 'Recipe not found' })
      }

      db.delete(recipes).where(eq(recipes.id, id)).run()

      // SYNC-01: same optional-chaining requirement as above — a no-op
      // when no hub is registered (bare-Fastify test apps).
      app.io?.emit('recipe:updated', { recipeId: id })

      return reply.status(204).send()
    },
  )
}
