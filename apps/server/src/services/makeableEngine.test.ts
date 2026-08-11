import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '../db/test-helpers.js'
import { categories, ingredients } from '../db/schema.js'
import { computeMakeable } from './makeableEngine.js'

describe('computeMakeable', () => {
  let testDb: ReturnType<typeof createTestDb>

  beforeEach(() => {
    testDb = createTestDb()
  })

  afterEach(() => {
    testDb.cleanup()
  })

  function seedCategory(name = 'Dry Gin') {
    const categoryId = crypto.randomUUID()
    testDb.db.insert(categories).values({ id: categoryId, name }).run()
    return categoryId
  }

  function seedIngredient(categoryId: string, inStock: boolean, name = 'Bottle') {
    testDb.db
      .insert(ingredients)
      .values({ id: crypto.randomUUID(), name, categoryId, note: null, inStock })
      .run()
  }

  it('is makeable when the required category has an in-stock ingredient', () => {
    const categoryId = seedCategory('Dry Gin')
    seedIngredient(categoryId, true)

    const result = computeMakeable([categoryId], testDb.db)

    expect(result).toEqual({ makeable: true, missingCategoryIds: [] })
  })

  it('is not makeable when the required category has zero in-stock ingredients (all out of stock)', () => {
    const categoryId = seedCategory('Dry Gin')
    seedIngredient(categoryId, false)

    const result = computeMakeable([categoryId], testDb.db)

    expect(result).toEqual({ makeable: false, missingCategoryIds: [categoryId] })
  })

  it('is not makeable when the required category has no ingredients at all', () => {
    const categoryId = seedCategory('Dry Gin')

    const result = computeMakeable([categoryId], testDb.db)

    expect(result).toEqual({ makeable: false, missingCategoryIds: [categoryId] })
  })

  it('MATCH-03: matches ANY in-stock ingredient in the category, never a specific one', () => {
    const categoryId = seedCategory('Dry Gin')
    seedIngredient(categoryId, true, 'Bombay Sapphire')
    seedIngredient(categoryId, false, 'Tanqueray')

    const result = computeMakeable([categoryId], testDb.db)

    expect(result).toEqual({ makeable: true, missingCategoryIds: [] })
  })

  it('an empty requirement set is trivially satisfied', () => {
    const result = computeMakeable([], testDb.db)

    expect(result).toEqual({ makeable: true, missingCategoryIds: [] })
  })

  it('collapses duplicate required category ids to a single missing entry', () => {
    const categoryId = seedCategory('Dry Gin')

    const result = computeMakeable([categoryId, categoryId], testDb.db)

    expect(result.missingCategoryIds).toEqual([categoryId])
  })

  it('is isolated to the injected db param — a category only seeded in testDb resolves correctly', () => {
    // Regression guard: if computeMakeable ignored the injected `db` param
    // and fell back to importing the production client unconditionally,
    // this category (which only exists in this test's isolated testDb)
    // would never be found in-stock, and this assertion would fail.
    const categoryId = seedCategory('Absinthe')
    seedIngredient(categoryId, true)

    const result = computeMakeable([categoryId], testDb.db)

    expect(result.makeable).toBe(true)
  })
})
