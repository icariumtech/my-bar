import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { eq } from 'drizzle-orm'
import { createTestDb } from '../db/test-helpers.js'
import { categories, ingredients } from '../db/schema.js'
import { ingredientsRoutes } from './ingredients.js'

describe('GET /api/ingredients', () => {
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
    app.register(ingredientsRoutes, { prefix: '/api/ingredients', db: testDb.db })
    return app
  }

  it('returns 200 with an empty array on an empty database', async () => {
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/ingredients' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('returns the ingredient joined to its category name, defaulting inStock true', async () => {
    const app = buildTestApp()

    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name: 'Dry Gin' }).run()

    const ingredientId = crypto.randomUUID()
    testDb.db
      .insert(ingredients)
      .values({ id: ingredientId, name: 'Bombay Sapphire Gin', categoryId, note: null })
      .run()

    const res = await app.inject({ method: 'GET', url: '/api/ingredients' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toHaveLength(1)
    expect(body[0]).toMatchObject({
      id: ingredientId,
      name: 'Bombay Sapphire Gin',
      categoryId,
      categoryName: 'Dry Gin',
      inStock: true,
    })
  })

  it('rejects inserting an ingredient whose category_id does not reference an existing category', () => {
    // Regression guard for 01-RESEARCH.md Pitfall 2: this fails
    // silently-passing (i.e. the insert would succeed) if the
    // `foreign_keys = ON` pragma is ever dropped from test-helpers.ts.
    expect(() => {
      testDb.db
        .insert(ingredients)
        .values({
          id: crypto.randomUUID(),
          name: 'Orphan Bottle',
          categoryId: crypto.randomUUID(), // no matching category row
          note: null,
        })
        .run()
    }).toThrow(/FOREIGN KEY constraint failed/i)
  })

  it('rejects deleting a category that still has ingredients referencing it', () => {
    // D-01/D-03: the database-level half of the "refuse" delete rule that
    // plan 01-04 surfaces to the UI as a 409.
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name: 'Dry Gin' }).run()
    testDb.db
      .insert(ingredients)
      .values({ id: crypto.randomUUID(), name: 'Bombay Sapphire Gin', categoryId, note: null })
      .run()

    expect(() => {
      testDb.db.delete(categories).where(eq(categories.id, categoryId)).run()
    }).toThrow(/FOREIGN KEY constraint failed/i)
  })
})
