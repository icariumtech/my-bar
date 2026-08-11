import { Button, Form, Input, Select } from 'antd'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { useCategories } from '../api/useCategories.js'
import { UnitDropdown } from './UnitDropdown.js'

// `recipeInput.ingredients` requires `.min(1)` — deliberately does NOT
// auto-seed an empty row on mount (that would silently satisfy the count
// without real data). The surrounding Form.Item's `rules={[{ required:
// true }]}` (set by RecipeForm in 02-06) plus antd's own empty-array
// Form.List validation enforce the constraint; this component only renders
// whatever rows exist and lets add/remove mutate them.
export function IngredientListForm() {
  const { data: categories } = useCategories()

  const categoryOptions = (categories ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }))

  return (
    <Form.List name="ingredients">
      {(fields, { add, remove }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fields.map((field) => (
            <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Form.Item
                {...field}
                name={[field.name, 'categoryId']}
                style={{ flex: 1, margin: 0 }}
              >
                <Select placeholder="Category" options={categoryOptions} />
              </Form.Item>
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
            onClick={() => add()}
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
