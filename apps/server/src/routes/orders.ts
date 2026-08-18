import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { and, asc, eq, gte, ne, or } from 'drizzle-orm'
import { z } from 'zod'
import type { Order, OrderStatus } from '@my-bar/shared'
import { order, orderInput } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { orders } from '../db/schema.js'
import { loadRecipe } from './recipes.js'

// D-60: once marked done, a ticket stays visible in GET /api/orders for a
// bounded 5-minute window (inclusive) instead of vanishing instantly or
// accumulating forever (Pitfall 3: Done Orders Not Auto-Clearing Grows the
// Queue Unbounded).
const DONE_RETENTION_MS = 5 * 60 * 1000

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

  // BART-04/D-60: GET /api/orders — non-done orders (unconditionally
  // included) PLUS done orders whose updatedAt is within the
  // DONE_RETENTION_MS window (inclusive lower bound via gte, so an order
  // marked done exactly 5 minutes ago still shows), sorted ascending by
  // createdAt with id as a stable secondary tiebreaker for two orders
  // created in the same millisecond.
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
        .where(
          or(
            ne(orders.status, 'done'),
            and(eq(orders.status, 'done'), gte(orders.updatedAt, new Date(Date.now() - DONE_RETENTION_MS))),
          ),
        )
        .orderBy(asc(orders.createdAt), asc(orders.id))
        .all()
      return rows.map((r) => loadOrder(db, r.id))
    },
  )

  // BART-03/D-57: PATCH /:id/start — new -> in_progress. The conditional
  // write (only when existing.status === 'new') is what makes a repeat call
  // on an already-in_progress OR already-done order a true no-op: no
  // updatedAt bump, and critically, no regression of a 'done' order back to
  // 'in_progress'. The Socket.IO emit fires unconditionally — even a no-op
  // call is harmless for a client to re-fetch on (SYNC-02).
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id/start',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: order,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const [existing] = db
        .select({ id: orders.id, status: orders.status })
        .from(orders)
        .where(eq(orders.id, id))
        .all()

      if (!existing) {
        return reply.status(404).send({ error: 'Order not found' })
      }

      if (existing.status === 'new') {
        db.update(orders).set({ status: 'in_progress', updatedAt: new Date() }).where(eq(orders.id, id)).run()
      }

      app.io?.emit('orders:updated', { orderId: id })

      return reply.status(200).send(loadOrder(db, id))
    },
  )

  // BART-03/D-57: PATCH /:id/done — any non-done status -> done. The
  // conditional write (only when existing.status !== 'done') is what makes
  // a repeat call on an already-done order leave updatedAt untouched — the
  // D-60 retention window depends on updatedAt reflecting the ORIGINAL
  // completion time, not the most recent no-op call. T-04-10: this handler
  // never writes to the ingredients table — order fulfillment tracks ticket
  // status only, never a proxy for inventory depletion.
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id/done',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: order,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const [existing] = db
        .select({ id: orders.id, status: orders.status })
        .from(orders)
        .where(eq(orders.id, id))
        .all()

      if (!existing) {
        return reply.status(404).send({ error: 'Order not found' })
      }

      if (existing.status !== 'done') {
        db.update(orders).set({ status: 'done', updatedAt: new Date() }).where(eq(orders.id, id)).run()
      }

      app.io?.emit('orders:updated', { orderId: id })

      return reply.status(200).send(loadOrder(db, id))
    },
  )
}
