import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client'
import { sql } from 'drizzle-orm'
import { createTestDb } from '../db/test-helpers.js'
import { categories, ingredients, orders, recipeIngredients, recipes } from '../db/schema.js'
import { recipesRoutes } from './recipes.js'
import { ordersRoutes } from './orders.js'
import { registerSocketHub } from '../ws/hub.js'

describe('POST/GET /api/orders', () => {
  let testDb: ReturnType<typeof createTestDb>

  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  function buildTestApp() {
    const app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.register(recipesRoutes, { prefix: '/api/recipes', db: testDb.db })
    app.register(ordersRoutes, { prefix: '/api/orders', db: testDb.db })
    return app
  }

  // Seeds a category with one in-stock ingredient and a recipe requiring
  // only that category — overallStatus resolves 'green' via computeMakeable().
  function seedMakeableRecipe(name = 'Old Fashioned') {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name: `${name}-category` }).run()
    testDb.db
      .insert(ingredients)
      .values({ id: crypto.randomUUID(), name: 'Bottle', categoryId, note: null, inStock: true })
      .run()
    const recipeId = crypto.randomUUID()
    const now = new Date()
    testDb.db
      .insert(recipes)
      .values({
        id: recipeId,
        name,
        method: JSON.stringify(['Stir']),
        glasswareId: null,
        garnish: null,
        description: null,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    testDb.db
      .insert(recipeIngredients)
      .values({
        id: crypto.randomUUID(),
        recipeId,
        categoryId,
        quantity: '2',
        unit: 'oz',
        displayOrder: 0,
        ingredientId: null,
        requiresSpecific: false,
      })
      .run()
    return recipeId
  }

  // Seeds a recipe whose required category has zero in-stock ingredients —
  // overallStatus resolves 'red'.
  function seedNotMakeableRecipe(name = 'Martini') {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name: `${name}-category` }).run()
    const recipeId = crypto.randomUUID()
    const now = new Date()
    testDb.db
      .insert(recipes)
      .values({
        id: recipeId,
        name,
        method: JSON.stringify(['Stir']),
        glasswareId: null,
        garnish: null,
        description: null,
        createdAt: now,
        updatedAt: now,
      })
      .run()
    testDb.db
      .insert(recipeIngredients)
      .values({
        id: crypto.randomUUID(),
        recipeId,
        categoryId,
        quantity: '2',
        unit: 'oz',
        displayOrder: 0,
        ingredientId: null,
        requiresSpecific: false,
      })
      .run()
    return recipeId
  }

  it('GET /api/orders on an empty database returns 200 []', async () => {
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/orders' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('POST /api/orders with a makeable recipe returns 201 with the full embedded recipe, status new, patronName null, non-negative elapsedSeconds', async () => {
    const recipeId = seedMakeableRecipe()
    const app = buildTestApp()

    const res = await app.inject({ method: 'POST', url: '/api/orders', payload: { recipeId } })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.recipe.id).toBe(recipeId)
    expect(body.recipe.overallStatus).toBe('green')
    expect(body.status).toBe('new')
    expect(body.patronName).toBeNull()
    expect(typeof body.elapsedSeconds).toBe('number')
    expect(body.elapsedSeconds).toBeGreaterThanOrEqual(0)
  })

  it('POST /api/orders trims a whitespace-padded patronName', async () => {
    const recipeId = seedMakeableRecipe()
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: { recipeId, patronName: '  Alice  ' },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().patronName).toBe('Alice')
  })

  it('POST /api/orders normalizes an empty/whitespace-only patronName to null', async () => {
    const recipeId = seedMakeableRecipe()
    const app = buildTestApp()

    const resEmpty = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: { recipeId, patronName: '' },
    })
    expect(resEmpty.statusCode).toBe(201)
    expect(resEmpty.json().patronName).toBeNull()

    const resWhitespace = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: { recipeId, patronName: '   ' },
    })
    expect(resWhitespace.statusCode).toBe(201)
    expect(resWhitespace.json().patronName).toBeNull()
  })

  it('POST /api/orders for a not-currently-makeable recipe returns 400 and inserts no row', async () => {
    const recipeId = seedNotMakeableRecipe()
    const app = buildTestApp()

    const res = await app.inject({ method: 'POST', url: '/api/orders', payload: { recipeId } })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Recipe is not currently makeable' })

    const [{ count }] = testDb.db.select({ count: sql<number>`count(*)` }).from(orders).all()
    expect(count).toBe(0)
  })

  it('POST /api/orders with an unknown recipeId returns 400', async () => {
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/orders',
      payload: { recipeId: crypto.randomUUID() },
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toEqual({ error: 'Unknown recipe' })
  })

  it('GET /api/orders excludes done orders', async () => {
    const recipeId = seedMakeableRecipe()
    const now = new Date()
    testDb.db
      .insert(orders)
      .values({
        id: crypto.randomUUID(),
        recipeId,
        patronName: null,
        status: 'done',
        createdAt: now,
        updatedAt: now,
      })
      .run()
    const newOrderId = crypto.randomUUID()
    testDb.db
      .insert(orders)
      .values({
        id: newOrderId,
        recipeId,
        patronName: null,
        status: 'new',
        createdAt: now,
        updatedAt: now,
      })
      .run()

    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/orders' })

    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<{ id: string }>
    expect(body).toHaveLength(1)
    expect(body[0]?.id).toBe(newOrderId)
  })

  it('GET /api/orders sorts ascending by createdAt regardless of insertion order', async () => {
    const recipeId = seedMakeableRecipe()
    const earlier = new Date('2026-01-01T00:00:00Z')
    const later = new Date('2026-01-01T00:05:00Z')

    // Insert the LATER-timestamped order first, so insertion order and
    // createdAt order genuinely disagree.
    const laterOrderId = crypto.randomUUID()
    testDb.db
      .insert(orders)
      .values({
        id: laterOrderId,
        recipeId,
        patronName: null,
        status: 'new',
        createdAt: later,
        updatedAt: later,
      })
      .run()
    const earlierOrderId = crypto.randomUUID()
    testDb.db
      .insert(orders)
      .values({
        id: earlierOrderId,
        recipeId,
        patronName: null,
        status: 'new',
        createdAt: earlier,
        updatedAt: earlier,
      })
      .run()

    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/orders' })

    expect(res.statusCode).toBe(200)
    const body = res.json() as Array<{ id: string }>
    expect(body.map((o) => o.id)).toEqual([earlierOrderId, laterOrderId])
  })
})

// Real-listening-server integration test (mirrors hub.test.ts exactly) —
// never .inject(), a real socket.io-client connection against a real
// app.listen({ port: 0 }) server.
describe('Socket.IO — orders:created, real client, real listening server', () => {
  let testDb: ReturnType<typeof createTestDb>
  let app: FastifyInstance
  let client: ClientSocket
  let baseUrl: string

  beforeEach(async () => {
    testDb = createTestDb()

    app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.register(recipesRoutes, { prefix: '/api/recipes', db: testDb.db })
    app.register(ordersRoutes, { prefix: '/api/orders', db: testDb.db })
    registerSocketHub(app)

    await app.listen({ port: 0 })
    const address = app.server.address()
    if (address === null || typeof address === 'string') {
      throw new Error('Expected app.server.address() to return an AddressInfo')
    }
    baseUrl = `http://127.0.0.1:${address.port}`

    client = ioClient(baseUrl)
    await new Promise<void>((resolve) => client.on('connect', () => resolve()))
  })

  afterEach(async () => {
    client.close()
    await app.close()
    testDb.cleanup()
  })

  it('emits orders:created with { orderId } matching the created order after a successful POST /api/orders', async () => {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name: 'Dry Gin' }).run()
    testDb.db
      .insert(ingredients)
      .values({ id: crypto.randomUUID(), name: 'Bombay Sapphire Gin', categoryId, note: null, inStock: true })
      .run()

    const createRecipeRes = await fetch(`${baseUrl}/api/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Martini',
        ingredients: [{ categoryId, quantity: '2', unit: 'oz' }],
        method: ['Stir'],
      }),
    })
    expect(createRecipeRes.status).toBe(201)
    const createdRecipe = (await createRecipeRes.json()) as { id: string }

    const eventReceived = new Promise<{ orderId: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for orders:created')), 2000)
      client.once('orders:created', (payload: { orderId: string }) => {
        clearTimeout(timeout)
        resolve(payload)
      })
    })

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId: createdRecipe.id }),
    })
    expect(res.status).toBe(201)
    const createdOrder = (await res.json()) as { id: string }

    const payload = await eventReceived
    expect(payload.orderId).toBe(createdOrder.id)
  })
})
