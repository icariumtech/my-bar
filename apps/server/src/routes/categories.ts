import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc } from 'drizzle-orm'
import { z } from 'zod'
import { category, categoryInput } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { categories } from '../db/schema.js'

interface CategoriesRoutesOptions extends FastifyPluginOptions {
  // Injection point for tests (src/routes/categories.test.ts), same pattern
  // as ingredientsRoutes — defaults to the real db in normal server boot.
  db?: typeof defaultDb
}

// D-03: category create/list lives on its own plugin so the owner can build
// their taxonomy from a bar with zero categories — the add-ingredient flow
// depends on this existing before the very first bottle can be added.
export const categoriesRoutes: FastifyPluginAsync<CategoriesRoutesOptions> = async (
  app,
  opts,
) => {
  const db = opts.db ?? defaultDb

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: {
          200: z.array(category),
        },
      },
    },
    async () => {
      return db.select().from(categories).orderBy(asc(categories.name)).all()
    },
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      schema: {
        body: categoryInput,
        response: {
          201: category,
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const id = crypto.randomUUID()

      try {
        // D-01: categories.name is UNIQUE — the constraint that keeps the
        // curated taxonomy typo-proof for Phase 2's makeable matching.
        db.insert(categories).values({ id, name: request.body.name }).run()
      } catch (err) {
        // T-01-11: translate the raw SQLite unique-constraint error into a
        // fixed 409 message — never let SQLite's error text/stack escape.
        if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) {
          return reply.status(409).send({ error: 'Category already exists' })
        }
        throw err
      }

      return reply.status(201).send({ id, name: request.body.name })
    },
  )
}
