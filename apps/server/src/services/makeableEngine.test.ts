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
    const ingredientId = crypto.randomUUID()
    testDb.db
      .insert(ingredients)
      .values({ id: ingredientId, name, categoryId, note: null, inStock })
      .run()
    return ingredientId
  }

  it('category-only line (ingredientId null, requiresSpecific false) is green when the category has an in-stock member', () => {
    const categoryId = seedCategory('Dry Gin')
    seedIngredient(categoryId, true)
    const lineId = crypto.randomUUID()

    const result = computeMakeable(
      [{ id: lineId, categoryId, ingredientId: null, requiresSpecific: false }],
      testDb.db,
    )

    expect(result.lines).toEqual([{ id: lineId, status: 'green', alternativeIngredientName: null }])
    expect(result.overallStatus).toBe('green')
  })

  it('category-only line is red when the category has zero in-stock members', () => {
    const categoryId = seedCategory('Dry Gin')
    const lineId = crypto.randomUUID()

    const result = computeMakeable(
      [{ id: lineId, categoryId, ingredientId: null, requiresSpecific: false }],
      testDb.db,
    )

    expect(result.lines).toEqual([{ id: lineId, status: 'red', alternativeIngredientName: null }])
    expect(result.overallStatus).toBe('red')
  })

  it('MATCH-03 regression: a category-only line is satisfied by ANY in-stock member, never matched to a specific one', () => {
    const categoryId = seedCategory('Dry Gin')
    seedIngredient(categoryId, true, 'Bombay Sapphire')
    seedIngredient(categoryId, false, 'Tanqueray')
    const lineId = crypto.randomUUID()

    const result = computeMakeable(
      [{ id: lineId, categoryId, ingredientId: null, requiresSpecific: false }],
      testDb.db,
    )

    expect(result.lines[0].status).toBe('green')
  })

  it('a locked-specific line whose exact ingredient is in stock is green, regardless of other category members', () => {
    const categoryId = seedCategory('Citrus')
    const lemonId = seedIngredient(categoryId, true, 'Lemon Juice')
    seedIngredient(categoryId, false, 'Lime Juice')
    const lineId = crypto.randomUUID()

    const result = computeMakeable(
      [{ id: lineId, categoryId, ingredientId: lemonId, requiresSpecific: true }],
      testDb.db,
    )

    expect(result.lines).toEqual([{ id: lineId, status: 'green', alternativeIngredientName: null }])
  })

  it('a locked-specific line whose exact ingredient is out of stock, with another in-stock category member, is yellow with the substitute name', () => {
    const categoryId = seedCategory('Citrus')
    const lemonId = seedIngredient(categoryId, false, 'Lemon Juice')
    seedIngredient(categoryId, true, 'Lime Juice')
    const lineId = crypto.randomUUID()

    const result = computeMakeable(
      [{ id: lineId, categoryId, ingredientId: lemonId, requiresSpecific: true }],
      testDb.db,
    )

    expect(result.lines).toEqual([{ id: lineId, status: 'yellow', alternativeIngredientName: 'Lime Juice' }])
  })

  it("MATCH-05 adjacency edge case: a locked-specific line whose ingredient is out of stock AND is the category's only member is red, not yellow", () => {
    const categoryId = seedCategory('Bitters')
    const onlyId = seedIngredient(categoryId, false, 'Angostura')
    const lineId = crypto.randomUUID()

    const result = computeMakeable(
      [{ id: lineId, categoryId, ingredientId: onlyId, requiresSpecific: true }],
      testDb.db,
    )

    expect(result.lines).toEqual([{ id: lineId, status: 'red', alternativeIngredientName: null }])
  })

  it('D-30: a line with ingredientId set but requiresSpecific false behaves exactly like a category-only line', () => {
    const categoryId = seedCategory('Citrus')
    const lemonId = seedIngredient(categoryId, false, 'Lemon Juice')
    seedIngredient(categoryId, true, 'Lime Juice')
    const lineId = crypto.randomUUID()

    const result = computeMakeable(
      [{ id: lineId, categoryId, ingredientId: lemonId, requiresSpecific: false }],
      testDb.db,
    )

    // Category-only semantics: green because the category has an in-stock
    // member — alternativeIngredientName is a locked-specific-only concept.
    expect(result.lines).toEqual([{ id: lineId, status: 'green', alternativeIngredientName: null }])
  })

  it('recipe-level overallStatus is red if any line is red, regardless of line order', () => {
    const greenCategoryId = seedCategory('Dry Gin')
    seedIngredient(greenCategoryId, true)
    const yellowCategoryId = seedCategory('Citrus')
    const yellowIngId = seedIngredient(yellowCategoryId, false, 'Lemon Juice')
    seedIngredient(yellowCategoryId, true, 'Lime Juice')
    const redCategoryId = seedCategory('Dry Vermouth')

    const greenLine = {
      id: crypto.randomUUID(),
      categoryId: greenCategoryId,
      ingredientId: null,
      requiresSpecific: false,
    }
    const yellowLine = {
      id: crypto.randomUUID(),
      categoryId: yellowCategoryId,
      ingredientId: yellowIngId,
      requiresSpecific: true,
    }
    const redLine = {
      id: crypto.randomUUID(),
      categoryId: redCategoryId,
      ingredientId: null,
      requiresSpecific: false,
    }

    const orderA = computeMakeable([greenLine, yellowLine, redLine], testDb.db)
    const orderB = computeMakeable([redLine, greenLine, yellowLine], testDb.db)

    expect(orderA.overallStatus).toBe('red')
    expect(orderB.overallStatus).toBe('red')
  })

  it('recipe-level overallStatus is yellow when no line is red but at least one is yellow, regardless of line order', () => {
    const greenCategoryId = seedCategory('Dry Gin')
    seedIngredient(greenCategoryId, true)
    const yellowCategoryId = seedCategory('Citrus')
    const yellowIngId = seedIngredient(yellowCategoryId, false, 'Lemon Juice')
    seedIngredient(yellowCategoryId, true, 'Lime Juice')

    const greenLine = {
      id: crypto.randomUUID(),
      categoryId: greenCategoryId,
      ingredientId: null,
      requiresSpecific: false,
    }
    const yellowLine = {
      id: crypto.randomUUID(),
      categoryId: yellowCategoryId,
      ingredientId: yellowIngId,
      requiresSpecific: true,
    }

    const orderA = computeMakeable([greenLine, yellowLine], testDb.db)
    const orderB = computeMakeable([yellowLine, greenLine], testDb.db)

    expect(orderA.overallStatus).toBe('yellow')
    expect(orderB.overallStatus).toBe('yellow')
  })

  it('missingCategoryIds includes only categories behind red lines, not yellow', () => {
    const yellowCategoryId = seedCategory('Citrus')
    const yellowIngId = seedIngredient(yellowCategoryId, false, 'Lemon Juice')
    seedIngredient(yellowCategoryId, true, 'Lime Juice')
    const redCategoryId = seedCategory('Dry Vermouth')

    const yellowLine = {
      id: crypto.randomUUID(),
      categoryId: yellowCategoryId,
      ingredientId: yellowIngId,
      requiresSpecific: true,
    }
    const redLine = {
      id: crypto.randomUUID(),
      categoryId: redCategoryId,
      ingredientId: null,
      requiresSpecific: false,
    }

    const result = computeMakeable([yellowLine, redLine], testDb.db)

    expect(result.missingCategoryIds).toEqual([redCategoryId])
  })

  it('computeMakeable([]) returns overallStatus green, empty lines, empty missingCategoryIds', () => {
    const result = computeMakeable([], testDb.db)

    expect(result).toEqual({ lines: [], overallStatus: 'green', missingCategoryIds: [] })
  })

  it('is isolated to the injected db param — a category only seeded in testDb resolves correctly', () => {
    // Regression guard: if computeMakeable ignored the injected `db` param
    // and fell back to importing the production client unconditionally,
    // this category (which only exists in this test's isolated testDb)
    // would never be found in-stock, and this assertion would fail.
    const categoryId = seedCategory('Absinthe')
    seedIngredient(categoryId, true)
    const lineId = crypto.randomUUID()

    const result = computeMakeable(
      [{ id: lineId, categoryId, ingredientId: null, requiresSpecific: false }],
      testDb.db,
    )

    expect(result.overallStatus).toBe('green')
  })
})
