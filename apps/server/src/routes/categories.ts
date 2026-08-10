import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { category, categoryInput } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { categories, ingredients } from '../db/schema.js'

// D-03 Copywriting Contract: the exact refusal copy for an in-use category
// delete, with the real count substituted in — shared between the
// pre-count fast path and the race-condition fallback below so the two
// can never phrase the same case differently.
function inUseMessage(count: number) {
  return `This category is used by ${count} ingredient(s) — reassign or remove them first.`
}

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

  // PATCH /api/categories/:id — rename (D-03). Ingredients reference the
  // category by id, never a copied name (D-01), so a rename here propagates
  // to every ingredient's `categoryName` in GET /api/ingredients for free.
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: categoryInput,
        response: {
          200: category,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      try {
        db.update(categories).set({ name: request.body.name }).where(eq(categories.id, id)).run()
      } catch (err) {
        // D-01: a rename colliding with another category's name trips the
        // same UNIQUE constraint as create — translate to 409, never a raw
        // 500 with SQLite's own error text (T-01-11).
        if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) {
          return reply.status(409).send({ error: 'Category already exists' })
        }
        throw err
      }

      const [updated] = db.select().from(categories).where(eq(categories.id, id)).all()

      // An unknown id matches zero rows on the UPDATE (a no-op, not an
      // error) — the empty SELECT here turns that into a 404.
      if (!updated) {
        return reply.status(404).send({ error: 'Category not found' })
      }

      return reply.status(200).send(updated)
    },
  )

  // DELETE /api/categories/:id — refuse-only delete (D-03, T-01-16). The
  // real enforcement is the schema's FK `onDelete: 'restrict'` rule under
  // `foreign_keys = ON`; the pre-count below only builds the client-facing
  // message. Because a check-then-act pair can be raced by a concurrent
  // insert, the delete itself is also wrapped and a constraint error is
  // translated into the same 409 shape — the count is never trusted as the
  // sole guard.
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          204: z.void(),
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string(), ingredientCount: z.number() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      const [existing] = db.select().from(categories).where(eq(categories.id, id)).all()
      if (!existing) {
        return reply.status(404).send({ error: 'Category not found' })
      }

      const [{ ingredientCount }] = db
        .select({ ingredientCount: sql<number>`count(*)` })
        .from(ingredients)
        .where(eq(ingredients.categoryId, id))
        .all()

      if (ingredientCount > 0) {
        return reply.status(409).send({ error: inUseMessage(ingredientCount), ingredientCount })
      }

      try {
        db.delete(categories).where(eq(categories.id, id)).run()
      } catch (err) {
        if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
          // T-01-16: a racing insert landed between the pre-count above and
          // this delete — re-count for an accurate message rather than
          // trusting the now-stale pre-count.
          const [{ ingredientCount: raceCount }] = db
            .select({ ingredientCount: sql<number>`count(*)` })
            .from(ingredients)
            .where(eq(ingredients.categoryId, id))
            .all()
          return reply.status(409).send({ error: inUseMessage(raceCount), ingredientCount: raceCount })
        }
        throw err
      }

      return reply.status(204).send()
    },
  )
}
