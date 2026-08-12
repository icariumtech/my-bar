import { useEffect, useState } from 'react'
import { AutoComplete } from 'antd'
import { useCategories, useCreateCategory } from '../../api/useCategories.js'

export interface CategoryPickerProps {
  // Category id — this exact value/onChange prop shape is required so
  // antd Form.Item can clone them onto this component directly, mirroring
  // the fix already applied to UnitDropdown/GlasswareSelector (G-02-6).
  value?: string
  onChange?: (categoryId: string | undefined) => void
}

const CREATE_OPTION_VALUE = '__create__'

// D-27/BARBACK-03: single autocomplete-with-inline-create field for
// selecting or creating an ingredient category — replaces
// AddEditIngredientForm's static <Select> + renderCategoryPopup pattern.
// The AutoComplete's own displayed text is local `searchText` state,
// distinct from the committed categoryId this component reports via
// onChange — the two only agree once a selection settles.
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { data: categories = [] } = useCategories()
  const createCategory = useCreateCategory()
  const [searchText, setSearchText] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const selectedName = categories.find((c) => c.id === value)?.name

  // Keep the displayed text in sync with the externally-selected category
  // (Edit mode's pre-fill, or a parent form reset/re-populate) whenever
  // `value` — or the resolved name once categories finish loading — changes.
  // This never clobbers text the user is actively typing, since typing only
  // touches local `searchText`, not the `value` prop, until a selection is
  // committed via handleSelect.
  useEffect(() => {
    setSearchText(selectedName ?? '')
  }, [value, selectedName])

  const trimmedSearch = searchText.trim()
  const hasExactMatch =
    trimmedSearch.length > 0 &&
    categories.some((c) => c.name.toLowerCase() === trimmedSearch.toLowerCase())

  const filteredOptions = categories
    .filter((c) => c.name.toLowerCase().includes(trimmedSearch.toLowerCase()))
    .map((c) => ({ value: c.id, label: c.name }))

  // Only offer "+ Add" when the typed text matches no existing category
  // under a case-insensitive comparison — the plan's prohibition against
  // ever offering a near-identical duplicate (e.g. "Rum" vs "rum").
  const options =
    trimmedSearch.length > 0 && !hasExactMatch
      ? [...filteredOptions, { value: CREATE_OPTION_VALUE, label: `+ Add "${trimmedSearch}"` }]
      : filteredOptions

  function handleSearch(text: string) {
    setSearchText(text)
    setCreateError(null)
  }

  async function handleSelect(selectedValue: string) {
    if (selectedValue === CREATE_OPTION_VALUE) {
      setCreateError(null)
      try {
        const created = await createCategory.mutateAsync({ name: trimmedSearch })
        onChange?.(created.id)
        setSearchText(created.name)
      } catch {
        setCreateError("Couldn't create category — check the name and try again.")
      }
      return
    }

    setCreateError(null)
    onChange?.(selectedValue)
    const selected = categories.find((c) => c.id === selectedValue)
    setSearchText(selected?.name ?? '')
  }

  return (
    <div>
      <AutoComplete
        value={searchText}
        options={options}
        onSearch={handleSearch}
        onSelect={handleSelect}
        placeholder="Select or create a category"
      />
      {createError && <div style={{ color: '#ef4444', marginTop: 4 }}>{createError}</div>}
    </div>
  )
}
