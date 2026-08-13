import { Select } from 'antd'
import type { TagGroup } from '@my-bar/shared'
import { TAG_GROUP_ORDER } from '@my-bar/shared'
import { useTags } from '../../api/useTags.js'

export interface TagPickerProps {
  // Selected tag ids — this exact value/onChange prop shape is required so
  // antd Form.Item can clone them onto this component directly, same
  // contract convention as CategoryPicker/GlasswarePicker, but a string[]
  // rather than a single string | undefined, since tag assignment is
  // multi-select.
  value?: string[]
  onChange?: (tagIds: string[]) => void
}

const GROUP_LABELS: Record<TagGroup, string> = {
  spirit: 'Spirit',
  type: 'Type',
  season: 'Season',
  flavor: 'Flavor',
}

// D-33/D-34/D-35: grouped multi-select over the fixed, fully-known tag
// taxonomy. Unlike CategoryPicker/GlasswarePicker, this is a plain antd
// Select (mode="multiple") — no AutoComplete, no search-driven "create new"
// branch, no inline-create affordance of any kind. D-35's fixed-taxonomy
// boundary means the owner can only ever assign existing tags from
// useTags(), never mint a new one from this component.
export function TagPicker({ value, onChange }: TagPickerProps) {
  const { data: tags = [] } = useTags()

  // Group the flat tags array into four labeled sections by iterating
  // TAG_GROUP_ORDER (the single canonical sequence also used by the API
  // sort and the Patron rail) and filtering per group — skips a group
  // entirely from the options array if it has zero tags (defensive; the
  // 24-entry seed always has >=4 per group).
  const groupedOptions = TAG_GROUP_ORDER.map((groupId) => {
    const groupTags = tags.filter((t) => t.group === groupId)
    return {
      label: GROUP_LABELS[groupId],
      options: groupTags.map((t) => ({ label: t.name, value: t.id })),
    }
  }).filter((group) => group.options.length > 0)

  return (
    <Select
      mode="multiple"
      value={value}
      onChange={onChange}
      options={groupedOptions}
      placeholder="Select tags (optional)"
    />
  )
}
