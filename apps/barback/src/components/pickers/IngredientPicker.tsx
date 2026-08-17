import { useEffect, useState } from 'react'
import { AutoComplete, Button, Checkbox, Switch } from 'antd'
import { useCategories, useCreateCategory } from '../../api/useCategories.js'
import { useCreateIngredient, useIngredients, useToggleStock } from '../../api/useIngredients.js'
import { CategoryPicker } from './CategoryPicker.js'

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
}

const CATEGORY_PREFIX = 'cat:'
const INGREDIENT_PREFIX = 'ing:'
const CREATE_INGREDIENT_VALUE = '__create_ingredient__'
const CREATE_CATEGORY_VALUE = '__create_category__'

export function IngredientPicker({ value, onChange }: IngredientPickerProps) {
  const { data: categories } = useCategories()
  const { data: ingredients } = useIngredients()
  const createIngredient = useCreateIngredient()
  const createCategory = useCreateCategory()
  const toggleStock = useToggleStock()
  const [search, setSearch] = useState('')
  // D-29: inline ingredient creation sub-flow, fully self-contained in this
  // component — no Modal, no navigation away from the current form.
  const [creating, setCreating] = useState<{ name: string } | null>(null)
  const [newIngredientCategoryId, setNewIngredientCategoryId] = useState<string | undefined>(
    undefined,
  )
  // D-09: new ingredients default to in-stock; this switch lets the owner
  // flip that at creation time, which the normal AddEditIngredientView form
  // deliberately does not expose (D-08) — POST /api/ingredients has no
  // inStock field, so an unchecked switch is honored with a follow-up
  // PATCH .../stock call after creation succeeds.
  const [newIngredientInStock, setNewIngredientInStock] = useState(true)
  const [createError, setCreateError] = useState<string | null>(null)

  // Keep the displayed text in sync with the externally-controlled `value`:
  // if a specific ingredient is selected, show its name; else if a category
  // is selected, show the category's name; else empty string. Deliberately
  // does NOT clear to empty when the id isn't found in the fetched list
  // (e.g. immediately after inline-creating a new ingredient, before the
  // invalidated ['ingredients'] query has refetched) — that would flash the
  // field blank right after the owner just picked something, contradicting
  // D-29's "immediately selected" requirement. handleCreateConfirm already
  // sets the correct display text synchronously for that case.
  useEffect(() => {
    if (value.ingredientId) {
      const selectedIngredient = ingredients?.find((i) => i.id === value.ingredientId)
      if (selectedIngredient) {
        setSearch(selectedIngredient.name)
      }
      return
    }
    if (value.categoryId) {
      const selectedCategory = categories?.find((c) => c.id === value.categoryId)
      if (selectedCategory) {
        setSearch(selectedCategory.name)
      }
      return
    }
    setSearch('')
  }, [value.categoryId, value.ingredientId, categories, ingredients])

  const trimmed = search.trim()

  // RESEARCH.md Pitfall 2: category and ingredient options are grouped
  // under separate headings, and an ingredient's label includes its
  // category name, so the owner cannot mistake selecting a category for
  // selecting a specific bottle.
  const categoryOptions = (categories ?? [])
    .filter((c) => c.name.toLowerCase().includes(trimmed.toLowerCase()))
    .map((c) => ({
      value: `${CATEGORY_PREFIX}${c.id}`,
      label: c.name,
    }))
  const ingredientOptions = (ingredients ?? [])
    .filter((i) => i.name.toLowerCase().includes(trimmed.toLowerCase()))
    .map((i) => ({
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

  // Parallel prohibition for categories — mirrors CategoryPicker.tsx's own
  // `hasExactMatch` guard: never offer "+ Add new category" for a name that
  // already exists among categories under a case-insensitive comparison.
  const hasExactCategoryMatch = (categories ?? []).some(
    (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
  )

  const addNewOptions: { value: string; label: string }[] = []
  if (trimmed.length > 0 && !hasExactCategoryMatch) {
    addNewOptions.push({ value: CREATE_CATEGORY_VALUE, label: `+ Add new category "${trimmed}"` })
  }
  if (trimmed.length > 0 && !hasExactIngredientMatch) {
    addNewOptions.push({
      value: CREATE_INGREDIENT_VALUE,
      label: `+ Add new ingredient "${trimmed}"`,
    })
  }
  if (addNewOptions.length > 0) {
    options.push({ label: 'Add New', options: addNewOptions })
  }

  function handleSearch(text: string) {
    setSearch(text)
  }

  async function handleSelect(selectedValue: string) {
    if (selectedValue === CREATE_CATEGORY_VALUE) {
      setCreateError(null)
      try {
        // CategoryPicker's own inline "+ Add" pattern — immediate
        // create+select, no confirmation sub-form — applied here as a
        // direct path instead of opening the `creating` sub-flow.
        const created = await createCategory.mutateAsync({ name: trimmed })
        onChange({ categoryId: created.id, ingredientId: null, requiresSpecific: false })
        setSearch(created.name)
      } catch {
        setCreateError("Couldn't create category — check the name and try again.")
      }
      return
    }

    if (selectedValue === CREATE_INGREDIENT_VALUE) {
      setCreateError(null)
      setCreating({ name: trimmed })
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

  function handleCreateCancel() {
    setCreating(null)
    setNewIngredientCategoryId(undefined)
    setNewIngredientInStock(true)
    setCreateError(null)
  }

  async function handleCreateConfirm() {
    if (!creating || !newIngredientCategoryId) return
    setCreateError(null)
    try {
      const created = await createIngredient.mutateAsync({
        name: creating.name,
        categoryId: newIngredientCategoryId,
        note: undefined,
      })
      // POST /api/ingredients has no inStock field (D-09: new ingredients
      // always start in stock) — a follow-up stock-toggle call honors the
      // owner's choice if they flipped the switch off before creating.
      if (!newIngredientInStock) {
        await toggleStock.mutateAsync({ id: created.id, inStock: false })
      }
      // D-30: default checked for a freshly created ingredient too.
      onChange({ categoryId: created.categoryId, ingredientId: created.id, requiresSpecific: true })
      setSearch(created.name)
      setCreating(null)
      setNewIngredientCategoryId(undefined)
      setNewIngredientInStock(true)
    } catch {
      setCreateError("Couldn't create ingredient — check the name and try again.")
    }
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
      {!creating && createError && (
        <div style={{ color: '#ef4444', marginTop: 8 }}>{createError}</div>
      )}
      {value.ingredientId && (
        <Checkbox
          checked={value.requiresSpecific}
          onChange={(e) => handleCheckboxChange(e.target.checked)}
          style={{ marginTop: 8 }}
        >
          Must be this specific ingredient
        </Checkbox>
      )}
      {creating && (
        <div
          style={{
            marginTop: 8,
            padding: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div>
            New ingredient: <strong>{creating.name}</strong>
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>Category</div>
            <CategoryPicker value={newIngredientCategoryId} onChange={setNewIngredientCategoryId} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch checked={newIngredientInStock} onChange={setNewIngredientInStock} />
            <span>In stock</span>
          </div>
          {createError && <div style={{ color: '#ef4444' }}>{createError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              disabled={!newIngredientCategoryId}
              loading={createIngredient.isPending || toggleStock.isPending}
              onClick={handleCreateConfirm}
            >
              Create
            </Button>
            <Button onClick={handleCreateCancel}>Cancel</Button>
          </div>
        </div>
      )}
    </>
  )
}
