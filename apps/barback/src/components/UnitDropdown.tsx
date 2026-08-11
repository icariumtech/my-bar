import { Select } from 'antd'

// D-19: the fixed unit set — no free-text fallback anywhere in this
// component.
const UNIT_OPTIONS = ['oz', 'dash', 'splash', 'barspoon', 'muddled', 'part'].map((unit) => ({
  value: unit,
  label: unit,
}))

interface UnitDropdownProps {
  value?: string
  onChange?: (value: string) => void
}

// It's used inside an antd Form.Item that supplies `value`/`onChange` via
// cloneElement onto its direct child (G-02-6 fix: this wrapper must accept
// and forward both, or the surrounding Form's data store never learns
// which unit was picked — mirrors the direct-binding pattern already used
// for IngredientListForm's categoryId Select).
export function UnitDropdown({ value, onChange }: UnitDropdownProps) {
  return (
    <Select placeholder="Unit" options={UNIT_OPTIONS} value={value} onChange={onChange} />
  )
}
