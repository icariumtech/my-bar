import type { Tag } from '@my-bar/shared'

interface TagSubmenuProps {
  tags: Tag[]
  selectedTagId: string | undefined
  onSelectTag: (tagId: string) => void
}

// Dumb, reusable list renderer — the toggle-to-clear behavior (tapping an
// already-selected tag clears the filter) lives in the PARENT (TagRail),
// which wraps onSelectTag before passing it down. This component only
// ever calls onSelectTag(tag.id), nothing else.
//
// 260817-hpy: rendered inside an absolutely-positioned flyout wrapper owned
// by TagRail (anchored beside the trigger button, not inline-pushed below
// it) — positioning/card-chrome is TagRail's responsibility entirely.
// TagSubmenu itself remains a dumb, unpositioned list renderer; its own
// wrapper div and all button/selection logic below are unchanged.
export function TagSubmenu({ tags, selectedTagId, onSelectTag }: TagSubmenuProps) {
  return (
    <div className="flex flex-col gap-xs w-full">
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onSelectTag(tag.id)}
          // 260813-ea3 neon-glow restyle: chip visual treatment only —
          // selection logic (tag.id === selectedTagId) is unchanged.
          className={`text-xs px-sm py-xs rounded-lg whitespace-nowrap uppercase tracking-wide transition-colors ${
            tag.id === selectedTagId
              ? 'bg-patron-accent text-white glow-orange-subtle'
              : 'bg-patron-bg/60 text-patron-text-secondary border border-patron-accent/30'
          }`}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
