import { Input } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { useCategories } from '../api/useCategories.js'

interface SearchFilterBarProps {
  query: string
  onQueryChange: (query: string) => void
  categoryId: string | null
  onCategoryChange: (categoryId: string | null) => void
}

// Controlled name-search input plus category filter chips (INV-04).
// SearchFilterBar owns no state itself — IngredientList holds query and
// categoryId so the filtered array can be memoized alongside them (and so
// this component stays a pure, reusable control). The Input's built-in
// `allowClear` is the one-handed clear affordance called out in the plan:
// the owner can reset the query without selecting text.
export function SearchFilterBar({
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
}: SearchFilterBarProps) {
  const { data: categories } = useCategories()

  return (
    <div className="flex flex-col gap-sm">
      <Input
        allowClear
        size="large"
        prefix={<SearchOutlined className="text-zinc-400" />}
        placeholder="Search by name or category"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        style={{ minHeight: 48 }}
      />
      <div
        className="flex gap-sm overflow-x-auto pb-xs"
        role="tablist"
        aria-label="Filter by category"
      >
        <CategoryChip label="All" active={categoryId === null} onClick={() => onCategoryChange(null)} />
        {categories?.map((category) => (
          <CategoryChip
            key={category.id}
            label={category.name}
            active={categoryId === category.id}
            onClick={() => onCategoryChange(category.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface CategoryChipProps {
  label: string
  active: boolean
  onClick: () => void
}

// Accent (#22c55e) is reserved by the UI-SPEC for primary CTAs, the
// in-stock indicator, and exactly this active-filter state — unselected
// chips use the secondary surface token instead, never a tint of accent.
function CategoryChip({ label, active, onClick }: CategoryChipProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-md transition-colors ${
        active ? 'bg-bar-accent font-semibold text-zinc-900' : 'bg-bar-surface text-white'
      }`}
      style={{ minHeight: 48 }}
    >
      {label}
    </button>
  )
}
