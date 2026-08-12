import { useEffect, useState } from 'react'
import { AutoComplete } from 'antd'
import { useCategories, useCreateCategory } from '../../api/useCategories.js'

// D-27: replaces the static `<Select>` category dropdown with a single
// autocomplete-with-inline-create field. Deliberately NOT relying on antd
// Form.Item's automatic value/onChange cloning being the only wiring path —
// this component still accepts the exact `value`/`onChange` shape Form.Item
// clones onto its child (mirrors the G-02-6 fix already applied to
// UnitDropdown/GlasswareSelector), so it drops in as a Form.Item child
// unchanged.
//
// NOTE (deviation, 02.1-05 plan): this file is a dependency created ahead
// of 02.1-03 (same wave, parallel worktree, no visibility into its sibling's
// file writes) because IngredientPicker's inline-create sub-flow (task 2)
// needs a working CategoryPicker for its own category field. Implemented to
// match 02.1-03-PLAN.md's task 1 spec as closely as possible to minimize
// merge divergence when wave 2 is reconciled.
export interface CategoryPickerProps {
  value?: string
  onChange?: (categoryId: string | undefined) => void
}

const CREATE_VALUE = '__create__'

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { data: categories } = useCategories()
  const createCategory = useCreateCategory()
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Keep the displayed text in sync with the externally-controlled `value`
  // (category id) — looks up the category's name for display, distinct
  // from the id-shaped onChange payload.
  useEffect(() => {
    const selectedName = categories?.find((c) => c.id === value)?.name
    setSearch(selectedName ?? '')
  }, [value, categories])

  const trimmed = search.trim()
  const hasExactMatch = (categories ?? []).some(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  )

  const options = (categories ?? []).map((c) => ({ value: c.id, label: c.name }))

  if (trimmed.length > 0 && !hasExactMatch) {
    options.push({ value: CREATE_VALUE, label: `+ Add "${trimmed}"` })
  }

  function handleSearch(text: string) {
    setSearch(text)
    setError(null)
  }

  async function handleSelect(selectedValue: string) {
    if (selectedValue === CREATE_VALUE) {
      if (!trimmed) return
      setError(null)
      try {
        const created = await createCategory.mutateAsync({ name: trimmed })
        onChange?.(created.id)
        setSearch(created.name)
      } catch {
        setError("Couldn't create category — check the name and try again.")
      }
      return
    }

    onChange?.(selectedValue)
    const selectedName = categories?.find((c) => c.id === selectedValue)?.name
    setSearch(selectedName ?? '')
  }

  return (
    <>
      <AutoComplete
        value={search}
        options={options}
        onSearch={handleSearch}
        onSelect={handleSelect}
        placeholder="Select or add a category"
      />
      {error && <div style={{ color: '#ef4444', marginTop: 4 }}>{error}</div>}
    </>
  )
}
