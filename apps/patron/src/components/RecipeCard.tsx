import type { Recipe } from '@my-bar/shared'
import { ChevronRight } from 'lucide-react'

interface RecipeCardProps {
  recipe: Recipe
  onSelect: (recipe: Recipe) => void
}

// D-38: card shows name, flavor/type tags (triplet style), ingredient
// names without amounts. D-43: not-makeable cards (yellow AND red alike)
// are dimmed/desaturated. D-45: not-makeable drinks are always visible
// (when the availability toggle shows them) and tappable, never disabled.
// 260813-ea3 neon-glow restyle: tags render as middot-separated uppercase
// text instead of pill chips, and a "Tap to View" affordance was added —
// D-38 and D-43 (dim/grayscale when not-makeable) both still hold exactly
// as before.
// 260817-fkv: converted from a bordered/glow card to an unbordered list
// row — RecipeBrowse now renders rows in a single-column divide-y list
// instead of a 2-col grid, so per-row border/glow/background/rounded
// classes were dropped here; D-43 dimming (opacity-60 grayscale) is
// preserved unchanged.
// 260817-g39: removed the MakeableIndicator AVAILABLE/NOT AVAILABLE badge
// (dropped along with the header row wrapper it justified against) — D-43
// dimming is now the sole not-makeable visual signal in this view.
export function RecipeCard({ recipe, onSelect }: RecipeCardProps) {
  const isMakeable = recipe.overallStatus === 'green'

  return (
    <div
      onClick={() => onSelect(recipe)}
      className={`cursor-pointer py-lg flex flex-col gap-sm transition-opacity ${
        isMakeable ? '' : 'opacity-60 grayscale'
      }`}
    >
      <h3 className="text-white font-semibold break-words">{recipe.name}</h3>

      {/* D-38 tag triplet — already pre-sorted by TAG_GROUP_ORDER
          server-side, so .slice(0, 3) is deterministic. Empty tags render
          nothing in this row (PATR-02 zero-tags edge). */}
      {recipe.tags.length > 0 && (
        <p className="text-xs uppercase tracking-wide text-patron-accent">
          {recipe.tags.slice(0, 3).map((t) => t.name).join(' · ')}
        </p>
      )}

      {/* D-38: ingredient names without amounts, in cyan-white text. */}
      <p className="text-sm text-patron-accent-text">
        {recipe.ingredients.map((i) => i.categoryName).join(', ')}
      </p>

      <p className="text-[10px] uppercase tracking-wide text-patron-accent flex items-center gap-xs">
        Tap to View
        <ChevronRight size={12} aria-hidden="true" />
      </p>
    </div>
  )
}
