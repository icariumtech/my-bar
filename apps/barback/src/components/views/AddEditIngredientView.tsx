import { useEffect } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import type { Ingredient, IngredientInput } from '@my-bar/shared'
import { useCreateIngredient, useUpdateIngredient } from '../../api/useIngredients.js'
import { CategoryPicker } from '../pickers/CategoryPicker.js'
import { FullScreenHeader } from '../FullScreenHeader.js'

export interface AddEditIngredientViewProps {
  // Absent → create mode (submits through useCreateIngredient). Present →
  // edit mode, pre-filled from this ingredient and submitted through
  // useUpdateIngredient (INV-02). Deliberately ONE component rather than a
  // forked edit variant, so validation rules, length bounds, and copy
  // cannot drift between the two flows.
  ingredient?: Ingredient
  onBack: () => void
}

const nameRules = [
  { required: true, message: 'Name is required' },
  { max: 200, message: 'Name must be 200 characters or fewer' },
]
const categoryRules = [{ required: true, message: 'Category is required' }]
const noteRules = [{ max: 200, message: 'Note must be 200 characters or fewer' }]

// D-26/BARBACK-02: full-screen replacement for the old AddEditIngredientForm
// Modal — same Form, validation rules, and submit logic as before, just a
// different shell (header + back button instead of Modal chrome) and a
// CategoryPicker (D-27) in place of the static Select +
// renderCategoryPopup inline-create pattern.
export function AddEditIngredientView({ ingredient, onBack }: AddEditIngredientViewProps) {
  const [form] = Form.useForm<IngredientInput>()

  const createIngredient = useCreateIngredient()
  const updateIngredient = useUpdateIngredient()

  const isEditing = ingredient !== undefined
  const saving = isEditing ? updateIngredient.isPending : createIngredient.isPending
  const saveFailed = isEditing ? updateIngredient.isError : createIngredient.isError

  // Re-populate whenever this view mounts against a (possibly different)
  // ingredient — covers both Add→Edit and editing a second row without a
  // remount, mirroring the old Modal's open/ingredient-change effect.
  useEffect(() => {
    if (ingredient) {
      form.setFieldsValue({
        name: ingredient.name,
        categoryId: ingredient.categoryId,
        note: ingredient.note ?? undefined,
      })
    } else {
      form.resetFields()
    }
  }, [ingredient, form])

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
      onBack()
    } catch {
      // Keep the owner's typed values on failure — do not reset the form.
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* (260812-m0i) inline header markup extracted to shared
          FullScreenHeader — fixes off-center title + replaces the
          plain-text "← Back" button with a circular icon-only one. */}
      <FullScreenHeader onBack={onBack} title={isEditing ? 'Edit Ingredient' : 'Add Ingredient'} />
      <main
        style={{
          flex: 1,
          padding: 16,
          // 260812-drh: reserve clearance for the fixed BottomTabBar
          // (48px min-height + safe-area inset) so the Save button isn't
          // hidden behind it.
          paddingBottom: 'calc(16px + 48px + env(safe-area-inset-bottom))',
          overflow: 'auto',
        }}
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
          <Form.Item name="name" label="Name" rules={nameRules}>
            <Input placeholder="Bombay Sapphire Gin" maxLength={200} />
          </Form.Item>

          <Form.Item name="categoryId" label="Category" rules={categoryRules}>
            <CategoryPicker />
          </Form.Item>

          <Form.Item name="note" label="Note" rules={noteRules}>
            <Input placeholder="750ml" maxLength={200} />
          </Form.Item>

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
      </main>
    </div>
  )
}
