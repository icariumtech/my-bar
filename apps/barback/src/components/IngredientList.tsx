import type { Ingredient } from '@my-bar/shared'
import { useIngredients, useToggleStock } from '../api/useIngredients.js'
import { IngredientRow } from './IngredientRow.js'

interface IngredientListProps {
  // Threaded through to each IngredientRow's edit affordance. Left
  // undefined here — plan 01-04 wires this to the edit form; until then
  // IngredientRow simply doesn't render the edit control.
  onEdit?: (ingredient: Ingredient) => void
}

// Renders one IngredientRow per ingredient (INV-03's swipeable stock
// toggle, deferred commit + undo) and supplies the commit handler backed
// by useToggleStock(). Loading, error, filtered-empty and true-empty
// states are plan 01-05's scope — not built here.
export function IngredientList({ onEdit }: IngredientListProps = {}) {
  const { data: ingredients } = useIngredients()
  const toggleStock = useToggleStock()

  function handleCommitToggle(id: string, nextInStock: boolean) {
    toggleStock.mutate({ id, inStock: nextInStock })
  }

  return (
    <ul className="flex flex-col gap-sm mt-md">
      {ingredients?.map((ingredient) => (
        <li key={ingredient.id}>
          <IngredientRow
            ingredient={ingredient}
            onCommitToggle={handleCommitToggle}
            onEdit={onEdit}
          />
        </li>
      ))}
    </ul>
  )
}
