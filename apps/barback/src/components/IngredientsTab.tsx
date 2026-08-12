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
//
// 260812-gcp: bumped the sticky wrapper's top padding from `pt-md` to
// `pt-lg` for clearer breathing room above the Add-button row, matching
// 260812-fpi's identical `pb-sm` → `pb-md` fix on the header's bottom edge.
//
// 260812-j0q: the 260812-gcp `pt-lg` bump never actually took visual
// effect. Tailwind v4 wraps all its generated utility classes (including
// `pt-lg`) inside `@layer utilities`, while `.safe-area-inset-top` in
// index.css is an unlayered author rule. Per the CSS cascade-layers spec,
// an unlayered rule always wins over a layered rule for the same property
// regardless of source order — so `.safe-area-inset-top`'s
// `padding-top: env(safe-area-inset-top)` (which resolves to `0px` on any
// non-notched device) silently zeroed out `pt-lg`'s `padding-top: 24px` on
// every device without a safe-area inset. Fixed by moving the padding
// value directly into `.safe-area-inset-top` itself (now
// `calc(env(safe-area-inset-top) + var(--spacing-lg))`, matching
// `.safe-area-inset-bottom`'s existing additive pattern) — `pt-lg` is now
// redundant and has been removed from the className below.
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
      <div className="sticky top-0 z-10 bg-bar-bg pb-md safe-area-inset-top">
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
