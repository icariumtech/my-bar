import { useState } from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { Ingredient } from '@my-bar/shared'
import { IngredientList } from './IngredientList.js'
import { SearchFilterBar } from './SearchFilterBar.js'
import { AddEditIngredientView } from './views/AddEditIngredientView.js'

// D-25/BARBACK-01/D-26: Ingredients tab container — owns its OWN local
// add/edit view state so switching the active bottom tab never resets this
// state. When view === 'add', the full-screen AddEditIngredientView
// replaces this tab's entire content area (list is not rendered
// underneath it) — mirrors the same conditional-full-screen-render
// pattern every other full-screen-view plan in this phase follows.
//
// 260812-e8j: also owns the search/filter state (query, categoryId, lifted
// up from IngredientList) so the title/Add-button row and SearchFilterBar
// can render as one pinned `position: sticky` unit — before this, only the
// search bar attempted to pin and the title row above it always scrolled
// away.
//
// 260812-fpi: removed the per-tab "Ingredients" `<h2>` — BottomTabBar's
// active-tab state already communicates which tab is open, so the heading
// was redundant. Also bumped the sticky wrapper's bottom padding from
// `pb-sm` to `pb-md` for a clearer visual gap above the scrolling list.
export function IngredientsTab() {
  const [view, setView] = useState<'list' | 'add'>('list')
  const [editing, setEditing] = useState<Ingredient>()
  const [query, setQuery] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)

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
      <div className="sticky top-0 z-10 bg-bar-bg pt-md pb-md safe-area-inset-top">
        <div className="flex justify-end pb-md">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ minHeight: 48 }}
            onClick={openAdd}
          >
            Add Ingredient
          </Button>
        </div>
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
        />
      </div>
      <IngredientList onEdit={openEdit} query={query} categoryId={categoryId} />
    </div>
  )
}
