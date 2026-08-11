import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { glassware, glasswareInput } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { glassware as glasswareTable, recipes } from '../db/schema.js'

interface GlasswareRoutesOptions extends FastifyPluginOptions {
  // Injection point for tests (src/routes/glassware.test.ts), same pattern
  // as categoriesRoutes — defaults to the real db in normal server boot.
  db?: typeof defaultDb
}

// D-22 Copywriting Contract: the exact refusal copy for an in-use glassware
// delete, with the real recipe count substituted in — shared between the
// pre-count fast path and the race-condition fallback below so the two can
// never phrase the same case differently.
function inUseMessage(count: number) {
  return `This glassware is used by ${count} recipe(s) — remove or reassign them first.`
}

// D-17: glassware create/list/rename lives on its own plugin, mirroring
// categoriesRoutes exactly — a curated, owner-managed list so recipe
// glassware values stay consistent across the collection.
export const glasswareRoutes: FastifyPluginAsync<GlasswareRoutesOptions> = async (app, opts) => {
  const db = opts.db ?? defaultDb

  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: {
          200: z.array(glassware),
        },
      },
    },
    async () => {
      return db.select().from(glasswareTable).orderBy(asc(glasswareTable.name)).all()
    },
  )

  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      schema: {
        body: glasswareInput,
        response: {
          201: glassware,
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const id = crypto.randomUUID()

      try {
        // D-17: glassware.name is UNIQUE — the constraint that keeps the
        // curated list typo-proof, mirroring D-01's category pattern.
        db.insert(glasswareTable).values({ id, name: request.body.name }).run()
      } catch (err) {
        // T-02-10: translate the raw SQLite unique-constraint error into a
        // fixed 409 message — never let SQLite's error text/stack escape.
        if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) {
          return reply.status(409).send({ error: 'Glassware already exists' })
        }
        throw err
      }

      return reply.status(201).send({ id, name: request.body.name })
    },
  )

  // PATCH /api/glassware/:id — rename (D-17). Recipes reference glassware by
  // id, never a copied name, so a rename here propagates for free.
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: glasswareInput,
        response: {
          200: glassware,
          404: z.object({ error: z.string() }),
          409: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params

      try {
        db.update(glasswareTable)
          .set({ name: request.body.name })
          .where(eq(glasswareTable.id, id))
          .run()
      } catch (err) {
        // D-17: a rename colliding with another glassware entry's name trips
        // the same UNIQUE constraint as create — translate to 409, never a
        // raw 500 with SQLite's own error text (T-02-12).
        if (err instanceof Error && /UNIQUE constraint failed/i.test(err.message)) {
          return reply.status(409).send({ error: 'Glassware already exists' })
        }
        throw err
      }

      const [updated] = db.select().from(glasswareTable).where(eq(glasswareTable.id, id)).all()

      // An unknown id matches zero rows on the UPDATE (a no-op, not an
      // error) — the empty SELECT here turns that into a 404.
      if (!updated) {
        return reply.status(404).send({ error: 'Glassware not found' })
      }

      return reply.status(200).send(updated)
    },
  )

  // DELETE /api/glassware/:id — refuse-only delete (D-22, T-02-11). The
  // schema's FK `onDelete: 'set null'` on recipes.glasswareId is a defensive
  // fallback only — the real UX-facing block is this route's pre-count.
  // Because a check-then-act pair can be raced by a concurrent recipe
  // insert, the delete itself is also wrapped and a re-count is done on any
  // unexpected constraint failure so a stale pre-count is never trusted.
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

      const [existing] = db.select().from(glasswareTable).where(eq(glasswareTable.id, id)).all()
      if (!existing) {
        return reply.status(404).send({ error: 'Glassware not found' })
      }

      const [{ recipeCount }] = db
        .select({ recipeCount: sql<number>`count(*)` })
        .from(recipes)
        .where(eq(recipes.glasswareId, id))
        .all()

      if (recipeCount > 0) {
        return reply.status(409).send({ error: inUseMessage(recipeCount), recipeCount })
      }

      try {
        db.delete(glasswareTable).where(eq(glasswareTable.id, id)).run()
      } catch (err) {
        if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
          // T-02-11: a racing recipe insert landed between the pre-count
          // above and this delete — re-count for an accurate message rather
          // than trusting the now-stale pre-count.
          const [{ recipeCount: raceRecipeCount }] = db
            .select({ recipeCount: sql<number>`count(*)` })
            .from(recipes)
            .where(eq(recipes.glasswareId, id))
            .all()
          return reply
            .status(409)
            .send({ error: inUseMessage(raceRecipeCount), recipeCount: raceRecipeCount })
        }
        throw err
      }

      return reply.status(204).send()
    },
  )
}
