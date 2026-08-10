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

describe('POST /api/ingredients', () => {
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

  function seedCategory(name = 'Dry Gin') {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name }).run()
    return categoryId
  }

  it('creates an ingredient and reads back inStock true when the request omitted stock', async () => {
    const categoryId = seedCategory()
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/ingredients',
      payload: { name: 'Bombay Sapphire Gin', categoryId, note: '750ml' },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({
      name: 'Bombay Sapphire Gin',
      categoryId,
      categoryName: 'Dry Gin',
      note: '750ml',
      inStock: true,
    })
  })

  it('rejects a blank name with 400 before any database work', async () => {
    const categoryId = seedCategory()
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/ingredients',
      payload: { name: '', categoryId },
    })

    expect(res.statusCode).toBe(400)
  })

  it('rejects a name over the 200-character bound with 400', async () => {
    const categoryId = seedCategory()
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/ingredients',
      payload: { name: 'x'.repeat(201), categoryId },
    })

    expect(res.statusCode).toBe(400)
  })

  it('rejects an unknown categoryId with 400, not 500', async () => {
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/ingredients',
      payload: { name: 'Bombay Sapphire Gin', categoryId: crypto.randomUUID() },
    })

    expect(res.statusCode).toBe(400)
  })
})

describe('PATCH /api/ingredients/:id/stock', () => {
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

  function seedIngredient() {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name: 'Dry Gin' }).run()

    const ingredientId = crypto.randomUUID()
    testDb.db
      .insert(ingredients)
      .values({
        id: ingredientId,
        name: 'Bombay Sapphire Gin',
        categoryId,
        note: '750ml',
      })
      .run()

    return { ingredientId, categoryId }
  }

  it('toggles a seeded in-stock ingredient to false and persists it', async () => {
    const { ingredientId } = seedIngredient()
    const app = buildTestApp()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ingredients/${ingredientId}/stock`,
      payload: { inStock: false },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: ingredientId, inStock: false })

    const [row] = testDb.db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, ingredientId))
      .all()
    expect(row?.inStock).toBe(false)
  })

  it('toggles it back to true and persists it', async () => {
    const { ingredientId } = seedIngredient()
    const app = buildTestApp()

    await app.inject({
      method: 'PATCH',
      url: `/api/ingredients/${ingredientId}/stock`,
      payload: { inStock: false },
    })
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ingredients/${ingredientId}/stock`,
      payload: { inStock: true },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({ id: ingredientId, inStock: true })

    const [row] = testDb.db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, ingredientId))
      .all()
    expect(row?.inStock).toBe(true)
  })

  it('leaves name, categoryId and note unchanged by a stock toggle', async () => {
    const { ingredientId, categoryId } = seedIngredient()
    const app = buildTestApp()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ingredients/${ingredientId}/stock`,
      payload: { inStock: false },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      name: 'Bombay Sapphire Gin',
      categoryId,
      note: '750ml',
    })
  })

  it('returns 400 when the body omits inStock', async () => {
    const { ingredientId } = seedIngredient()
    const app = buildTestApp()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ingredients/${ingredientId}/stock`,
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when inStock is a string rather than a boolean', async () => {
    const { ingredientId } = seedIngredient()
    const app = buildTestApp()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ingredients/${ingredientId}/stock`,
      payload: { inStock: 'false' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when the id does not match any ingredient', async () => {
    const app = buildTestApp()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/ingredients/${crypto.randomUUID()}/stock`,
      payload: { inStock: false },
    })

    expect(res.statusCode).toBe(404)
  })
})
