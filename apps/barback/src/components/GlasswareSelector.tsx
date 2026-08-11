import { Select } from 'antd'
import type { Glassware } from '@my-bar/shared'

interface GlasswareSelectorProps {
  glassware?: Glassware[]
  value?: string
  onChange?: (value: string | undefined) => void
}

// Purely presentational — does NOT call useGlassware() itself. The caller
// (RecipeForm, in 02-06) fetches and passes the array down; this
// component's only job is "render options from what I was given." G-02-6
// fix: forwards Form.Item's injected value/onChange to the inner Select —
// previously discarded, so glasswareId always submitted as undefined.
export function GlasswareSelector({ glassware, value, onChange }: GlasswareSelectorProps) {
  const options = (glassware ?? []).map((g) => ({
    value: g.id,
    label: g.name,
  }))

  return (
    <Select
      placeholder="Select a glassware type (optional)"
      options={options}
      allowClear
      value={value}
      onChange={onChange}
    />
  )
}
