import { useState } from 'react'
import { Alert, Button, Card, Spin } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { Recipe } from '@my-bar/shared'
import { useRecipes } from '../api/useRecipes.js'
import { MakeableStatusBadge } from './MakeableStatusBadge.js'
import { RecipeOrOrderDetail } from './RecipeOrOrderDetail.js'
import { RecipeSearchFilter } from './RecipeSearchFilter.js'

// BART-01/BART-05/BART-06/D-55/D-62: Recipes tab container — a read-only
// lookup surface (no add/edit/delete anywhere, per this plan's own
// prohibition). Owns a 'list' | 'filter' | 'detail' view state machine
// mirroring apps/barback/src/components/RecipesTab.tsx's own shape, but
// simpler (no 'add' view exists here). filteredIds === undefined means "no
// filter applied" (full unfiltered list); RecipeSearchFilter (Task 2 of
// this plan) sets it via onApply.
export function RecipesTab() {
  const [view, setView] = useState<'list' | 'filter' | 'detail'>('list')
  const [viewing, setViewing] = useState<Recipe>()
  const [filteredIds, setFilteredIds] = useState<Set<string> | undefined>(undefined)
  const { data: recipes, isPending, isError, refetch } = useRecipes()

  if (view === 'detail' && viewing) {
    return <RecipeOrOrderDetail recipe={viewing} onBack={() => setView('list')} />
  }

  if (view === 'filter') {
    return (
      <RecipeSearchFilter
        recipes={recipes ?? []}
        onApply={(ids) => {
          setFilteredIds(ids)
          setView('list')
        }}
        onBack={() => setView('list')}
      />
    )
  }

  if (isPending) {
    return (
      <div role="status" className="flex justify-center pt-3xl">
        <Spin description="Loading recipes…" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="pt-lg px-md">
        <Alert
          type="error"
          showIcon
          message="Failed to load recipes. Check your connection."
          action={
            <Button size="small" style={{ minHeight: 48 }} onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  const allRecipes = recipes ?? []
  // Covers both the true-system-empty case and the filtered-to-zero case,
  // matching Barback's own empty-copy-reuse precedent (UI-SPEC backstop).
  const visibleRecipes =
    filteredIds === undefined ? allRecipes : allRecipes.filter((r) => filteredIds.has(r.id))

  return (
    <div className="px-md pb-3xl">
      <div className="sticky top-0 z-10 bg-bar-bg pb-md pt-lg safe-area-inset-top flex justify-end">
        <Button
          icon={<SearchOutlined />}
          aria-label="Search & Filter"
          onClick={() => setView('filter')}
          style={{ width: 48, height: 48, minWidth: 48, padding: 0 }}
        />
      </div>

      {visibleRecipes.length === 0 ? (
        <div className="text-center pt-3xl px-md">
          <p className="text-zinc-400">No recipes match your search</p>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {visibleRecipes.map((recipe) => (
            <Card
              key={recipe.id}
              hoverable
              onClick={() => {
                setViewing(recipe)
                setView('detail')
              }}
              style={{ cursor: 'pointer' }}
              styles={{ body: { padding: 16 } }}
            >
              <div className="flex flex-col gap-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white">{recipe.name}</span>
                  <MakeableStatusBadge status={recipe.overallStatus} />
                </div>
                <span className="text-zinc-400 text-sm">
                  {recipe.ingredients.map((ing) => ing.ingredientName ?? ing.categoryName).join(', ')}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
