import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { glassware, glasswareInput } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { glassware as glasswareTable } from '../db/schema.js'

interface GlasswareRoutesOptions extends FastifyPluginOptions {
  // Injection point for tests (src/routes/glassware.test.ts), same pattern
  // as categoriesRoutes — defaults to the real db in normal server boot.
  db?: typeof defaultDb
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
}
