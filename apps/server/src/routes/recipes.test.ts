import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod'
import { eq } from 'drizzle-orm'
import { createTestDb } from '../db/test-helpers.js'
import { categories, glassware, ingredients, recipeIngredients } from '../db/schema.js'
import { recipesRoutes } from './recipes.js'

describe('GET /api/recipes', () => {
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
    return app
  }

  it('returns 200 with an empty array on an empty database', async () => {
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/recipes' })

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })
})

describe('POST /api/recipes', () => {
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
    return app
  }

  function seedCategory(name: string) {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name }).run()
    return categoryId
  }

  function seedGlassware(name = 'Coupe') {
    const glasswareId = crypto.randomUUID()
    testDb.db.insert(glassware).values({ id: glasswareId, name }).run()
    return glasswareId
  }

  function seedIngredient(categoryId: string, inStock = true, name = 'Bottle') {
    testDb.db
      .insert(ingredients)
      .values({ id: crypto.randomUUID(), name, categoryId, note: null, inStock })
      .run()
  }

  it('creates a recipe with ingredients, method, glassware, and garnish; reports makeable true', async () => {
    const ginCategoryId = seedCategory('Dry Gin')
    const vermouthCategoryId = seedCategory('Dry Vermouth')
    seedIngredient(ginCategoryId, true, 'Bombay Sapphire')
    seedIngredient(vermouthCategoryId, true, 'Dolin Dry')
    const glasswareId = seedGlassware('Coupe')
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'Martini',
        ingredients: [
          { categoryId: ginCategoryId, quantity: '2', unit: 'oz' },
          { categoryId: vermouthCategoryId, quantity: '0.5', unit: 'oz' },
        ],
        method: ['Stir with ice', 'Strain into a chilled glass'],
        glasswareId,
        garnish: 'Lemon twist',
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body).toMatchObject({
      name: 'Martini',
      method: ['Stir with ice', 'Strain into a chilled glass'],
      glasswareId,
      glasswareName: 'Coupe',
      garnish: 'Lemon twist',
      makeable: true,
      missingCategoryIds: [],
      missingCategoryNames: [],
    })
    expect(body.ingredients).toHaveLength(2)
    expect(body.ingredients[0]).toMatchObject({
      categoryId: ginCategoryId,
      categoryName: 'Dry Gin',
      quantity: '2',
      unit: 'oz',
      displayOrder: 0,
    })
    expect(body.ingredients[1]).toMatchObject({
      categoryId: vermouthCategoryId,
      categoryName: 'Dry Vermouth',
      quantity: '0.5',
      unit: 'oz',
      displayOrder: 1,
    })
  })

  it('creates a recipe without glassware or garnish — both null in the response', async () => {
    const categoryId = seedCategory('Dry Gin')
    seedIngredient(categoryId)
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'No Glass',
        ingredients: [{ categoryId, quantity: '2', unit: 'oz' }],
        method: ['Shake'],
      },
    })

    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.glasswareId).toBeNull()
    expect(body.glasswareName).toBeNull()
    expect(body.garnish).toBeNull()
  })

  it('reflects not-makeable with missing category ids/names once a required category has zero in-stock ingredients', async () => {
    const ginCategoryId = seedCategory('Dry Gin')
    const vermouthCategoryId = seedCategory('Dry Vermouth')
    const ginIngredientId = crypto.randomUUID()
    testDb.db
      .insert(ingredients)
      .values({
        id: ginIngredientId,
        name: 'Bombay Sapphire',
        categoryId: ginCategoryId,
        note: null,
        inStock: true,
      })
      .run()
    seedIngredient(vermouthCategoryId, true, 'Dolin Dry')
    const app = buildTestApp()

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'Martini',
        ingredients: [
          { categoryId: ginCategoryId, quantity: '2', unit: 'oz' },
          { categoryId: vermouthCategoryId, quantity: '0.5', unit: 'oz' },
        ],
        method: ['Stir with ice'],
      },
    })
    expect(createRes.statusCode).toBe(201)
    expect(createRes.json().makeable).toBe(true)

    // Toggle the gin ingredient out of stock
    testDb.db.update(ingredients).set({ inStock: false }).where(eq(ingredients.id, ginIngredientId)).run()

    const getRes = await app.inject({ method: 'GET', url: '/api/recipes' })
    expect(getRes.statusCode).toBe(200)
    const [recipeBody] = getRes.json()
    expect(recipeBody.makeable).toBe(false)
    expect(recipeBody.missingCategoryIds).toEqual([ginCategoryId])
    expect(recipeBody.missingCategoryNames).toEqual(['Dry Gin'])
  })

  it('rejects an empty ingredients array with 400', async () => {
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'Empty',
        ingredients: [],
        method: ['Step 1'],
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('rejects an empty method array with 400', async () => {
    const categoryId = seedCategory('Dry Gin')
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'No Method',
        ingredients: [{ categoryId, quantity: '2', unit: 'oz' }],
        method: [],
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('rejects an ingredient line with an unknown categoryId with 400, not 500', async () => {
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'Ghost Category',
        ingredients: [{ categoryId: crypto.randomUUID(), quantity: '2', unit: 'oz' }],
        method: ['Step 1'],
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('rejects an unknown glasswareId with 400, not 500', async () => {
    const categoryId = seedCategory('Dry Gin')
    const app = buildTestApp()

    const res = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'Ghost Glass',
        ingredients: [{ categoryId, quantity: '2', unit: 'oz' }],
        method: ['Step 1'],
        glasswareId: crypto.randomUUID(),
      },
    })

    expect(res.statusCode).toBe(400)
  })

  it('preserves method step order and ingredient displayOrder exactly on immediate GET readback', async () => {
    const categoryA = seedCategory('Category A')
    const categoryB = seedCategory('Category B')
    const categoryC = seedCategory('Category C')
    const app = buildTestApp()

    await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'Order Test',
        ingredients: [
          { categoryId: categoryC, quantity: '1', unit: 'part' },
          { categoryId: categoryA, quantity: '2', unit: 'part' },
          { categoryId: categoryB, quantity: '3', unit: 'part' },
        ],
        method: ['Third', 'First', 'Second'],
      },
    })

    const getRes = await app.inject({ method: 'GET', url: '/api/recipes' })
    const [recipeBody] = getRes.json()

    expect(recipeBody.method).toEqual(['Third', 'First', 'Second'])
    expect(recipeBody.ingredients.map((i: { categoryId: string }) => i.categoryId)).toEqual([
      categoryC,
      categoryA,
      categoryB,
    ])
    expect(recipeBody.ingredients.map((i: { displayOrder: number }) => i.displayOrder)).toEqual([0, 1, 2])
  })

  it('allows two recipes with identical name and ingredients to both be created (no uniqueness constraint)', async () => {
    const categoryId = seedCategory('Dry Gin')
    const app = buildTestApp()

    const payload = {
      name: 'Duplicate Recipe',
      ingredients: [{ categoryId, quantity: '2', unit: 'oz' }],
      method: ['Stir'],
    }

    const res1 = await app.inject({ method: 'POST', url: '/api/recipes', payload })
    const res2 = await app.inject({ method: 'POST', url: '/api/recipes', payload })

    expect(res1.statusCode).toBe(201)
    expect(res2.statusCode).toBe(201)
    expect(res1.json().id).not.toBe(res2.json().id)

    const getRes = await app.inject({ method: 'GET', url: '/api/recipes' })
    const body = getRes.json()
    expect(body).toHaveLength(2)
  })
})

describe('PATCH /api/recipes/:id', () => {
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
    return app
  }

  function seedCategory(name: string) {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name }).run()
    return categoryId
  }

  function seedIngredient(categoryId: string, inStock = true, name = 'Bottle') {
    testDb.db
      .insert(ingredients)
      .values({ id: crypto.randomUUID(), name, categoryId, note: null, inStock })
      .run()
  }

  async function createRecipe(app: ReturnType<typeof Fastify>) {
    const categoryId = seedCategory('Dry Gin')
    seedIngredient(categoryId)
    const res = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'Martini',
        ingredients: [{ categoryId, quantity: '2', unit: 'oz' }],
        method: ['Stir'],
      },
    })
    return res.json()
  }

  it('updates only the name field, leaving ingredients/method/glassware/garnish untouched', async () => {
    const app = buildTestApp()
    const created = await createRecipe(app)

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/recipes/${created.id}`,
      payload: { name: 'New Name' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.name).toBe('New Name')
    expect(body.ingredients).toEqual(created.ingredients)
    expect(body.method).toEqual(created.method)
    expect(body.glasswareId).toEqual(created.glasswareId)
    expect(body.garnish).toEqual(created.garnish)
  })

  it('replaces the ingredients array atomically — prior rows gone, new set present with fresh displayOrder, makeable reflects the NEW set', async () => {
    const app = buildTestApp()
    const created = await createRecipe(app)

    // A category with zero in-stock ingredients — the replaced recipe
    // should read as not-makeable against the NEW set, not the old
    // (makeable) one.
    const newCategoryId = seedCategory('Dry Vermouth')

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/recipes/${created.id}`,
      payload: { ingredients: [{ categoryId: newCategoryId, quantity: '1', unit: 'oz' }] },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ingredients).toHaveLength(1)
    expect(body.ingredients[0]).toMatchObject({ categoryId: newCategoryId, displayOrder: 0 })
    expect(body.makeable).toBe(false)
    expect(body.missingCategoryIds).toEqual([newCategoryId])
    expect(body.missingCategoryNames).toEqual(['Dry Vermouth'])

    const remaining = testDb.db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, created.id))
      .all()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].categoryId).toBe(newCategoryId)
  })

  it('replaces the method array in the submitted order', async () => {
    const app = buildTestApp()
    const created = await createRecipe(app)

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/recipes/${created.id}`,
      payload: { method: ['New step 1', 'New step 2'] },
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().method).toEqual(['New step 1', 'New step 2'])
  })

  it('rejects an empty patch body with 400', async () => {
    const app = buildTestApp()
    const created = await createRecipe(app)

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/recipes/${created.id}`,
      payload: {},
    })

    expect(res.statusCode).toBe(400)
  })

  it('returns 404 for an unknown recipe id', async () => {
    const app = buildTestApp()

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/recipes/${crypto.randomUUID()}`,
      payload: { name: 'Ghost' },
    })

    expect(res.statusCode).toBe(404)
  })

  it('rejects an ingredients array containing an unknown categoryId with 400, not 500', async () => {
    const app = buildTestApp()
    const created = await createRecipe(app)

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/recipes/${created.id}`,
      payload: { ingredients: [{ categoryId: crypto.randomUUID(), quantity: '1', unit: 'oz' }] },
    })

    expect(res.statusCode).toBe(400)
  })
})

describe('DELETE /api/recipes/:id', () => {
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
    return app
  }

  function seedCategory(name: string) {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name }).run()
    return categoryId
  }

  function seedIngredient(categoryId: string, inStock = true, name = 'Bottle') {
    testDb.db
      .insert(ingredients)
      .values({ id: crypto.randomUUID(), name, categoryId, note: null, inStock })
      .run()
  }

  async function createRecipe(app: ReturnType<typeof Fastify>) {
    const categoryId = seedCategory('Dry Gin')
    seedIngredient(categoryId)
    const res = await app.inject({
      method: 'POST',
      url: '/api/recipes',
      payload: {
        name: 'Martini',
        ingredients: [{ categoryId, quantity: '2', unit: 'oz' }],
        method: ['Stir'],
      },
    })
    return res.json()
  }

  it('deletes an existing recipe and returns 204; cascade to recipe_ingredients verified by direct query', async () => {
    const app = buildTestApp()
    const created = await createRecipe(app)

    const res = await app.inject({ method: 'DELETE', url: `/api/recipes/${created.id}` })
    expect(res.statusCode).toBe(204)

    const remaining = testDb.db
      .select()
      .from(recipeIngredients)
      .where(eq(recipeIngredients.recipeId, created.id))
      .all()
    expect(remaining).toHaveLength(0)

    const list = await app.inject({ method: 'GET', url: '/api/recipes' })
    expect(list.json()).toEqual([])
  })

  it('returns 404 for an unknown recipe id', async () => {
    const app = buildTestApp()

    const res = await app.inject({ method: 'DELETE', url: `/api/recipes/${crypto.randomUUID()}` })
    expect(res.statusCode).toBe(404)
  })

  it('returns 204 then 404 on a repeated delete — never a repeated 204', async () => {
    const app = buildTestApp()
    const created = await createRecipe(app)

    const first = await app.inject({ method: 'DELETE', url: `/api/recipes/${created.id}` })
    expect(first.statusCode).toBe(204)

    const second = await app.inject({ method: 'DELETE', url: `/api/recipes/${created.id}` })
    expect(second.statusCode).toBe(404)
  })
})
