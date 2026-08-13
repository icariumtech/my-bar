import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { createTestDb } from '../db/test-helpers.js'
import { tags } from '../db/schema.js'
import { tagsRoutes } from './tags.js'

describe('GET /api/tags', () => {
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
    app.register(tagsRoutes, { prefix: '/api/tags', db: testDb.db })
    return app
  }

  function seedTag(name: string, group: 'spirit' | 'type' | 'season' | 'flavor') {
    const id = crypto.randomUUID()
    testDb.db.insert(tags).values({ id, name, group }).run()
    return id
  }

  it('returns 200 with an empty array on an empty database', async () => {
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/tags' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('sorts by TAG_GROUP_ORDER (spirit, type, season, flavor) regardless of insertion order', async () => {
    // Insertion order: spirit, then flavor, then type — response must be
    // spirit, type, flavor (TAG_GROUP_ORDER), never insertion order.
    seedTag('Whiskey', 'spirit')
    seedTag('Sweet', 'flavor')
    seedTag('Classics', 'type')
    const app = buildTestApp()

    const res = await app.inject({ method: 'GET', url: '/api/tags' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.map((t: { name: string }) => t.name)).toEqual(['Whiskey', 'Classics', 'Sweet'])
    expect(body.map((t: { group: string }) => t.group)).toEqual(['spirit', 'type', 'flavor'])
  })

  it('sorts alphabetically by name within a group when there are ties', async () => {
    // Insert in reverse-alpha order — response must come back alpha-sorted
    // within the group.
    seedTag('Vodka', 'spirit')
    seedTag('Gin', 'spirit')
    seedTag('Brandy', 'spirit')
    const app = buildTestApp()

    const res = await app.inject({ method: 'GET', url: '/api/tags' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.map((t: { name: string }) => t.name)).toEqual(['Brandy', 'Gin', 'Vodka'])
  })

  it('returns tag objects with id/name/group', async () => {
    const id = seedTag('Tiki', 'type')
    const app = buildTestApp()

    const res = await app.inject({ method: 'GET', url: '/api/tags' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([{ id, name: 'Tiki', group: 'type' }])
  })
})
