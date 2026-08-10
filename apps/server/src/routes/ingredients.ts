import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { ingredient, ingredientInput } from '@my-bar/shared'
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
}
