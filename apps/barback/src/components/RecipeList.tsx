import { useMemo } from 'react'
import { Alert, Button, Spin } from 'antd'
import type { Recipe } from '@my-bar/shared'
import { useRecipes } from '../api/useRecipes.js'
import { RecipeRow } from './RecipeRow.js'

interface RecipeListProps {
  onEdit?: (recipe: Recipe) => void
  onView?: (recipe: Recipe) => void
  // 260812-e8j: search state now lives in RecipesTab (so the title/
  // Add-button row and the search Input can render together inside one
  // sticky wrapper) and is passed down here as a prop.
  query: string
}

// Mirrors IngredientList.tsx's structure exactly: loading/error/true-empty/
// filtered-empty states, an in-memory search filter (no query parameter is
// ever added to the recipes request), and a scrollable list of rows. Unlike
// IngredientList there is no category filter — recipes don't have a single
// category the way ingredients do. It no longer owns the search state
// (260812-e8j lifted that up to RecipesTab) — it only performs the
// in-memory filtering against the query prop and renders the four loading/
// error/true-empty/filtered-empty states.
export function RecipeList({ onEdit, onView, query }: RecipeListProps) {
  const { data: recipes, isPending, isError, refetch } = useRecipes()

  const filteredRecipes = useMemo(() => {
    if (!recipes) return undefined
    const normalizedQuery = query.trim().toLowerCase()
    return recipes.filter(
      (recipe) => normalizedQuery === '' || recipe.name.toLowerCase().includes(normalizedQuery),
    )
  }, [recipes, query])

  if (isPending) {
    return (
      <div className="flex justify-center pt-3xl">
        <Spin description="Loading recipes…" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="pt-lg px-md">
        <Alert
          type="error"
          showIcon
          title="Couldn't load recipes — check your connection and try again."
          action={
            <Button size="small" style={{ minHeight: 48 }} onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  const hasAnyRecipes = (recipes?.length ?? 0) > 0
  const hasFilteredResults = (filteredRecipes?.length ?? 0) > 0

  return (
    <div>
      {!hasAnyRecipes && (
        <div className="text-center pt-3xl px-md">
          <h2 className="text-white">No recipes yet</h2>
          <p className="text-zinc-400 mt-sm">Add your first recipe to build your menu.</p>
        </div>
      )}

      {hasAnyRecipes && !hasFilteredResults && (
        <div className="text-center pt-3xl px-md">
          <p className="text-zinc-400">No matches for '{query}'</p>
        </div>
      )}

      {hasFilteredResults && (
        <ul className="flex flex-col gap-sm mt-md safe-area-inset-bottom">
          {filteredRecipes?.map((recipe) => (
            <li key={recipe.id}>
              <RecipeRow recipe={recipe} onEdit={onEdit} onView={onView} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
