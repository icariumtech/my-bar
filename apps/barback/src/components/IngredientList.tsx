import { useIngredients } from '../api/useIngredients.js'

// This is the tracer slice's render target: one row per ingredient, name +
// category name + in-stock indicator, on the D-13 secondary surface at a
// 48px minimum tap-target height. Loading, error, filtered-empty and
// true-empty states are plan 01-05's scope — not built here.
export function IngredientList() {
  const { data: ingredients } = useIngredients()

  return (
    <ul className="flex flex-col gap-sm mt-md">
      {ingredients?.map((ingredient) => (
        <li
          key={ingredient.id}
          className="flex items-center justify-between gap-md bg-bar-surface rounded-lg px-md min-h-[48px]"
        >
          <div className="flex flex-col">
            <span className="text-white text-base">{ingredient.name}</span>
            <span className="text-zinc-400 text-sm">{ingredient.categoryName}</span>
          </div>
          <span
            aria-label={ingredient.inStock ? 'in stock' : 'out of stock'}
            className={`inline-block w-3 h-3 rounded-full ${
              ingredient.inStock ? 'bg-bar-accent' : 'bg-bar-destructive'
            }`}
          />
        </li>
      ))}
    </ul>
  )
}
