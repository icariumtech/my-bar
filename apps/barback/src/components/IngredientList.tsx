import { useMemo, useState } from 'react'
import { Alert, Button, Spin } from 'antd'
import type { Ingredient } from '@my-bar/shared'
import { useIngredients, useToggleStock } from '../api/useIngredients.js'
import { IngredientRow } from './IngredientRow.js'
import { SearchFilterBar } from './SearchFilterBar.js'

interface IngredientListProps {
  // Threaded through to each IngredientRow's edit affordance. Left
  // undefined here — plan 01-04 wires this to the edit form; until then
  // IngredientRow simply doesn't render the edit control.
  onEdit?: (ingredient: Ingredient) => void
}

// Renders one IngredientRow per ingredient (INV-03's swipeable stock
// toggle, deferred commit + undo) and supplies the commit handler backed
// by useToggleStock(). Also owns the search/filter state (INV-04): the
// already-fetched array from useIngredients() is filtered in memory — no
// query parameter is ever added to the ingredients request, and no
// server-side search endpoint exists, per the plan's explicit boundary.
//
// Four distinct, non-conflatable states live here too: loading (first
// fetch in flight), error (fetch failed, with Retry), true-empty (nothing
// ever added) and filtered-empty (search/filter matches nothing). The
// true-empty and filtered-empty states are distinguished by the length of
// the UNFILTERED list, never by the filtered result being empty — a
// mistyped search must never read as data loss.
export function IngredientList({ onEdit }: IngredientListProps = {}) {
  const { data: ingredients, isPending, isError, refetch } = useIngredients()
  const toggleStock = useToggleStock()
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)

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
      <div className="sticky top-0 z-10 bg-bar-bg pt-sm pb-sm safe-area-inset-top">
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
        />
      </div>

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
