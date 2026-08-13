import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client'
import { createTestDb } from '../db/test-helpers.js'
import { categories, ingredients } from '../db/schema.js'
import { ingredientsRoutes } from '../routes/ingredients.js'
import { recipesRoutes } from '../routes/recipes.js'
import { registerSocketHub } from './hub.js'

// Real-listening-server integration tests — NOT mocked `io.emit()` calls.
// Socket.IO needs an actually-accepted TCP connection to deliver events;
// Fastify's `.inject()` bypasses the listener entirely and would let this
// suite pass vacuously even if the hub were never wired up.
describe('Socket.IO hub — real client, real listening server', () => {
  let testDb: ReturnType<typeof createTestDb>
  let app: FastifyInstance
  let client: ClientSocket
  let baseUrl: string

  beforeEach(async () => {
    testDb = createTestDb()

    app = Fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.register(ingredientsRoutes, { prefix: '/api/ingredients', db: testDb.db })
    app.register(recipesRoutes, { prefix: '/api/recipes', db: testDb.db })
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

  function seedIngredient() {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name: 'Dry Gin' }).run()

    const ingredientId = crypto.randomUUID()
    testDb.db
      .insert(ingredients)
      .values({ id: ingredientId, name: 'Bombay Sapphire Gin', categoryId, note: null })
      .run()

    return { ingredientId, categoryId }
  }

  it('emits inventory:changed to a connected client after an ingredient stock PATCH', async () => {
    const { ingredientId } = seedIngredient()

    const eventReceived = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for inventory:changed')), 2000)
      client.once('inventory:changed', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    const res = await fetch(`${baseUrl}/api/ingredients/${ingredientId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inStock: false }),
    })
    expect(res.status).toBe(200)

    await expect(eventReceived).resolves.toBeUndefined()
  })

  it('emits recipe:updated with the created recipe id after a recipe POST', async () => {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name: 'Dry Gin' }).run()
    seedIngredient()

    const eventReceived = new Promise<{ recipeId: string }>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for recipe:updated')), 2000)
      client.once('recipe:updated', (payload: { recipeId: string }) => {
        clearTimeout(timeout)
        resolve(payload)
      })
    })

    const res = await fetch(`${baseUrl}/api/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Martini',
        ingredients: [{ categoryId, quantity: '2', unit: 'oz' }],
        method: ['Stir'],
      }),
    })
    expect(res.status).toBe(201)
    const created = (await res.json()) as { id: string }

    const payload = await eventReceived
    expect(payload.recipeId).toBe(created.id)
  })
})
