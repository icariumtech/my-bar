import { useState } from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { Recipe } from '@my-bar/shared'
import { RecipeList } from './RecipeList.js'
import { RecipeForm } from './RecipeForm.js'
import { RecipeDetailView } from './RecipeDetailView.js'

// D-25/BARBACK-01: Recipes tab container — owns its OWN local add/edit/
// detail view state so switching the active bottom tab never resets this
// state. Wraps the existing (unchanged) RecipeList + RecipeForm +
// RecipeDetailView; only the shell (header + Add Recipe button) is new
// here. 'edit' reuses the 'add' view with `editing` populated, matching
// AddEditIngredientForm/RecipeForm's existing create/edit-via-optional-prop
// convention.
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
      <RecipeForm recipe={editing} open={view === 'add'} onClose={() => setView('list')} />
      {view === 'detail' && viewing && (
        <RecipeDetailView recipe={viewing} open onClose={() => setView('list')} />
      )}
    </div>
  )
}
