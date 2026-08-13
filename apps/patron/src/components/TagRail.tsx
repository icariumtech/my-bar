import { useMemo, useState } from 'react'
import { Martini, Sparkles, Leaf, Flame } from 'lucide-react'
import type { Recipe, Tag } from '@my-bar/shared'
import { TagSubmenu } from './TagSubmenu.js'

// D-33/D-34: fixed 4-group taxonomy, iterated in this order everywhere
// (mirrors TAG_GROUP_ORDER from @my-bar/shared — kept as a local literal
// here since the icon mapping is UI-only and doesn't belong in the shared
// package). Icon names verified against lucide-react@1.31.0's own
// dist/lucide-react.d.ts.
export const TAG_GROUP_META = [
  { id: 'spirit', label: 'Spirit', Icon: Martini },
  { id: 'type', label: 'Type', Icon: Sparkles },
  { id: 'season', label: 'Season', Icon: Leaf },
  { id: 'flavor', label: 'Flavor', Icon: Flame },
] as const

// Pure logic ahead of the component (Interface-First) — RecipeBrowse.tsx
// (03-02 Task 2) imports both directly rather than re-deriving them.

// D-36: every tag id referenced by at least one recipe, computed live from
// the fetched recipe list — never hardcoded.
export function getActiveTagIds(recipes: Recipe[]): Set<string> {
  const ids = new Set<string>()
  recipes.forEach((r) => r.tags.forEach((t) => ids.add(t.id)))
  return ids
}

// D-37 support: undefined tagId means "no active filter" — returns the
// exact input array reference (all recipes, unfiltered). A concrete tagId
// returns only recipes carrying that tag.
export function filterRecipesByTag(recipes: Recipe[], tagId: string | undefined): Recipe[] {
  if (tagId === undefined) return recipes
  return recipes.filter((r) => r.tags.some((t) => t.id === tagId))
}

interface TagRailProps {
  recipes: Recipe[]
  selectedTagId: string | undefined
  onSelectTag: (tagId: string | undefined) => void
}

export function TagRail({ recipes, selectedTagId, onSelectTag }: TagRailProps) {
  const activeTagIds = useMemo(() => getActiveTagIds(recipes), [recipes])
  // Only one group's submenu open at a time — ordinary accordion
  // behavior, not part of D-37's tag-selection rule.
  const [expandedGroupId, setExpandedGroupId] = useState<string | undefined>(undefined)

  return (
    <div className="flex flex-col gap-md items-center w-16 shrink-0">
      {TAG_GROUP_META.map((group) => {
        const groupTags = Array.from(
          recipes
            .flatMap((r) => r.tags)
            .filter((t) => t.group === group.id && activeTagIds.has(t.id))
            .reduce((map, t) => map.set(t.id, t), new Map<string, Tag>())
            .values(),
        )

        // D-36: zero active tags -> muted, non-interactive icon, no
        // expand state, never reveals an empty-result TagSubmenu.
        const isActive = groupTags.length > 0
        const isExpanded = isActive && expandedGroupId === group.id

        return (
          <div key={group.id} className="flex flex-col items-center gap-sm w-full">
            <button
              type="button"
              aria-label={group.label}
              onClick={
                isActive
                  ? () => setExpandedGroupId(isExpanded ? undefined : group.id)
                  : undefined
              }
              className={`flex flex-col items-center gap-xs p-sm rounded w-full ${
                isActive
                  ? 'text-patron-accent cursor-pointer'
                  : 'opacity-40 cursor-default text-patron-text-secondary'
              }`}
            >
              <group.Icon size={24} aria-hidden="true" />
              <span className="text-xs">{group.label}</span>
            </button>
            {isExpanded && (
              <TagSubmenu
                tags={groupTags}
                selectedTagId={selectedTagId}
                // Toggle-to-clear: re-tapping the already-selected tag
                // clears the filter (onSelectTag(undefined)); tapping any
                // other tag replaces it (D-37, never combined).
                onSelectTag={(tagId) =>
                  onSelectTag(tagId === selectedTagId ? undefined : tagId)
                }
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
