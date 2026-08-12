import { useEffect, useState } from 'react'
import { AutoComplete, Checkbox } from 'antd'
import { useCategories } from '../../api/useCategories.js'
import { useIngredients } from '../../api/useIngredients.js'

// D-28/D-30: a single autocomplete field that searches BOTH existing
// categories and existing specific ingredients — selecting a category
// behaves like plain category matching (ingredientId null, requiresSpecific
// false); selecting a specific ingredient additionally surfaces the "must
// be this specific ingredient" checkbox, defaulting to checked. Does NOT
// rely on antd Form.Item's automatic value/onChange cloning (that clone
// pattern only carries a single scalar value; this field writes three
// related values at once) — accepts and emits a composite value directly as
// plain props. The later plan wiring this into the recipe ingredient-line
// form is responsible for reading/writing the row's three underlying
// Form.List fields via a `<Form.Item noStyle shouldUpdate>` render-prop
// around this component.
export interface IngredientPickerValue {
  categoryId: string | undefined
  ingredientId: string | null
  requiresSpecific: boolean
}

export interface IngredientPickerProps {
  value: IngredientPickerValue
  onChange: (next: IngredientPickerValue) => void
  // Task 1 stub: selecting "+ Add new ingredient" calls this callback with
  // the typed name rather than implementing the creation sub-flow inline.
  // Task 2 replaces this with a real, self-contained inline sub-flow and
  // removes this prop entirely.
  onRequestCreate?: (name: string) => void
}

const CATEGORY_PREFIX = 'cat:'
const INGREDIENT_PREFIX = 'ing:'
const CREATE_INGREDIENT_VALUE = '__create_ingredient__'

export function IngredientPicker({ value, onChange, onRequestCreate }: IngredientPickerProps) {
  const { data: categories } = useCategories()
  const { data: ingredients } = useIngredients()
  const [search, setSearch] = useState('')

  // Keep the displayed text in sync with the externally-controlled `value`:
  // if a specific ingredient is selected, show its name; else if a category
  // is selected, show the category's name; else empty string.
  useEffect(() => {
    if (value.ingredientId) {
      const selectedIngredient = ingredients?.find((i) => i.id === value.ingredientId)
      setSearch(selectedIngredient?.name ?? '')
      return
    }
    if (value.categoryId) {
      const selectedCategory = categories?.find((c) => c.id === value.categoryId)
      setSearch(selectedCategory?.name ?? '')
      return
    }
    setSearch('')
  }, [value.categoryId, value.ingredientId, categories, ingredients])

  const trimmed = search.trim()

  // RESEARCH.md Pitfall 2: category and ingredient options are grouped
  // under separate headings, and an ingredient's label includes its
  // category name, so the owner cannot mistake selecting a category for
  // selecting a specific bottle.
  const categoryOptions = (categories ?? []).map((c) => ({
    value: `${CATEGORY_PREFIX}${c.id}`,
    label: c.name,
  }))
  const ingredientOptions = (ingredients ?? []).map((i) => ({
    value: `${INGREDIENT_PREFIX}${i.id}`,
    label: `${i.name} (${i.categoryName})`,
  }))

  const options: { label: string; options: { value: string; label: string }[] }[] = [
    { label: 'Categories', options: categoryOptions },
    { label: 'Ingredients', options: ingredientOptions },
  ]

  // This plan's first prohibition: never offer "+ Add new ingredient" for a
  // name that already exists among ingredients under a case-insensitive
  // comparison.
  const hasExactIngredientMatch = (ingredients ?? []).some(
    (i) => i.name.toLowerCase() === trimmed.toLowerCase(),
  )

  if (trimmed.length > 0 && !hasExactIngredientMatch) {
    options.push({
      label: 'Add New',
      options: [{ value: CREATE_INGREDIENT_VALUE, label: `+ Add new ingredient "${trimmed}"` }],
    })
  }

  function handleSearch(text: string) {
    setSearch(text)
  }

  function handleSelect(selectedValue: string) {
    if (selectedValue === CREATE_INGREDIENT_VALUE) {
      onRequestCreate?.(trimmed)
      return
    }

    if (selectedValue.startsWith(CATEGORY_PREFIX)) {
      const categoryId = selectedValue.slice(CATEGORY_PREFIX.length)
      onChange({ categoryId, ingredientId: null, requiresSpecific: false })
      return
    }

    if (selectedValue.startsWith(INGREDIENT_PREFIX)) {
      const ingredientId = selectedValue.slice(INGREDIENT_PREFIX.length)
      const selectedIngredient = ingredients?.find((i) => i.id === ingredientId)
      onChange({
        categoryId: selectedIngredient?.categoryId,
        ingredientId,
        requiresSpecific: true,
      })
    }
  }

  function handleCheckboxChange(checked: boolean) {
    onChange({ ...value, requiresSpecific: checked })
  }

  return (
    <>
      <AutoComplete
        value={search}
        options={options}
        onSearch={handleSearch}
        onSelect={handleSelect}
        placeholder="Search categories or ingredients"
      />
      {value.ingredientId && (
        <Checkbox
          checked={value.requiresSpecific}
          onChange={(e) => handleCheckboxChange(e.target.checked)}
          style={{ marginTop: 8 }}
        >
          Must be this specific ingredient
        </Checkbox>
      )}
    </>
  )
}
