import { Select } from 'antd'
import type { Glassware } from '@my-bar/shared'

interface GlasswareSelectorProps {
  glassware?: Glassware[]
}

// Purely presentational — does NOT call useGlassware() itself. The caller
// (RecipeForm, in 02-06) fetches and passes the array down; this
// component's only job is "render options from what I was given."
export function GlasswareSelector({ glassware }: GlasswareSelectorProps) {
  const options = (glassware ?? []).map((g) => ({
    value: g.id,
    label: g.name,
  }))

  return <Select placeholder="Select a glassware type (optional)" options={options} allowClear />
}
