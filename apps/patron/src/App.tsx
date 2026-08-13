import { useRecipes } from './api/useRecipes.js'
import { RecipeCard } from './components/RecipeCard.js'

// This plan's own thin tracer proof: calls useRecipes() directly (no
// RecipeBrowse container yet — that's plan 03-02, which replaces this
// file's body wholesale). onSelect is a deliberate forward-compatible
// no-op stub — plan 03-04 wires real detail-view navigation without any
// architectural change here.
export default function App() {
  const { data, isLoading, isError, refetch } = useRecipes()

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

  const recipes = data ?? []

  if (recipes.length === 0) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-md bg-patron-bg px-xl text-center">
        <h1 className="text-white">No drinks available</h1>
        <p className="text-patron-text-secondary">
          No recipes match this filter. Try browsing another category.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-patron-bg">
      <div className="grid grid-cols-2 gap-md p-lg">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.id} recipe={recipe} onSelect={() => {}} />
        ))}
      </div>
    </div>
  )
}
