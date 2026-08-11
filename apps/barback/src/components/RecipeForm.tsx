import { useEffect } from 'react'
import { Alert, Button, Form, Input, Modal } from 'antd'
import type { Recipe, RecipeInput } from '@my-bar/shared'
import { useCreateRecipe, useUpdateRecipe } from '../api/useRecipes.js'
import { useGlassware } from '../api/useGlassware.js'
import { IngredientListForm } from './IngredientListForm.js'
import { MethodStepList } from './MethodStepList.js'
import { GlasswareSelector } from './GlasswareSelector.js'

interface RecipeFormProps {
  // Absent → create mode (submits through useCreateRecipe). Present → edit
  // mode, pre-filled from this recipe and submitted through
  // useUpdateRecipe — identical convention to AddEditIngredientForm's
  // single-component create/edit split.
  recipe?: Recipe
  open: boolean
  onClose: () => void
}

const nameRules = [
  { required: true, message: 'Recipe name is required' },
  { max: 200, message: 'Recipe name must be 200 characters or fewer' },
]
const ingredientsRules = [{ required: true, message: 'At least one ingredient is required' }]
const methodRules = [{ required: true, message: 'At least one method step is required' }]

// Assembles every 02-05 sub-component (IngredientListForm, MethodStepList,
// GlasswareSelector) into the create/edit recipe form (RECIPE-01/RECIPE-02).
export function RecipeForm({ recipe, open, onClose }: RecipeFormProps) {
  const [form] = Form.useForm<RecipeInput>()
  const { data: glasswareList } = useGlassware()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()

  const isEditing = recipe !== undefined
  const saving = isEditing ? updateRecipe.isPending : createRecipe.isPending
  const saveFailed = isEditing ? updateRecipe.isError : createRecipe.isError
  const saveError = isEditing ? updateRecipe.error : createRecipe.error
  // G-02-6: apiFetch now throws the server's real validation message when
  // one is present — surface it verbatim instead of a static, misleadingly
  // network-sounding string. Falls back to the generic copy only if the
  // error somehow carries no message (defensive; apiFetch always sets one).
  const saveErrorMessage =
    saveError instanceof Error && saveError.message
      ? saveError.message
      : "Couldn't save recipe — check your connection and try again."

  // Re-populate whenever the modal opens against a (possibly different)
  // recipe — mirrors AddEditIngredientForm's identical effect. Drops the
  // server-only id/categoryName/displayOrder fields from each ingredient
  // line since the form only needs the RecipeInput shape back.
  useEffect(() => {
    if (!open) return
    if (recipe) {
      form.setFieldsValue({
        name: recipe.name,
        ingredients: recipe.ingredients.map((ing) => ({
          categoryId: ing.categoryId,
          quantity: ing.quantity,
          unit: ing.unit,
        })),
        method: recipe.method,
        glasswareId: recipe.glasswareId ?? undefined,
        garnish: recipe.garnish ?? undefined,
      })
    } else {
      form.resetFields()
    }
  }, [open, recipe, form])

  async function handleSubmit(values: RecipeInput) {
    try {
      if (recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, patch: values })
      } else {
        await createRecipe.mutateAsync(values)
      }
      form.resetFields()
      onClose()
    } catch {
      // Keep the owner's typed values on failure — do not reset the form.
    }
  }

  function handleCancel() {
    form.resetFields()
    onClose()
  }

  return (
    <Modal
      title={isEditing ? 'Edit Recipe' : 'Add Recipe'}
      open={open}
      onCancel={handleCancel}
      footer={null}
      destroyOnHidden
    >
      {saveFailed && (
        <Alert type="error" title={saveErrorMessage} showIcon style={{ marginBottom: 16 }} />
      )}
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Form.Item name="name" label="Recipe Name" rules={nameRules}>
          <Input placeholder="e.g. Margarita" maxLength={200} />
        </Form.Item>

        <Form.Item name="ingredients" label="Ingredients" rules={ingredientsRules}>
          <IngredientListForm />
        </Form.Item>

        <Form.Item name="method" label="Method" rules={methodRules}>
          <MethodStepList />
        </Form.Item>

        {/* Optional per D-17 — no required rule. */}
        <Form.Item name="glasswareId" label="Glassware">
          <GlasswareSelector glassware={glasswareList} />
        </Form.Item>

        {/* Optional per D-18 — free text, never validated against
            categories/ingredients. */}
        <Form.Item name="garnish" label="Garnish">
          <Input.TextArea placeholder="e.g. Lime wheel, salt rim" maxLength={200} />
        </Form.Item>

        <div>
          <Button
            type="primary"
            htmlType="submit"
            loading={saving}
            block
            style={{ minHeight: 48 }}
          >
            Save Recipe
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
