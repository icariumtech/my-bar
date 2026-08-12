import { useMemo } from 'react'
import { Alert, Button, Spin } from 'antd'
import type { Ingredient } from '@my-bar/shared'
import { useIngredients, useToggleStock } from '../api/useIngredients.js'
import { IngredientRow } from './IngredientRow.js'

interface IngredientListProps {
  // Threaded through to each IngredientRow's edit affordance. Left
  // undefined here — plan 01-04 wires this to the edit form; until then
  // IngredientRow simply doesn't render the edit control.
  onEdit?: (ingredient: Ingredient) => void
  // 260812-e8j: search/filter state now lives in IngredientsTab (so the
  // title/Add-button row and SearchFilterBar can render together inside one
  // sticky wrapper) and is passed down here as props.
  query: string
  categoryId: string | null
}

// Renders one IngredientRow per ingredient (INV-03's swipeable stock
// toggle, deferred commit + undo) and supplies the commit handler backed
// by useToggleStock(). It no longer owns the search/filter state
// (260812-e8j lifted that up to IngredientsTab) — it only performs the
// in-memory filtering (INV-04) against the query/categoryId props and
// renders the four loading/error/true-empty/filtered-empty states.
//
// Four distinct, non-conflatable states live here: loading (first fetch in
// flight), error (fetch failed, with Retry), true-empty (nothing ever
// added) and filtered-empty (search/filter matches nothing). The
// true-empty and filtered-empty states are distinguished by the length of
// the UNFILTERED list, never by the filtered result being empty — a
// mistyped search must never read as data loss.
export function IngredientList({ onEdit, query, categoryId }: IngredientListProps) {
  const { data: ingredients, isPending, isError, refetch } = useIngredients()
  const toggleStock = useToggleStock()

  // Memoized against the source list, the query and the category filter so
  // typing does not re-filter on unrelated re-renders (e.g. a toggle
  // mutation settling elsewhere in the list).
  const filteredIngredients = useMemo(() => {
    if (!ingredients) return undefined
    const normalizedQuery = query.trim().toLowerCase()
    return ingredients.filter((ingredient) => {
      const matchesCategory = categoryId === null || ingredient.categoryId === categoryId
      // Search matches both bottle name and category name — the owner
      // shouldn't have to decide which field a remembered word belongs to.
      const matchesQuery =
        normalizedQuery === '' ||
        ingredient.name.toLowerCase().includes(normalizedQuery) ||
        ingredient.categoryName.toLowerCase().includes(normalizedQuery)
      return matchesCategory && matchesQuery
    })
  }, [ingredients, query, categoryId])

  function handleCommitToggle(id: string, nextInStock: boolean) {
    toggleStock.mutate({ id, inStock: nextInStock })
  }

  if (isPending) {
    return (
      <div className="flex justify-center pt-3xl">
        <Spin description="Loading inventory…" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="pt-lg px-md">
        <Alert
          type="error"
          showIcon
          title="Couldn't load inventory — check your connection and try again."
          action={
            <Button size="small" style={{ minHeight: 48 }} onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  const hasAnyIngredients = (ingredients?.length ?? 0) > 0
  const hasFilteredResults = (filteredIngredients?.length ?? 0) > 0

  return (
    <div>
      {!hasAnyIngredients && (
        <div className="text-center pt-3xl px-md">
          <h2 className="text-white">No ingredients yet</h2>
          <p className="text-zinc-400 mt-sm">Add your first bottle to start tracking inventory.</p>
        </div>
      )}

      {hasAnyIngredients && !hasFilteredResults && (
        <div className="text-center pt-3xl px-md">
          <p className="text-zinc-400">No matches for '{query}'</p>
        </div>
      )}

      {hasFilteredResults && (
        <ul className="flex flex-col gap-sm mt-md safe-area-inset-bottom">
          {filteredIngredients?.map((ingredient) => (
            <li key={ingredient.id}>
              <IngredientRow
                ingredient={ingredient}
                onCommitToggle={handleCommitToggle}
                onEdit={onEdit}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
