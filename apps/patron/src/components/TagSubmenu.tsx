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
export function TagSubmenu({ tags, selectedTagId, onSelectTag }: TagSubmenuProps) {
  return (
    <div className="flex flex-col gap-xs w-full">
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onSelectTag(tag.id)}
          className={`text-xs px-sm py-xs rounded whitespace-nowrap ${
            tag.id === selectedTagId
              ? 'bg-patron-accent text-white'
              : 'bg-patron-surface text-patron-text-secondary'
          }`}
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
