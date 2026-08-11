import { Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'

interface MakeableStatusBadgeProps {
  makeable: boolean
}

// D-15/T-02-15: renders ONLY the server-computed `makeable` boolean — no
// missingCategoryNames prop here. The longer "Can't make this right now.
// Missing: [...]" sentence is reserved for 02-06's RecipeDetailView, where
// the full category-name list has room to render. These two exact strings
// come from 02-UI-SPEC.md's Component Inventory.
export function MakeableStatusBadge({ makeable }: MakeableStatusBadgeProps) {
  if (makeable) {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success">
        Ready to make
      </Tag>
    )
  }

  return (
    <Tag icon={<CloseCircleOutlined />} color="error">
      Missing ingredients
    </Tag>
  )
}
