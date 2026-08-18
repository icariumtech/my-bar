import type { Recipe } from '@my-bar/shared'

interface RecipeSearchFilterProps {
  recipes: Recipe[]
  onApply: (matchingIds: Set<string>) => void
  onBack: () => void
}

// Placeholder — Task 2 of this plan (04-02) replaces this with the full
// name+tag AND/OR filter UI (D-62). Exists here only so Task 1's
// RecipesTab.tsx can import a real file on disk; this Vite/Vitest setup
// requires vi.mock targets to physically resolve (verified empirically),
// so a stub is required before Task 2 runs.
export function RecipeSearchFilter({ onBack }: RecipeSearchFilterProps) {
  return (
    <div>
      <button type="button" onClick={onBack}>
        Back
      </button>
    </div>
  )
}
