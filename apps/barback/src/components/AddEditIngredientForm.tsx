import { useEffect, useState } from 'react'
import { Alert, Button, Divider, Form, Input, Modal, Select } from 'antd'
import type { DefaultOptionType } from 'antd/es/select'
import type { Ingredient, IngredientInput } from '@my-bar/shared'
import { useCreateIngredient, useUpdateIngredient } from '../api/useIngredients.js'
import { useCreateCategory, useCategories } from '../api/useCategories.js'

interface AddEditIngredientFormProps {
  // Absent → create mode (submits through useCreateIngredient). Present →
  // edit mode, pre-filled from this ingredient and submitted through
  // useUpdateIngredient (INV-02). Deliberately ONE component rather than a
  // forked edit variant, so validation rules, length bounds, and copy
  // cannot drift between the two flows.
  ingredient?: Ingredient
  open: boolean
  onClose: () => void
}

const nameRules = [
  { required: true, message: 'Name is required' },
  { max: 200, message: 'Name must be 200 characters or fewer' },
]
const categoryRules = [{ required: true, message: 'Category is required' }]
const noteRules = [{ max: 200, message: 'Note must be 200 characters or fewer' }]

function filterCategoryOption(input: string, option?: DefaultOptionType) {
  return (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
}

// D-03: category creation lives inline inside this form — without it, a
// brand-new bar with zero categories could never have its first bottle
// added, since Category is required (resolves 01-UI-SPEC.md's one
// unresolved ⚠ CategoryManager consideration).
export function AddEditIngredientForm({ ingredient, open, onClose }: AddEditIngredientFormProps) {
  const [form] = Form.useForm<IngredientInput>()
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const { data: categories } = useCategories()
  const createIngredient = useCreateIngredient()
  const updateIngredient = useUpdateIngredient()
  const createCategory = useCreateCategory()

  const isEditing = ingredient !== undefined
  const saving = isEditing ? updateIngredient.isPending : createIngredient.isPending
  const saveFailed = isEditing ? updateIngredient.isError : createIngredient.isError

  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }))
  const trimmedSearch = categorySearch.trim()

  // Re-populate whenever the modal opens against a (possibly different)
  // ingredient — covers both Add→Edit and editing a second row without a
  // remount, since destroyOnHidden only resets on close, not on ingredient
  // change while already open.
  useEffect(() => {
    if (!open) return
    if (ingredient) {
      form.setFieldsValue({
        name: ingredient.name,
        categoryId: ingredient.categoryId,
        note: ingredient.note ?? undefined,
      })
    } else {
      form.resetFields()
    }
  }, [open, ingredient, form])

  function handleCategorySearch(value: string) {
    setCategorySearch(value)
    setCategoryError(null)
  }

  async function handleAddCategory() {
    if (!trimmedSearch) return
    setCategoryError(null)
    try {
      const created = await createCategory.mutateAsync({ name: trimmedSearch })
      form.setFieldValue('categoryId', created.id)
      setCategorySearch('')
    } catch {
      setCategoryError("Couldn't create category — check the name and try again.")
    }
  }

  function renderCategoryPopup(menu: React.ReactNode) {
    return (
      <>
        {categoryOptions.length > 0 ? (
          menu
        ) : (
          <div style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.45)' }}>
            No categories yet — add the first one below.
          </div>
        )}
        <Divider style={{ margin: '4px 0' }} />
        <div style={{ padding: '4px 8px' }}>
          <Button
            type="text"
            block
            disabled={!trimmedSearch}
            loading={createCategory.isPending}
            onClick={handleAddCategory}
          >
            {trimmedSearch ? `Add Category "${trimmedSearch}"` : 'Add Category'}
          </Button>
        </div>
      </>
    )
  }

  async function handleSubmit(values: IngredientInput) {
    try {
      if (ingredient) {
        // D-08: this PATCH never carries a stock field — the form has no
        // stock control, and useUpdateIngredient's contract (ingredientPatch)
        // structurally cannot flip it.
        await updateIngredient.mutateAsync({ id: ingredient.id, patch: values })
      } else {
        await createIngredient.mutateAsync(values)
      }
      form.resetFields()
      setCategorySearch('')
      onClose()
    } catch {
      // Keep the owner's typed values on failure — do not reset the form.
    }
  }

  function handleCancel() {
    form.resetFields()
    setCategorySearch('')
    setCategoryError(null)
    onClose()
  }

  return (
    <Modal
      title={isEditing ? 'Edit Ingredient' : 'Add Ingredient'}
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
    >
      {saveFailed && (
        <Alert
          type="error"
          title="Couldn't save — check your connection and try again."
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Form.Item name="name" label="Name" rules={nameRules}><Input placeholder="Bombay Sapphire Gin" maxLength={200} /></Form.Item>

        <Form.Item name="categoryId" label="Category" rules={categoryRules} extra={categoryError}><Select showSearch placeholder="Select a category" options={categoryOptions} filterOption={filterCategoryOption} onSearch={handleCategorySearch} popupRender={renderCategoryPopup} /></Form.Item>

        <Form.Item name="note" label="Note" rules={noteRules}><Input placeholder="750ml" maxLength={200} /></Form.Item>

        {/* Plain div — the submit action, not a fourth data field; the
            form carries exactly three fields (Name, Category, Note) and no
            stock control (D-08). */}
        <div>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            block
            style={{ minHeight: 48 }}
          >
            Save Changes
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
