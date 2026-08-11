import { eq } from 'drizzle-orm'
import { db as defaultDb } from '../db/client.js'
import { ingredients } from '../db/schema.js'

export interface MakeableResult {
  makeable: boolean
  missingCategoryIds: string[]
}

/**
 * MATCH-01/MATCH-03/MATCH-04: presence-based, category-grouped makeable
 * computation — the phase's core trust guarantee. A required category is
 * satisfied by ANY in-stock ingredient in it (MATCH-03: never a specific
 * bottle), and quantity/unit are never read here (MATCH-04/D-20: the check
 * is volume-agnostic).
 *
 * `db` is an explicit second parameter (defaulting to the real client)
 * rather than an unconditional import of the production `db` — otherwise a
 * caller injecting an isolated test db (e.g. recipes.test.ts's testDb.db)
 * would be silently bypassed and this would query the wrong database.
 */
export function computeMakeable(
  requiredCategoryIds: string[],
  db: typeof defaultDb = defaultDb,
): MakeableResult {
  const inStockRows = db
    .select({ categoryId: ingredients.categoryId })
    .from(ingredients)
    .where(eq(ingredients.inStock, true))
    .all()

  const inStockCategoryIds = new Set(inStockRows.map((row) => row.categoryId))
  const uniqueRequiredCategoryIds = [...new Set(requiredCategoryIds)]
  const missingCategoryIds = uniqueRequiredCategoryIds.filter(
    (categoryId) => !inStockCategoryIds.has(categoryId),
  )

  return {
    makeable: missingCategoryIds.length === 0,
    missingCategoryIds,
  }
}
