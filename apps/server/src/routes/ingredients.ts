import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { ingredient, ingredientInput, ingredientPatch, stockPatch } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { categories, ingredients } from '../db/schema.js'

interface IngredientsRoutesOptions extends FastifyPluginOptions {
  // Injection point for tests (src/routes/ingredients.test.ts) so the route
  // can be exercised via .inject() against a temp-file test DB instead of
  // the production database — the plugin still defaults to the real db in
  // normal server bootstrap.
  db?: typeof defaultDb
}

// GET /api/ingredients — the one read path this tracer slice proves
// end-to-end. Uses Drizzle's query builder exclusively (never
// string-concatenated SQL — mitigation for threat T-01-01).
export const ingredientsRoutes: FastifyPluginAsync<IngredientsRoutesOptions> = async (
  app,
  opts,
) => {
  const db = opts.db ?? defaultDb

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: {
          200: z.array(ingredient),
        },
      },
    },
    async () => {
      const rows = db
        .select({
          id: ingredients.id,
          name: ingredients.name,
          categoryId: ingredients.categoryId,
          categoryName: categories.name,
          note: ingredients.note,
          inStock: ingredients.inStock,
        })
        .from(ingredients)
        .innerJoin(categories, eq(ingredients.categoryId, categories.id))
        .all()

      return rows
    },
  )

  // POST /api/ingredients — the write path INV-01 depends on. `schema.body`
  // reuses the shared `ingredientInput` Zod object (not a restated local
  // schema) so the client form and this route can never drift apart, and so
  // the `.max()` bounds keep mitigating threat T-01-02 at the boundary.
  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      schema: {
        body: ingredientInput,
        response: {
          201: ingredient,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const id = crypto.randomUUID()

      try {
        // D-09: inStock is left to the column default (true) rather than
        // being restated here, so "in stock by default" comes from one
        // place — the schema — not from application logic.
        db.insert(ingredients)
          .values({
            id,
            name: request.body.name,
            categoryId: request.body.categoryId,
            note: request.body.note ?? null,
          })
          .run()
      } catch (err) {
        // T-01-10: an unknown categoryId trips the FK constraint (enforced
        // by the `foreign_keys = ON` pragma) — translate that into a 400
        // rather than letting a raw 500 (with stack trace, T-01-11) escape.
        if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
          return reply.status(400).send({ error: 'Unknown category' })
        }
        throw err
      }

      const [created] = db
        .select({
          id: ingredients.id,
          name: ingredients.name,
          categoryId: ingredients.categoryId,
          categoryName: categories.name,
          note: ingredients.note,
          inStock: ingredients.inStock,
        })
        .from(ingredients)
        .innerJoin(categories, eq(ingredients.categoryId, categories.id))
        .where(eq(ingredients.id, id))
        .all()

      return reply.status(201).send(created)
    },
  )

  // PATCH /api/ingredients/:id — the owner-edit path (INV-02). `schema.body`
  // is the shared `ingredientPatch` contract (a partial of ingredientInput
  // that rejects an empty object), and `schema.params` constrains `id` to a
  // uuid string, matching the pattern the stock-toggle route below already
  // established. Only the fields present in the body are written; stock is
  // never touched here, since editing must never change stock state (D-08).
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: ingredientPatch,
        response: {
          200: ingredient,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const patch = request.body

      try {
        db.update(ingredients)
          .set({
            ...(patch.name !== undefined && { name: patch.name }),
            ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
            ...(patch.note !== undefined && { note: patch.note }),
          })
          .where(eq(ingredients.id, id))
          .run()
      } catch (err) {
        // T-01-10 (extended to edits): an unknown categoryId trips the FK
        // constraint — translate to 400 rather than a raw 500.
        if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
          return reply.status(400).send({ error: 'Unknown category' })
        }
        throw err
      }

      const [updated] = db
        .select({
          id: ingredients.id,
          name: ingredients.name,
          categoryId: ingredients.categoryId,
          categoryName: categories.name,
          note: ingredients.note,
          inStock: ingredients.inStock,
        })
        .from(ingredients)
        .innerJoin(categories, eq(ingredients.categoryId, categories.id))
        .where(eq(ingredients.id, id))
        .all()

      // An unknown id matches zero rows on the UPDATE above (a no-op, not an
      // error) — the empty SELECT here is what turns that into a 404 rather
      // than a false-success 200.
      if (!updated) {
        return reply.status(404).send({ error: 'Ingredient not found' })
      }

      return reply.status(200).send(updated)
    },
  )

  // PATCH /api/ingredients/:id/stock — the deferred swipe-toggle commit
  // (INV-03, D-08). `schema.body` is the narrow `stockPatch` contract (a
  // single boolean) so a toggle request cannot rename a bottle or reassign
  // its category (T-01-12), and `schema.params` constrains `id` to a uuid
  // string so a malformed id is rejected before it reaches the query layer
  // (T-01-13). Only the `inStock` column is written.
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id/stock',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: stockPatch,
        response: {
          200: ingredient,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      db.update(ingredients).set({ inStock: request.body.inStock }).where(eq(ingredients.id, id)).run()

      const [updated] = db
        .select({
          id: ingredients.id,
          name: ingredients.name,
          categoryId: ingredients.categoryId,
          categoryName: categories.name,
          note: ingredients.note,
          inStock: ingredients.inStock,
        })
        .from(ingredients)
        .innerJoin(categories, eq(ingredients.categoryId, categories.id))
        .where(eq(ingredients.id, id))
        .all()

      // T-01-14: an unmatched id must 404, not silently "succeed" — a
      // swipe that appears to work while writing nothing is exactly the
      // failure that makes the inventory untrustworthy.
      if (!updated) {
        return reply.status(404).send({ error: 'Ingredient not found' })
      }

      return reply.status(200).send(updated)
    },
  )
}
