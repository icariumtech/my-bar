import { Button, Form, Input } from 'antd'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { IngredientPicker } from './pickers/IngredientPicker.js'
import { UnitDropdown } from './UnitDropdown.js'

// `recipeInput.ingredients` requires `.min(1)` — deliberately does NOT
// auto-seed an empty row on mount (that would silently satisfy the count
// without real data). The surrounding Form.Item's `rules={[{ required:
// true }]}` (set by RecipeForm/AddEditRecipeView) plus antd's own
// empty-array Form.List validation enforce the constraint; this component
// only renders whatever rows exist and lets add/remove mutate them.
//
// D-28/MATCH-05: each row's category-or-specific-ingredient field is the
// combined IngredientPicker (plan 02.1-05) instead of a static category
// <Select>. IngredientPicker's value is a composite object writing three
// related fields at once (categoryId/ingredientId/requiresSpecific) — it
// does NOT rely on antd Form.Item's automatic value/onChange cloning (that
// only carries one scalar). This component is always rendered inside
// RecipeForm's/AddEditRecipeView's <Form>, so Form.useFormInstance()
// always resolves to the surrounding form.
//
// [Rule 1 bug fix] antd/rc-component-form only includes a Form.List row's
// field in the values object passed to onFinish/validateFields if that
// exact name path is registered via a Form.Item somewhere in the tree —
// form.setFieldValue() alone writes into the internal store but does NOT
// register a field entity, so an unregistered path is silently dropped from
// the *submitted* values even though form.getFieldValue() can still read it
// directly (verified via a failing repro: onChange fired with the correct
// composite value, form.getFieldValue() reflected it, but the recipe's
// actual POST body omitted categoryId/ingredientId/requiresSpecific
// entirely). Since IngredientPicker writes those three fields purely via
// form.setFieldValue (no Form.Item name binding of its own — the composite-
// value contract above), each needs its own invisible Form.Item
// registration so recipe submission actually carries them.
function NoRenderField() {
  return null
}

export function IngredientListForm() {
  const form = Form.useFormInstance()

  return (
    <Form.List name="ingredients">
      {(fields, { add, remove }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fields.map((field) => (
            <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Form.Item name={[field.name, 'categoryId']} noStyle>
                <NoRenderField />
              </Form.Item>
              <Form.Item name={[field.name, 'ingredientId']} noStyle>
                <NoRenderField />
              </Form.Item>
              <Form.Item name={[field.name, 'requiresSpecific']} noStyle>
                <NoRenderField />
              </Form.Item>
              <div style={{ flex: 1, margin: 0 }}>
                <Form.Item noStyle shouldUpdate key={`${field.key}-picker`}>
                  {() => {
                    const categoryId = form.getFieldValue(['ingredients', field.name, 'categoryId'])
                    const ingredientId = form.getFieldValue(['ingredients', field.name, 'ingredientId']) ?? null
                    const requiresSpecific =
                      form.getFieldValue(['ingredients', field.name, 'requiresSpecific']) ?? false
                    return (
                      <IngredientPicker
                        value={{ categoryId, ingredientId, requiresSpecific }}
                        onChange={(next) => {
                          form.setFieldValue(['ingredients', field.name, 'categoryId'], next.categoryId)
                          form.setFieldValue(
                            ['ingredients', field.name, 'ingredientId'],
                            next.ingredientId,
                          )
                          form.setFieldValue(
                            ['ingredients', field.name, 'requiresSpecific'],
                            next.requiresSpecific,
                          )
                        }}
                      />
                    )
                  }}
                </Form.Item>
              </div>
              <Form.Item
                {...field}
                name={[field.name, 'quantity']}
                style={{ flex: 0.5, margin: 0 }}
              >
                <Input placeholder="Qty" maxLength={20} />
              </Form.Item>
              <Form.Item {...field} name={[field.name, 'unit']} style={{ flex: 0.75, margin: 0 }}>
                <UnitDropdown />
              </Form.Item>
              <Button
                danger
                icon={<MinusOutlined />}
                aria-label="Remove ingredient"
                onClick={() => remove(field.name)}
                style={{ minHeight: 48, minWidth: 48 }}
              />
            </div>
          ))}
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => add({ ingredientId: null, requiresSpecific: false })}
            block
            style={{ minHeight: 48 }}
          >
            Add Ingredient
          </Button>
        </div>
      )}
    </Form.List>
  )
}
