import { useState } from 'react'
import { Button, Collapse, Input } from 'antd'
import type { Recipe, Tag, TagGroup } from '@my-bar/shared'
import { TAG_GROUP_ORDER } from '@my-bar/shared'
import { useTags } from '../api/useTags.js'
import { FullScreenScrollArea } from './FullScreenScrollArea.js'

const GROUP_LABELS: Record<TagGroup, string> = {
  spirit: 'Spirit',
  type: 'Type',
  season: 'Season',
  flavor: 'Flavor',
}

function emptySelection(): Record<TagGroup, Set<string>> {
  return { spirit: new Set(), type: new Set(), season: new Set(), flavor: new Set() }
}

// Pure logic ahead of the component (Interface-First, mirrors
// apps/patron/src/components/TagRail.tsx's getActiveTagIds/
// filterRecipesByTag convention) — the only place the name+tag AND/OR
// combination rule lives; both this component's own Apply handler and
// RecipesTab's own filteredIds state consume its output, never re-deriving
// the rule independently.
export function filterRecipes(
  recipes: Recipe[],
  nameQuery: string,
  selectedTagIdsByGroup: Record<TagGroup, Set<string>>,
): Recipe[] {
  const normalizedQuery = nameQuery.trim().toLowerCase()

  function passesNameCheck(recipe: Recipe): boolean {
    return normalizedQuery === '' || recipe.name.toLowerCase().includes(normalizedQuery)
  }

  function passesTagCheck(recipe: Recipe): boolean {
    // A group with zero selections imposes no constraint (vacuously true).
    // Tags within the same group combine as OR; different groups combine
    // as AND.
    return TAG_GROUP_ORDER.every((group) => {
      const selected = selectedTagIdsByGroup[group]
      if (selected.size === 0) return true
      return recipe.tags.some((t) => t.group === group && selected.has(t.id))
    })
  }

  return recipes.filter((recipe) => passesNameCheck(recipe) && passesTagCheck(recipe))
}

interface RecipeSearchFilterProps {
  recipes: Recipe[]
  onApply: (matchingIds: Set<string>) => void
  onBack: () => void
}

// D-62: full-screen name+tag filter overlay — Recipes tab only (the Orders
// tab has no equivalent search affordance). Structural shape mirrors
// apps/barback/src/components/SearchFilterBar.tsx's sticky-header pattern,
// adapted to full-screen; group labels/order come from TAG_GROUP_ORDER, the
// single canonical sequence Patron's TagRail and Barback's TagPicker also
// read from. Resets on close (Clear button) but not automatically on
// unmount — RecipesTab remounts a fresh instance each time 'filter' view is
// entered, so local state naturally starts empty every time it opens.
export function RecipeSearchFilter({ recipes, onApply, onBack }: RecipeSearchFilterProps) {
  const { data: tags = [] } = useTags()
  const [nameQuery, setNameQuery] = useState('')
  const [selectedTagIdsByGroup, setSelectedTagIdsByGroup] =
    useState<Record<TagGroup, Set<string>>>(emptySelection())

  function toggleTag(group: TagGroup, tagId: string) {
    setSelectedTagIdsByGroup((prev) => {
      const next = new Set(prev[group])
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return { ...prev, [group]: next }
    })
  }

  function handleClear() {
    setNameQuery('')
    setSelectedTagIdsByGroup(emptySelection())
  }

  function handleApply() {
    const matching = filterRecipes(recipes, nameQuery, selectedTagIdsByGroup)
    onApply(new Set(matching.map((r) => r.id)))
  }

  const collapseItems = TAG_GROUP_ORDER.map((group) => {
    const groupTags = tags.filter((t: Tag) => t.group === group)
    return {
      key: group,
      label: GROUP_LABELS[group],
      children: (
        <div className="flex flex-wrap gap-sm">
          {groupTags.map((t) => {
            const isSelected = selectedTagIdsByGroup[group].has(t.id)
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleTag(group, t.id)}
                className={`shrink-0 whitespace-nowrap rounded-full px-md transition-colors ${
                  isSelected ? 'bg-bar-accent font-semibold text-zinc-900' : 'bg-bar-surface text-white'
                }`}
                style={{ minHeight: 48 }}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      ),
    }
  })

  return (
    <FullScreenScrollArea onBack={onBack} title="Search & Filter">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          placeholder="Recipe name…"
          autoFocus
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          size="large"
          style={{ minHeight: 48 }}
        />

        <div>
          <h3 className="text-white" style={{ marginBottom: 8 }}>
            Filter by tags
          </h3>
          <Collapse defaultActiveKey={[...TAG_GROUP_ORDER]} items={collapseItems} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button style={{ flex: 1, minHeight: 48 }} onClick={handleClear}>
            Clear
          </Button>
          <Button type="primary" style={{ flex: 1, minHeight: 48 }} onClick={handleApply}>
            Apply
          </Button>
        </div>
      </div>
    </FullScreenScrollArea>
  )
}
