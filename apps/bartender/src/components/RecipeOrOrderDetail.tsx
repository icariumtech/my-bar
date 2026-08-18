import type { OrderStatus, Recipe } from '@my-bar/shared'

interface RecipeOrOrderDetailProps {
  recipe: Recipe
  order?: { patronName: string | null; status: OrderStatus; elapsedSeconds: number }
  onBack: () => void
  onMarkDone?: () => void
}

// Placeholder — Task 2 of this plan (04-02) replaces this with the full
// shared recipe/order detail view (D-56). Exists here only so Task 1's
// RecipesTab.tsx can import a real file on disk; this Vite/Vitest setup
// requires vi.mock targets to physically resolve (verified empirically),
// so a stub is required before Task 2 runs.
export function RecipeOrOrderDetail({ recipe, onBack }: RecipeOrOrderDetailProps) {
  return (
    <div>
      <span>{recipe.name}</span>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </div>
  )
}
