import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { createTestDb } from '../db/test-helpers.js'
import { categories, ingredients } from '../db/schema.js'
import { categoriesRoutes } from './categories.js'
import { ingredientsRoutes } from './ingredients.js'

describe('categories routes', () => {
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
    app.register(categoriesRoutes, { prefix: '/api/categories', db: testDb.db })
    return app
  }

  // Only used by the rename-propagation regression test, which needs to
  // assert through GET /api/ingredients — every other test only needs the
  // categories plugin alone.
  function buildCombinedTestApp() {
    const app = buildTestApp()
    app.register(ingredientsRoutes, { prefix: '/api/ingredients', db: testDb.db })
    return app
  }

  describe('GET /api/categories', () => {
    it('returns 200 with an empty array on an empty database', async () => {
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: '/api/categories' })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual([])
    })
  })

  describe('POST /api/categories', () => {
    it('creates a category and returns 201', async () => {
      const app = buildTestApp()

      const res = await app.inject({
        method: 'POST',
        url: '/api/categories',
        payload: { name: 'Dry Gin' },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({ name: 'Dry Gin' })
    })

    it('rejects a duplicate category name with 409, not a duplicate row', async () => {
      // D-01: categories.name is UNIQUE — a repeat name must not create a
      // second row that lets the taxonomy silently typo-drift.
      const app = buildTestApp()

      const first = await app.inject({
        method: 'POST',
        url: '/api/categories',
        payload: { name: 'Dry Gin' },
      })
      expect(first.statusCode).toBe(201)

      const second = await app.inject({
        method: 'POST',
        url: '/api/categories',
        payload: { name: 'Dry Gin' },
      })
      expect(second.statusCode).toBe(409)

      const list = await app.inject({ method: 'GET', url: '/api/categories' })
      expect(list.json()).toHaveLength(1)
    })
  })

  describe('PATCH /api/categories/:id', () => {
    function seedCategory(name = 'Dry Gin') {
      const categoryId = crypto.randomUUID()
      testDb.db.insert(categories).values({ id: categoryId, name }).run()
      return categoryId
    }

    it('renames a category and returns 200', async () => {
      const categoryId = seedCategory()
      const app = buildTestApp()

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/categories/${categoryId}`,
        payload: { name: 'Gin' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ id: categoryId, name: 'Gin' })
    })

    it('propagates a rename to every ingredient in that category through GET /api/ingredients', async () => {
      // D-01: ingredients reference the category by id, never a copied
      // name — this is the regression guard that keeps it that way.
      const categoryId = seedCategory()
      const ingredientId = crypto.randomUUID()
      testDb.db
        .insert(ingredients)
        .values({ id: ingredientId, name: 'Bombay Sapphire Gin', categoryId, note: null })
        .run()

      const app = buildCombinedTestApp()

      const rename = await app.inject({
        method: 'PATCH',
        url: `/api/categories/${categoryId}`,
        payload: { name: 'Gin' },
      })
      expect(rename.statusCode).toBe(200)

      const list = await app.inject({ method: 'GET', url: '/api/ingredients' })
      const body = list.json()
      expect(body).toHaveLength(1)
      expect(body[0]).toMatchObject({ id: ingredientId, categoryName: 'Gin' })
    })

    it('rejects renaming onto an existing category name with 409', async () => {
      seedCategory('Dry Gin')
      const otherId = seedCategory('Vodka')
      const app = buildTestApp()

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/categories/${otherId}`,
        payload: { name: 'Dry Gin' },
      })

      expect(res.statusCode).toBe(409)
    })

    it('returns 404 for an unknown category id', async () => {
      const app = buildTestApp()

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/categories/${crypto.randomUUID()}`,
        payload: { name: 'Gin' },
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/categories/:id', () => {
    function seedCategory(name = 'Dry Gin') {
      const categoryId = crypto.randomUUID()
      testDb.db.insert(categories).values({ id: categoryId, name }).run()
      return categoryId
    }

    it('deletes an unused category and returns 204', async () => {
      const categoryId = seedCategory()
      const app = buildTestApp()

      const res = await app.inject({ method: 'DELETE', url: `/api/categories/${categoryId}` })

      expect(res.statusCode).toBe(204)

      const list = await app.inject({ method: 'GET', url: '/api/categories' })
      expect(list.json()).toEqual([])
    })

    it('refuses to delete a category with two ingredients, with an accurate ingredientCount, leaving both intact', async () => {
      const categoryId = seedCategory()
      testDb.db
        .insert(ingredients)
        .values({ id: crypto.randomUUID(), name: 'Bombay Sapphire Gin', categoryId, note: null })
        .run()
      testDb.db
        .insert(ingredients)
        .values({ id: crypto.randomUUID(), name: 'Tanqueray', categoryId, note: null })
        .run()
      const app = buildTestApp()

      const res = await app.inject({ method: 'DELETE', url: `/api/categories/${categoryId}` })

      expect(res.statusCode).toBe(409)
      expect(res.json()).toMatchObject({
        ingredientCount: 2,
        error: 'This category is used by 2 ingredient(s) — reassign or remove them first.',
      })

      const list = await app.inject({ method: 'GET', url: '/api/categories' })
      expect(list.json()).toHaveLength(1)

      const remainingIngredients = testDb.db.select().from(ingredients).all()
      expect(remainingIngredients).toHaveLength(2)
    })

    it('returns 404 for an unknown category id', async () => {
      const app = buildTestApp()

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/categories/${crypto.randomUUID()}`,
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
