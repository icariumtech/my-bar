import { useState } from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { Recipe } from '@my-bar/shared'
import { RecipeList } from './RecipeList.js'
import { AddEditRecipeView } from './views/AddEditRecipeView.js'
import { RecipeDetailView } from './views/RecipeDetailView.js'

// D-25/BARBACK-01/D-26: Recipes tab container — owns its OWN local
// add/edit/detail view state so switching the active bottom tab never
// resets this state. When view === 'add' or 'detail', the corresponding
// full-screen view replaces this tab's entire content area (list is not
// rendered underneath it) — mirrors IngredientsTab's identical
// conditional-full-screen-render pattern. 'edit' reuses the 'add' view with
// `editing` populated, matching AddEditIngredientView/AddEditRecipeView's
// existing create/edit-via-optional-prop convention. RecipeDetailView is
// now full-screen too (02.1-07) — the last Modal-shelled view in this
// phase's scope is retired.
export function RecipesTab() {
  const [view, setView] = useState<'list' | 'add' | 'detail'>('list')
  const [editing, setEditing] = useState<Recipe>()
  const [viewing, setViewing] = useState<Recipe>()

  function openAdd() {
    setEditing(undefined)
    setView('add')
  }

  function openEdit(recipe: Recipe) {
    setEditing(recipe)
    setView('add')
  }

  function openDetail(recipe: Recipe) {
    setViewing(recipe)
    setView('detail')
  }

  if (view === 'add') {
    return <AddEditRecipeView recipe={editing} onBack={() => setView('list')} />
  }

  if (view === 'detail' && viewing) {
    return <RecipeDetailView recipe={viewing} onBack={() => setView('list')} />
  }

  return (
    <div className="px-md pb-3xl">
      <div className="flex items-center justify-between pt-md pb-sm">
        <h2 className="text-white text-xl font-semibold">Recipes</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ minHeight: 48 }}
          onClick={openAdd}
        >
          Add Recipe
        </Button>
      </div>
      <RecipeList onEdit={openEdit} onView={openDetail} />
    </div>
  )
}
