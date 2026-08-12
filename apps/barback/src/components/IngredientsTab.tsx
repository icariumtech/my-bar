import { useState } from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { Ingredient } from '@my-bar/shared'
import { IngredientList } from './IngredientList.js'
import { AddEditIngredientForm } from './AddEditIngredientForm.js'

// D-25/BARBACK-01: Ingredients tab container — owns its OWN local add/edit
// view state so switching the active bottom tab never resets this state.
// Wraps the existing (unchanged) IngredientList + AddEditIngredientForm;
// only the shell (header + Add Ingredient button) is new here.
export function IngredientsTab() {
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list')
  const [editing, setEditing] = useState<Ingredient>()

  function openAdd() {
    setEditing(undefined)
    setView('add')
  }

  function openEdit(ingredient: Ingredient) {
    setEditing(ingredient)
    setView('add')
  }

  return (
    <div className="px-md pb-3xl">
      <div className="flex items-center justify-between pt-md pb-sm">
        <h2 className="text-white text-xl font-semibold">Ingredients</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          style={{ minHeight: 48 }}
          onClick={openAdd}
        >
          Add Ingredient
        </Button>
      </div>
      <IngredientList onEdit={openEdit} />
      <AddEditIngredientForm
        ingredient={editing}
        open={view === 'add'}
        onClose={() => setView('list')}
      />
    </div>
  )
}
