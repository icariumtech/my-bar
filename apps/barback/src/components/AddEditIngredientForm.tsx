import { useState } from 'react'
import { Alert, Button, Divider, Form, Input, Modal, Select } from 'antd'
import type { IngredientInput } from '@my-bar/shared'
import { useCreateIngredient } from '../api/useIngredients.js'
import { useCreateCategory, useCategories } from '../api/useCategories.js'

interface AddEditIngredientFormProps {
  open: boolean
  onClose: () => void
}

// D-03: category creation lives inline inside this form — without it, a
// brand-new bar with zero categories could never have its first bottle
// added, since Category is required (resolves 01-UI-SPEC.md's one
// unresolved ⚠ CategoryManager consideration).
export function AddEditIngredientForm({ open, onClose }: AddEditIngredientFormProps) {
  const [form] = Form.useForm<IngredientInput>()
  const [categorySearch, setCategorySearch] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)

  const { data: categories } = useCategories()
  const createIngredient = useCreateIngredient()
  const createCategory = useCreateCategory()

  const categoryOptions = (categories ?? []).map((c) => ({ value: c.id, label: c.name }))
  const trimmedSearch = categorySearch.trim()

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

  async function handleSubmit(values: IngredientInput) {
    try {
      await createIngredient.mutateAsync(values)
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
      title="Add Ingredient"
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
    >
      {createIngredient.isError && (
        <Alert
          type="error"
          title="Couldn't save — check your connection and try again."
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Form.Item
          name="name"
          label="Name"
          rules={[
            { required: true, message: 'Name is required' },
            { max: 200, message: 'Name must be 200 characters or fewer' },
          ]}
        >
          <Input placeholder="Bombay Sapphire Gin" maxLength={200} />
        </Form.Item>

        <Form.Item
          name="categoryId"
          label="Category"
          rules={[{ required: true, message: 'Category is required' }]}
          extra={categoryError}
        >
          <Select
            showSearch
            placeholder="Select a category"
            options={categoryOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            onSearch={(value) => {
              setCategorySearch(value)
              setCategoryError(null)
            }}
            popupRender={(menu) => (
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
            )}
          />
        </Form.Item>

        <Form.Item
          name="note"
          label="Note"
          rules={[{ max: 200, message: 'Note must be 200 characters or fewer' }]}
        >
          <Input placeholder="750ml" maxLength={200} />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={createIngredient.isPending}
            block
            style={{ minHeight: 48 }}
          >
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  )
}
