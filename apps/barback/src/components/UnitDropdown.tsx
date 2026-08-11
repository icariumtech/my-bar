import { Select } from 'antd'

// D-19: the fixed unit set — no free-text fallback anywhere in this
// component. No props: it's used inside an antd Form.Item that supplies
// `value`/`onChange` automatically via the surrounding Form's `name`
// binding.
const UNIT_OPTIONS = ['oz', 'dash', 'splash', 'barspoon', 'muddled', 'part'].map((unit) => ({
  value: unit,
  label: unit,
}))

export function UnitDropdown() {
  return <Select placeholder="Unit" options={UNIT_OPTIONS} />
}
