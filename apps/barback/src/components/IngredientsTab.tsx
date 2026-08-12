import { useState } from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { Ingredient } from '@my-bar/shared'
import { IngredientList } from './IngredientList.js'
import { AddEditIngredientView } from './views/AddEditIngredientView.js'

// D-25/BARBACK-01/D-26: Ingredients tab container — owns its OWN local
// add/edit view state so switching the active bottom tab never resets this
// state. When view === 'add', the full-screen AddEditIngredientView
// replaces this tab's entire content area (list is not rendered
// underneath it) — mirrors the same conditional-full-screen-render
// pattern every other full-screen-view plan in this phase follows.
export function IngredientsTab() {
  const [view, setView] = useState<'list' | 'add'>('list')
  const [editing, setEditing] = useState<Ingredient>()

  function openAdd() {
    setEditing(undefined)
    setView('add')
  }

  function openEdit(ingredient: Ingredient) {
    setEditing(ingredient)
    setView('add')
  }

  if (view === 'add') {
    return <AddEditIngredientView ingredient={editing} onBack={() => setView('list')} />
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
    </div>
  )
}
