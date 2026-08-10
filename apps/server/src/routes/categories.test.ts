import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { createTestDb } from '../db/test-helpers.js'
import { categoriesRoutes } from './categories.js'

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
})
