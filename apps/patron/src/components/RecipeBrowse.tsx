import { useState } from 'react'
import { useRecipes } from '../api/useRecipes.js'
import { RecipeCard } from './RecipeCard.js'
import { RecipeDetail } from './RecipeDetail.js'
import { TagRail, filterRecipesByTag } from './TagRail.js'

// PATR-01/PATR-06: real browse container — TagRail (D-33/34/36/37) plus
// the card grid, and every UI-SPEC loading/error/empty state. Owns the
// single active tag filter (D-37). Also owns which recipe id (if any) is
// being viewed in full-screen detail (03-04) — mirrors Barback's
// RecipesTab `if (view === 'detail' ...) return <...DetailView />` early-
// return pattern, adapted to Patron's simpler two-state model (no
// add/edit view exists on Patron — browse-only, PATR-06). No order-
// submission/checkout affordance exists here or anywhere below it —
// PATR-06's browse-freely guarantee.
export function RecipeBrowse() {
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>(undefined)
  const [viewingId, setViewingId] = useState<string | undefined>(undefined)
  const { data: recipes, isLoading, isError, refetch } = useRecipes()

  if (viewingId) {
    // Only the tapped card's id is ever passed on — never the full
    // fetched-list Recipe object — so the detail view's own
    // useRecipeDetail(recipeId) query is its sole data source (D-47).
    return <RecipeDetail recipeId={viewingId} onBack={() => setViewingId(undefined)} />
  }

  if (isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-patron-bg">
        <p className="text-white">Loading drinks…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-md bg-patron-bg px-xl text-center">
        <h1 className="text-white">Something went wrong</h1>
        <p className="text-patron-text-secondary">
          Failed to load drinks. Please check your connection and try again.
        </p>
        <button
          onClick={() => refetch()}
          className="px-lg py-sm rounded bg-patron-accent text-white font-semibold"
        >
          Retry
        </button>
      </div>
    )
  }

  const allRecipes = recipes ?? []
  // D-45/PATR-03-ordering: filtered from the array's existing (server-
  // sorted-by-name) order — never re-sorted client-side, so makeable
  // status can't reorder or hide a card.
  const filteredRecipes = filterRecipesByTag(allRecipes, selectedTagId)

  return (
    <div className="min-h-dvh bg-patron-bg flex gap-xl p-lg">
      <TagRail recipes={allRecipes} selectedTagId={selectedTagId} onSelectTag={setSelectedTagId} />

      <div className="flex-1">
        {filteredRecipes.length === 0 ? (
          // Covers BOTH true-zero-recipes and filtered-to-zero cases with
          // the identical UI-SPEC copy pair.
          <div className="flex flex-col items-center justify-center gap-md text-center h-full">
            <h1 className="text-white">No drinks available</h1>
            <p className="text-patron-text-secondary">
              No recipes match this filter. Try browsing another category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-md">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} onSelect={(recipe) => setViewingId(recipe.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
