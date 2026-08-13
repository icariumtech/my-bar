import type { Recipe } from '@my-bar/shared'
import { MakeableIndicator } from './MakeableIndicator.js'

interface RecipeCardProps {
  recipe: Recipe
  onSelect: (recipe: Recipe) => void
}

// D-38: card shows name, flavor/type tags (triplet style), makeable badge
// in place of price, ingredient names without amounts. D-43: not-makeable
// cards (yellow AND red alike) are dimmed/desaturated AND carry the badge
// — both together. D-45: not-makeable drinks are always visible and
// tappable, never disabled.
export function RecipeCard({ recipe, onSelect }: RecipeCardProps) {
  const isMakeable = recipe.overallStatus === 'green'

  return (
    <div
      onClick={() => onSelect(recipe)}
      className={`cursor-pointer p-md rounded bg-patron-surface flex flex-col gap-sm ${
        isMakeable ? '' : 'opacity-60 grayscale'
      }`}
    >
      <h3 className="text-white break-words">{recipe.name}</h3>

      {/* D-38 tag triplet — already pre-sorted by TAG_GROUP_ORDER
          server-side, so .slice(0, 3) is deterministic. Empty tags render
          nothing in this row (PATR-02 zero-tags edge). */}
      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-xs">
          {recipe.tags.slice(0, 3).map((t) => (
            <span key={t.id} className="text-xs bg-patron-accent text-white px-xs py-xs rounded">
              {t.name}
            </span>
          ))}
        </div>
      )}

      {/* D-38: ingredient names without amounts, in secondary/dimmed text. */}
      <p className="text-sm text-patron-text-secondary">
        {recipe.ingredients.map((i) => i.categoryName).join(', ')}
      </p>

      <MakeableIndicator status={recipe.overallStatus} />
    </div>
  )
}
