import { useEffect, useMemo, useRef, useState } from 'react'
import { Martini, Sparkles, Leaf, Flame, Settings } from 'lucide-react'
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

// 260817-g39: supersedes 03-CONTEXT.md's D-45 ("no hide/filter toggle") per
// a confirmed product decision — combines with filterRecipesByTag (AND) in
// RecipeBrowse. Mirrors filterRecipesByTag's same-array-reference contract
// when the filter is a no-op (showAvailableOnly === false). Makeable here
// means D-42's 2-state collapse: overallStatus === 'green'.
export function filterRecipesByAvailability(
  recipes: Recipe[],
  showAvailableOnly: boolean,
): Recipe[] {
  if (!showAvailableOnly) return recipes
  return recipes.filter((r) => r.overallStatus === 'green')
}

interface TagRailProps {
  recipes: Recipe[]
  selectedTagId: string | undefined
  onSelectTag: (tagId: string | undefined) => void
  showAvailableOnly: boolean
  onToggleAvailableOnly: () => void
}

export function TagRail({
  recipes,
  selectedTagId,
  onSelectTag,
  showAvailableOnly,
  onToggleAvailableOnly,
}: TagRailProps) {
  const activeTagIds = useMemo(() => getActiveTagIds(recipes), [recipes])
  // openFlyoutId is the single source of truth for which flyout (any tag
  // group's id, or the literal 'settings') is currently open — mutual
  // exclusivity across every control on the rail (all 4 groups + Settings)
  // falls out naturally from using one shared variable rather than one
  // boolean per control; there's no separate "close the others" logic
  // anywhere in this component.
  const [openFlyoutId, setOpenFlyoutId] = useState<string | undefined>(undefined)
  const railRef = useRef<HTMLDivElement>(null)

  // Generic outside-click/Escape close: works for ANY open flyout (a tag
  // group's or Settings') since it only checks "is the click inside the
  // whole rail" — never needs to know which flyout is open. Listeners are
  // only attached while something is open and removed on close/unmount.
  useEffect(() => {
    if (openFlyoutId === undefined) return

    function handlePointerDown(event: MouseEvent) {
      if (railRef.current && !railRef.current.contains(event.target as Node)) {
        setOpenFlyoutId(undefined)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenFlyoutId(undefined)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openFlyoutId])

  return (
    // 260813-ea3 neon-glow restyle: glowing rounded-full pill rail; stretches
    // to the full height of RecipeBrowse's min-h-dvh row (default flex
    // align-items: stretch) so it fills the left side of the screen, while
    // the icon buttons stay top-anchored via flex-col's default
    // justify-start. D-36/D-37 selection logic below is unchanged.
    <div
      ref={railRef}
      className="flex flex-col items-center gap-lg w-20 shrink-0 py-lg rounded-full glow-orange bg-patron-bg/50"
    >
      <div className="flex flex-col items-center gap-lg w-full">
        {TAG_GROUP_META.map((group) => {
          const groupTags = Array.from(
            recipes
              .flatMap((r) => r.tags)
              .filter((t) => t.group === group.id && activeTagIds.has(t.id))
              .reduce((map, t) => map.set(t.id, t), new Map<string, Tag>())
              .values(),
          )

          // D-36: zero active tags -> muted, non-interactive icon, no
          // flyout, never reveals an empty-result TagSubmenu.
          const isActive = groupTags.length > 0
          const isFlyoutOpen = isActive && openFlyoutId === group.id
          // Selection highlight persists independent of flyout open/closed
          // state — it only depends on whether selectedTagId belongs to
          // this group's own tags.
          const groupHasSelection =
            selectedTagId !== undefined && groupTags.some((t) => t.id === selectedTagId)
          const isSelectedState = isActive && (isFlyoutOpen || groupHasSelection)

          return (
            <div key={group.id} className="relative flex flex-col items-center gap-sm w-full">
              <button
                type="button"
                aria-label={group.label}
                aria-pressed={isSelectedState}
                onClick={
                  isActive
                    ? () => setOpenFlyoutId(isFlyoutOpen ? undefined : group.id)
                    : undefined
                }
                // 260813-ea3 neon-glow restyle: three explicit visual states
                // (muted / subtle-outlined / filled-selected) layered on the
                // unchanged isActive/isSelectedState booleans above — D-36's
                // opacity-40 class is preserved verbatim for
                // TagRail.test.tsx line 91.
                className={`flex flex-col items-center justify-center gap-xs w-14 h-14 rounded-xl transition-colors ${
                  !isActive
                    ? 'opacity-40 cursor-default text-patron-text-secondary'
                    : isSelectedState
                      ? 'glow-orange bg-patron-accent/20 text-patron-accent cursor-pointer'
                      : 'glow-orange-subtle text-patron-accent cursor-pointer'
                }`}
              >
                <group.Icon size={22} aria-hidden="true" />
                <span className="text-[10px] uppercase tracking-wide">{group.label}</span>
              </button>
              {isFlyoutOpen && (
                <div className="absolute left-full top-0 ml-sm z-50 min-w-[160px] rounded-2xl bg-patron-surface/95 backdrop-blur-sm glow-orange p-sm">
                  <TagSubmenu
                    tags={groupTags}
                    selectedTagId={selectedTagId}
                    // Toggle-to-clear: re-tapping the already-selected tag
                    // clears the filter (onSelectTag(undefined)); tapping
                    // any other tag replaces it (D-37, never combined).
                    // Selecting any tag also closes this flyout immediately.
                    onSelectTag={(tagId) => {
                      onSelectTag(tagId === selectedTagId ? undefined : tagId)
                      setOpenFlyoutId(undefined)
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 260817-hpy: bottom-pinned Settings gear — mt-auto pushes it to the
          bottom of this full-height rail, same footprint the removed
          Eye/EyeOff availability toggle occupied. Opens a flyout containing
          the "Show all recipes" checkbox (Task 2), sharing the same
          openFlyoutId mechanism as the tag groups above. */}
      <div className="relative flex flex-col items-center gap-sm w-full mt-auto">
        <button
          type="button"
          aria-label="Settings"
          aria-pressed={openFlyoutId === 'settings'}
          onClick={() => setOpenFlyoutId(openFlyoutId === 'settings' ? undefined : 'settings')}
          className={`flex flex-col items-center justify-center gap-xs w-14 h-14 rounded-xl transition-colors ${
            openFlyoutId === 'settings'
              ? 'glow-orange bg-patron-accent/20 text-patron-accent'
              : 'glow-orange-subtle text-patron-accent'
          }`}
        >
          <Settings size={22} aria-hidden="true" />
        </button>
        {openFlyoutId === 'settings' && (
          <div className="absolute left-full bottom-0 ml-sm z-50 min-w-[200px] rounded-2xl bg-patron-surface/95 backdrop-blur-sm glow-orange p-md flex flex-col gap-sm">
            <label className="flex items-center gap-sm cursor-pointer text-sm text-patron-text-secondary">
              <input
                type="checkbox"
                aria-label="Show all recipes"
                checked={!showAvailableOnly}
                onChange={onToggleAvailableOnly}
                className="w-5 h-5 rounded accent-patron-accent"
              />
              Show all recipes
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
