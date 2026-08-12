import { eq } from 'drizzle-orm'
import type { TriStateStatus } from '@my-bar/shared'
import { db as defaultDb } from '../db/client.js'
import { ingredients } from '../db/schema.js'

export interface RecipeIngredientLine {
  id: string
  categoryId: string
  ingredientId: string | null
  requiresSpecific: boolean
}

export interface LineStatus {
  id: string
  status: TriStateStatus
  alternativeIngredientName: string | null
}

export interface MakeableResult {
  lines: LineStatus[]
  overallStatus: TriStateStatus
  missingCategoryIds: string[]
}

/**
 * MATCH-01/MATCH-03/MATCH-04/MATCH-05/D-31/D-32: per-line tri-state
 * makeable computation, rolling up to a recipe-level worst-of-all-lines
 * status — the phase's core trust guarantee, extended from boolean to
 * tri-state.
 *
 * A line with no locked specific ingredient (`!requiresSpecific ||
 * !ingredientId`) is a plain category match (Phase 2 behavior, unchanged):
 * green if the category has ANY in-stock member (MATCH-03: never matched to
 * a specific bottle), red otherwise.
 *
 * A locked-specific line (`requiresSpecific` true, `ingredientId` set) is:
 * green if that exact ingredient is in stock; yellow if it's out of stock
 * but at least one OTHER in-stock ingredient exists in the same category (a
 * substitution is technically available even though the recipe says not to
 * use it); red if nothing in the category is in stock at all — including
 * the case where the locked ingredient is the category's only member (the
 * adjacency edge case: there is no other member to substitute).
 *
 * Recipe-level overallStatus is worst-of-all-lines (red beats yellow beats
 * green) and is independent of line order.
 *
 * `db` is an explicit second parameter (defaulting to the real client)
 * rather than an unconditional import of the production `db` — otherwise a
 * caller injecting an isolated test db (e.g. recipes.test.ts's testDb.db)
 * would be silently bypassed and this would query the wrong database.
 */
export function computeMakeable(
  lines: RecipeIngredientLine[],
  db: typeof defaultDb = defaultDb,
): MakeableResult {
  const inStockRows = db
    .select({ id: ingredients.id, categoryId: ingredients.categoryId, name: ingredients.name })
    .from(ingredients)
    .where(eq(ingredients.inStock, true))
    .all()

  const inStockByCategory = inStockRows.reduce(
    (acc, row) => {
      if (!acc[row.categoryId]) acc[row.categoryId] = []
      acc[row.categoryId].push({ id: row.id, name: row.name })
      return acc
    },
    {} as Record<string, Array<{ id: string; name: string }>>,
  )

  const lineStatuses: LineStatus[] = lines.map((line) => {
    const categoryMembers = inStockByCategory[line.categoryId] ?? []

    if (!line.requiresSpecific || !line.ingredientId) {
      // Plain category match (D-30: unchecking the lock, or no specific
      // ingredient selected at all, reverts to category-only matching).
      return {
        id: line.id,
        status: categoryMembers.length > 0 ? 'green' : 'red',
        alternativeIngredientName: null,
      }
    }

    const exactMatch = categoryMembers.find((member) => member.id === line.ingredientId)
    if (exactMatch) {
      return { id: line.id, status: 'green', alternativeIngredientName: null }
    }

    const otherMember = categoryMembers.find((member) => member.id !== line.ingredientId)
    if (otherMember) {
      return { id: line.id, status: 'yellow', alternativeIngredientName: otherMember.name }
    }

    return { id: line.id, status: 'red', alternativeIngredientName: null }
  })

  // D-31: missingCategoryIds represents only the categories behind 'red'
  // lines — a 'yellow' line's category is not "missing", it just has a
  // substitution caveat.
  const missingCategoryIds = [
    ...new Set(
      lines
        .filter((_line, idx) => lineStatuses[idx].status === 'red')
        .map((line) => line.categoryId),
    ),
  ]

  // D-32: recipe-level rollup is worst-of-all-lines and does not depend on
  // line order (Array.prototype.some scans every entry regardless of
  // position).
  const overallStatus: TriStateStatus = lineStatuses.some((line) => line.status === 'red')
    ? 'red'
    : lineStatuses.some((line) => line.status === 'yellow')
      ? 'yellow'
      : 'green'

  return { lines: lineStatuses, overallStatus, missingCategoryIds }
}
