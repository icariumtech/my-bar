import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { ingredient } from '@my-bar/shared'
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
}
