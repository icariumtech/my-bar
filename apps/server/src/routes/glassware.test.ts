import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { eq } from 'drizzle-orm'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { createTestDb } from '../db/test-helpers.js'
import { glassware as glasswareTable, recipes } from '../db/schema.js'
import { glasswareRoutes } from './glassware.js'

describe('glassware routes', () => {
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
    app.register(glasswareRoutes, { prefix: '/api/glassware', db: testDb.db })
    return app
  }

  describe('GET /api/glassware', () => {
    it('returns 200 with an empty array on an empty database', async () => {
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: '/api/glassware' })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual([])
    })
  })

  describe('POST /api/glassware', () => {
    it('creates a glassware entry and returns 201', async () => {
      const app = buildTestApp()

      const res = await app.inject({
        method: 'POST',
        url: '/api/glassware',
        payload: { name: 'Coupe' },
      })

      expect(res.statusCode).toBe(201)
      expect(res.json()).toMatchObject({ name: 'Coupe' })
    })

    it('rejects a duplicate glassware name with 409, not a duplicate row', async () => {
      const app = buildTestApp()

      const first = await app.inject({
        method: 'POST',
        url: '/api/glassware',
        payload: { name: 'Coupe' },
      })
      expect(first.statusCode).toBe(201)

      const second = await app.inject({
        method: 'POST',
        url: '/api/glassware',
        payload: { name: 'Coupe' },
      })
      expect(second.statusCode).toBe(409)
      expect(second.json()).toEqual({ error: 'Glassware already exists' })

      const list = await app.inject({ method: 'GET', url: '/api/glassware' })
      expect(list.json()).toHaveLength(1)
    })
  })

  describe('PATCH /api/glassware/:id', () => {
    function seedGlassware(name = 'Coupe') {
      const id = crypto.randomUUID()
      testDb.db.insert(glasswareTable).values({ id, name }).run()
      return id
    }

    it('renames a glassware entry and returns 200', async () => {
      const id = seedGlassware()
      const app = buildTestApp()

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/glassware/${id}`,
        payload: { name: 'Nick & Nora' },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json()).toMatchObject({ id, name: 'Nick & Nora' })
    })

    it('rejects renaming onto an existing glassware name with 409', async () => {
      seedGlassware('Coupe')
      const otherId = seedGlassware('Rocks')
      const app = buildTestApp()

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/glassware/${otherId}`,
        payload: { name: 'Coupe' },
      })

      expect(res.statusCode).toBe(409)
    })

    it('returns 404 for an unknown glassware id', async () => {
      const app = buildTestApp()

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/glassware/${crypto.randomUUID()}`,
        payload: { name: 'Coupe' },
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/glassware/:id', () => {
    function seedGlassware(name = 'Coupe') {
      const id = crypto.randomUUID()
      testDb.db.insert(glasswareTable).values({ id, name }).run()
      return id
    }

    function seedRecipeUsingGlassware(glasswareId: string) {
      const recipeId = crypto.randomUUID()
      const now = new Date()
      testDb.db
        .insert(recipes)
        .values({
          id: recipeId,
          name: 'Martini',
          method: JSON.stringify(['Stir']),
          glasswareId,
          garnish: null,
          createdAt: now,
          updatedAt: now,
        })
        .run()
      return recipeId
    }

    it('deletes an unreferenced glassware entry and returns 204', async () => {
      const id = seedGlassware()
      const app = buildTestApp()

      const res = await app.inject({ method: 'DELETE', url: `/api/glassware/${id}` })

      expect(res.statusCode).toBe(204)

      const list = await app.inject({ method: 'GET', url: '/api/glassware' })
      expect(list.json()).toEqual([])
    })

    it('refuses to delete a glassware entry referenced by 2 recipes, with an accurate recipeCount, leaving both intact', async () => {
      const id = seedGlassware()
      const recipeIdA = seedRecipeUsingGlassware(id)
      const recipeIdB = seedRecipeUsingGlassware(id)
      const app = buildTestApp()

      const res = await app.inject({ method: 'DELETE', url: `/api/glassware/${id}` })

      expect(res.statusCode).toBe(409)
      expect(res.json()).toEqual({
        error: 'This glassware is used by 2 recipe(s) — remove or reassign them first.',
        recipeCount: 2,
      })

      const list = await app.inject({ method: 'GET', url: '/api/glassware' })
      expect(list.json()).toHaveLength(1)

      const [recipeA] = testDb.db.select().from(recipes).where(eq(recipes.id, recipeIdA)).all()
      const [recipeB] = testDb.db.select().from(recipes).where(eq(recipes.id, recipeIdB)).all()
      expect(recipeA.glasswareId).toBe(id)
      expect(recipeB.glasswareId).toBe(id)
    })

    it('returns 404 for an unknown glassware id', async () => {
      const app = buildTestApp()

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/glassware/${crypto.randomUUID()}`,
      })

      expect(res.statusCode).toBe(404)
    })
  })
})
