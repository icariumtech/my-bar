import { X } from 'lucide-react'
import { useRecipeDetail } from '../api/useRecipeDetail.js'

interface RecipeDetailProps {
  recipeId: string
  onBack: () => void
}

// PATR-02/PATR-04/D-39: full-screen detail view reachable by tapping any
// RecipeBrowse card. Fetches independently via useRecipeDetail(recipeId)
// — never a snapshot object passed at tap-time — so 03-05's live-sync
// invalidation of ['recipes'] also reaches an open detail screen (D-47).
//
// D-39 differences from RecipeCard (03-01, D-38): full tag list (no
// .slice(0, 3)) and ingredient lines show category names only, same as
// the card — but the missing-ingredient detail (D-44) surfaces ONLY here,
// never on the card.
//
// Patron builds its own minimal header rather than reusing Barback's
// antd-based header component, since Patron has no antd dependency.
//
// 260813-ea3 neon-glow restyle: the header control is now a top-right
// circular glow "X" (still aria-label="Back", still calls the same onBack
// prop — a visual/position change only, not a behavior change), the
// placeholder hero is now a radial-gradient vignette, and the content
// area is now a single glow-bordered card matching RecipeCard's surface
// treatment.
export function RecipeDetail({ recipeId, onBack }: RecipeDetailProps) {
  const { data: recipe, isLoading, isError } = useRecipeDetail(recipeId)

  if (isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-patron-bg">
        <p className="text-white">Loading drinks…</p>
      </div>
    )
  }

  if (isError || !recipe) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-md bg-patron-bg px-xl text-center">
        <h1 className="text-white">Something went wrong</h1>
        <p className="text-patron-text-secondary">
          Failed to load drinks. Please check your connection and try again.
        </p>
      </div>
    )
  }

  // D-44: the specific-category callout is reserved for this screen only,
  // and only when the recipe is genuinely red with something missing — a
  // yellow-collapsed-to-not-available recipe (D-42) has nothing truly
  // missing, so no false/empty callout renders.
  const showMissing = recipe.overallStatus === 'red' && recipe.missingCategoryNames.length > 0
  // D-40/UI-SPEC Partial row: omitted entirely, not rendered empty.
  const showDescription = Boolean(recipe.description && recipe.description.trim().length > 0)

  return (
    <div className="h-dvh flex flex-col bg-patron-bg">
      <div className="relative shrink-0">
        {/* D-41: purely decorative radial-gradient hero vignette — not a
            button/link. */}
        <div
          className="h-64 w-full"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,107,53,0.18) 0%, rgba(26,35,50,0.9) 70%)',
          }}
        />
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="absolute top-md right-md w-10 h-10 rounded-full bg-patron-bg/80 flex items-center justify-center glow-orange text-patron-accent"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      {/* UI-SPEC Overflow backstop: this content area (not the whole
          viewport) scrolls, so a long description never clips/overflows. */}
      <div className="flex-1 overflow-y-auto px-lg pb-3xl -mt-lg">
        <div className="rounded-2xl bg-patron-surface/70 backdrop-blur-sm glow-orange p-lg flex flex-col gap-md">
          <h1 className="text-white text-[28px] font-semibold leading-tight">{recipe.name}</h1>

          {recipe.tags.length > 0 && (
            <p className="text-xs uppercase tracking-wide text-patron-accent">
              {recipe.tags.map((t) => t.name).join(' · ')}
            </p>
          )}

          {showMissing && (
            <p className="text-patron-destructive">
              {`Not Available — ${recipe.missingCategoryNames.join(', ')} missing.`}
            </p>
          )}

          <div className="h-px bg-patron-accent/30" />

          <div>
            <h3 className="text-white mb-sm">Ingredients</h3>
            {/* Ingredient lines are guaranteed non-empty by the existing
                recipeInput.ingredients Zod boundary (min 1) — no empty
                state needed here. Only the category name is ever shown. */}
            <ul className="flex flex-col gap-xs">
              {recipe.ingredients.map((i) => (
                <li key={i.id} className="text-patron-accent-text">
                  {i.categoryName}
                </li>
              ))}
            </ul>
          </div>

          {showDescription && (
            <div>
              <h3 className="text-white mb-sm">Description</h3>
              <p className="text-patron-accent-text italic">{recipe.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
