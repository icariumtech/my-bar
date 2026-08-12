import { useEffect, useState } from 'react'
import { AutoComplete } from 'antd'
import { useCreateGlassware, useGlassware } from '../../api/useGlassware.js'

export interface GlasswarePickerProps {
  // Glassware id — this exact value/onChange prop shape mirrors
  // CategoryPicker's so antd Form.Item can clone them onto this component
  // directly. Glassware is optional (D-17): clearing the field reports
  // `undefined`, not a required-field validation error.
  value?: string
  onChange?: (glasswareId: string | undefined) => void
}

const CREATE_OPTION_VALUE = '__create__'

// D-27/BARBACK-03: single autocomplete-with-inline-create field for
// selecting or creating glassware — structurally identical to
// CategoryPicker (same value/onChange shape, same case-insensitive
// duplicate-prevention check for the "+ Add" trigger, same inline
// error-on-create-failure pattern), backed by useGlassware()/
// useCreateGlassware() instead of the category hooks. Replaces
// RecipeForm's static GlasswareSelector <Select>.
export function GlasswarePicker({ value, onChange }: GlasswarePickerProps) {
  const { data: glassware = [] } = useGlassware()
  const createGlassware = useCreateGlassware()
  const [searchText, setSearchText] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const selectedName = glassware.find((g) => g.id === value)?.name

  // Keep the displayed text in sync with the externally-selected glassware
  // (Edit mode's pre-fill, or a parent form reset/re-populate) whenever
  // `value` — or the resolved name once glassware finishes loading —
  // changes. Mirrors CategoryPicker's identical effect.
  useEffect(() => {
    setSearchText(selectedName ?? '')
  }, [value, selectedName])

  const trimmedSearch = searchText.trim()
  const hasExactMatch =
    trimmedSearch.length > 0 &&
    glassware.some((g) => g.name.toLowerCase() === trimmedSearch.toLowerCase())

  const filteredOptions = glassware
    .filter((g) => g.name.toLowerCase().includes(trimmedSearch.toLowerCase()))
    .map((g) => ({ value: g.id, label: g.name }))

  // Only offer "+ Add" when the typed text matches no existing glassware
  // under a case-insensitive comparison — mirrors CategoryPicker's identical
  // duplicate-prevention rule from plan 02.1-03, applied to the glassware
  // namespace (this plan's prohibition).
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
        const created = await createGlassware.mutateAsync({ name: trimmedSearch })
        onChange?.(created.id)
        setSearchText(created.name)
      } catch {
        setCreateError("Couldn't create glassware — check the name and try again.")
      }
      return
    }

    setCreateError(null)
    onChange?.(selectedValue)
    const selected = glassware.find((g) => g.id === selectedValue)
    setSearchText(selected?.name ?? '')
  }

  // D-17: glassware is nullable — clearing the field reports `undefined`
  // rather than being blocked by a required-field rule.
  function handleClear() {
    setCreateError(null)
    setSearchText('')
    onChange?.(undefined)
  }

  return (
    <div>
      <AutoComplete
        value={searchText}
        options={options}
        onSearch={handleSearch}
        onSelect={handleSelect}
        onClear={handleClear}
        allowClear
        placeholder="Select or create a glassware type (optional)"
      />
      {createError && <div style={{ color: '#ef4444', marginTop: 4 }}>{createError}</div>}
    </div>
  )
}
