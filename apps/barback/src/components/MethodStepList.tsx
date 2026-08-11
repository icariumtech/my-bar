import { Button, Form, Input } from 'antd'
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'

const { TextArea } = Input

// D-16: `recipeInput.method` is `z.array(z.string())` — a flat string
// array, so each Form.List field IS the string itself, not an object.
// Numbering is derived from `index`, never stored per-step, so removing a
// step from the middle renumbers the remaining steps correctly on the next
// render.
export function MethodStepList() {
  return (
    <Form.List name="method">
      {(fields, { add, remove }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fields.map((field, index) => (
            <div key={field.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span className="text-zinc-400" style={{ minWidth: 24, marginTop: 8 }}>
                {index + 1}.
              </span>
              <Form.Item {...field} style={{ flex: 1, margin: 0 }}>
                <TextArea placeholder={`Step ${index + 1}`} maxLength={500} rows={2} />
              </Form.Item>
              <Button
                danger
                icon={<MinusOutlined />}
                aria-label={`Remove step ${index + 1}`}
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
            Add Step
          </Button>
        </div>
      )}
    </Form.List>
  )
}
