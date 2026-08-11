import { Button, Modal } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { Recipe } from '@my-bar/shared'
import { useDeleteRecipe } from '../api/useRecipes.js'
import { MakeableStatusBadge } from './MakeableStatusBadge.js'

interface RecipeRowProps {
  recipe: Recipe
  onEdit?: (recipe: Recipe) => void
  onView?: (recipe: Recipe) => void
}

// No `onDelete` prop — delete is self-contained here (mirrors
// 02-PATTERNS.md's RecipeRow sketch): the row owns useDeleteRecipe()
// directly and gates the mutate call behind an antd Modal.confirm naming
// the recipe (T-02-14), rather than requiring the parent to wire a
// delete handler through.
export function RecipeRow({ recipe, onEdit, onView: _onView }: RecipeRowProps) {
  const deleteRecipe = useDeleteRecipe()

  function handleDelete() {
    // 02-UI-SPEC.md Copywriting Contract: exact confirmation title/body,
    // named to this recipe — never a single-tap delete.
    Modal.confirm({
      title: `Delete ${recipe.name}?`,
      content: "This can't be undone.",
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: () => deleteRecipe.mutate(recipe.id),
    })
  }

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ minHeight: 48 }}>
      <div className="relative flex items-center justify-between gap-md min-h-[48px] px-md rounded-lg bg-bar-surface">
        <div className="flex flex-col min-w-0 flex-1 py-sm gap-xs">
          <span className="text-base truncate text-white">{recipe.name}</span>
          <MakeableStatusBadge makeable={recipe.makeable} />
        </div>

        <div className="flex items-center gap-sm shrink-0">
          {/* View is added in 02-06 once RecipeDetailView exists — this
              plan never renders a View affordance, regardless of whether
              `onView` is supplied. */}
          {onEdit && (
            <Button
              type="text"
              icon={<EditOutlined />}
              aria-label={`Edit ${recipe.name}`}
              onClick={() => onEdit(recipe)}
              style={{ minHeight: 48, minWidth: 48 }}
            />
          )}
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={`Delete ${recipe.name}`}
            loading={deleteRecipe.isPending}
            onClick={handleDelete}
            style={{ minHeight: 48, minWidth: 48 }}
          />
        </div>
      </div>
    </div>
  )
}
