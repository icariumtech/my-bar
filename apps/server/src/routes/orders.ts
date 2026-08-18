import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { asc, eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import type { Order, OrderStatus } from '@my-bar/shared'
import { order, orderInput } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { orders } from '../db/schema.js'
import { loadRecipe } from './recipes.js'

interface OrdersRoutesOptions extends FastifyPluginOptions {
  // Injection point for tests (src/routes/orders.test.ts) so the route can
  // be exercised via .inject() against a temp-file test DB instead of the
  // production database — the plugin still defaults to the real db in
  // normal server bootstrap.
  db?: typeof defaultDb
}

/**
 * Loads a single order row joined to its full recipe (via loadRecipe — the
 * single source of truth for the joined recipe shape and makeable
 * computation, never re-derived here) and computes elapsedSeconds
 * server-side (BART-04, floor never round/ceil).
 *
 * Throws if `orderId` does not match any row — callers only ever invoke
 * this with an id freshly read from `orders`, so a miss here indicates a
 * bug, not a valid 404 case (mirrors loadRecipe's own throw-on-miss
 * contract).
 */
function loadOrder(db: typeof defaultDb, orderId: string): Order {
  const [row] = db.select().from(orders).where(eq(orders.id, orderId)).all()

  if (!row) {
    throw new Error(`Order ${orderId} not found`)
  }

  const recipeObj = loadRecipe(db, row.recipeId)
  const elapsedSeconds = Math.floor((Date.now() - row.createdAt.getTime()) / 1000)

  return {
    id: row.id,
    recipe: recipeObj,
    patronName: row.patronName,
    status: row.status as OrderStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    elapsedSeconds,
  }
}

export const ordersRoutes: FastifyPluginAsync<OrdersRoutesOptions> = async (app, opts) => {
  const db = opts.db ?? defaultDb

  // T-04-01/T-04-02: POST /api/orders — the server recomputes overallStatus
  // itself via loadRecipe()/computeMakeable() at submit time and rejects
  // with 400 when the recipe is not currently green. The server never
  // trusts a client-supplied or cached makeable state.
  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      schema: {
        body: orderInput,
        response: {
          201: order,
          400: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      let recipeSnapshot
      try {
        recipeSnapshot = loadRecipe(db, request.body.recipeId)
      } catch {
        return reply.status(400).send({ error: 'Unknown recipe' })
      }

      if (recipeSnapshot.overallStatus !== 'green') {
        return reply.status(400).send({ error: 'Recipe is not currently makeable' })
      }

      // D-50/PATR-05: blank/whitespace-only patronName normalizes to null,
      // never stored as ''.
      const patronNameRaw = request.body.patronName?.trim()
      const patronName = patronNameRaw && patronNameRaw.length > 0 ? patronNameRaw : null

      const orderId = crypto.randomUUID()
      const now = new Date()

      try {
        db.insert(orders)
          .values({
            id: orderId,
            recipeId: request.body.recipeId,
            patronName,
            status: 'new',
            createdAt: now,
            updatedAt: now,
          })
          .run()
      } catch (err) {
        // Defensive — existence was already checked above via loadRecipe,
        // but keeps this route's error handling texture consistent with
        // every other route file's FK-violation-to-400 translation.
        if (err instanceof Error && /(FOREIGN KEY|UNIQUE) constraint failed/i.test(err.message)) {
          return reply.status(400).send({ error: 'Unknown recipe' })
        }
        throw err
      }

      // SYNC-01: `?.` is REQUIRED, not stylistic — orders.test.ts builds a
      // bare Fastify() with no hub registered for most describe blocks, so
      // `app.io` is undefined there; an unguarded `.emit()` would throw.
      app.io?.emit('orders:created', { orderId })

      return reply.status(201).send(loadOrder(db, orderId))
    },
  )

  // BART-04: GET /api/orders — open orders only (Pitfall 3 mitigation),
  // sorted ascending by createdAt with id as a stable secondary tiebreaker
  // for two orders created in the same millisecond.
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: {
          200: z.array(order),
        },
      },
    },
    async () => {
      const rows = db
        .select({ id: orders.id })
        .from(orders)
        .where(ne(orders.status, 'done'))
        .orderBy(asc(orders.createdAt), asc(orders.id))
        .all()
      return rows.map((r) => loadOrder(db, r.id))
    },
  )
}
