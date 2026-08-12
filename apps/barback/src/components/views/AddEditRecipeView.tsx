import { useEffect } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import type { Recipe, RecipeInput } from '@my-bar/shared'
import { useCreateRecipe, useUpdateRecipe } from '../../api/useRecipes.js'
import { IngredientListForm } from '../IngredientListForm.js'
import { MethodStepList } from '../MethodStepList.js'
import { GlasswarePicker } from '../pickers/GlasswarePicker.js'
import { FullScreenHeader } from '../FullScreenHeader.js'

export interface AddEditRecipeViewProps {
  // Absent → create mode (submits through useCreateRecipe). Present → edit
  // mode, pre-filled from this recipe and submitted through
  // useUpdateRecipe — identical convention to AddEditIngredientView's
  // single-component create/edit split.
  recipe?: Recipe
  onBack: () => void
}

const nameRules = [
  { required: true, message: 'Recipe name is required' },
  { max: 200, message: 'Recipe name must be 200 characters or fewer' },
]
const ingredientsRules = [{ required: true, message: 'At least one ingredient is required' }]
const methodRules = [{ required: true, message: 'At least one method step is required' }]

// D-26/BARBACK-02: full-screen replacement for the old RecipeForm Modal —
// same Form, validation rules, and useCreateRecipe/useUpdateRecipe submit
// logic as before (RecipeForm.tsx, now deleted), just a different shell
// (header + back button instead of Modal chrome, mirroring
// AddEditIngredientView's Modal-to-full-screen conversion) and a
// GlasswarePicker (D-27) in place of the static GlasswareSelector <Select>
// (GlasswareSelector.tsx, now deleted — GlasswarePicker self-fetches, so
// this component no longer calls useGlassware() itself).
export function AddEditRecipeView({ recipe, onBack }: AddEditRecipeViewProps) {
  const [form] = Form.useForm<RecipeInput>()
  const createRecipe = useCreateRecipe()
  const updateRecipe = useUpdateRecipe()

  const isEditing = recipe !== undefined
  const saving = isEditing ? updateRecipe.isPending : createRecipe.isPending
  const saveFailed = isEditing ? updateRecipe.isError : createRecipe.isError
  const saveError = isEditing ? updateRecipe.error : createRecipe.error
  // G-02-6: apiFetch throws the server's real validation message when one
  // is present — surface it verbatim instead of a static, misleadingly
  // network-sounding string. Falls back to the generic copy only if the
  // error somehow carries no message (defensive; apiFetch always sets one).
  const saveErrorMessage =
    saveError instanceof Error && saveError.message
      ? saveError.message
      : "Couldn't save recipe — check your connection and try again."

  // Re-populate whenever this view mounts against a (possibly different)
  // recipe — mirrors AddEditIngredientView's identical effect (no `open`
  // gate; full-screen views mount/unmount instead of open/close). Drops the
  // server-only id/categoryName/ingredientName/displayOrder/status/
  // alternativeIngredientName fields from each ingredient line, and carries
  // forward ingredientId/requiresSpecific (D-30/D-31, beyond RecipeForm's
  // original categoryId-only mapping) since the form needs the full
  // RecipeInput shape back.
  useEffect(() => {
    if (recipe) {
      form.setFieldsValue({
        name: recipe.name,
        ingredients: recipe.ingredients.map((ing) => ({
          categoryId: ing.categoryId,
          ingredientId: ing.ingredientId,
          requiresSpecific: ing.requiresSpecific,
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
  }, [recipe, form])

  async function handleSubmit(values: RecipeInput) {
    try {
      if (recipe) {
        await updateRecipe.mutateAsync({ id: recipe.id, patch: values })
      } else {
        await createRecipe.mutateAsync(values)
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
      <FullScreenHeader onBack={onBack} title={isEditing ? 'Edit Recipe' : 'Add Recipe'} />
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
            <GlasswarePicker />
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
      </main>
    </div>
  )
}
