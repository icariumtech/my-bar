import { Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import type { TriStateStatus } from '@my-bar/shared'

interface MakeableStatusBadgeProps {
  status: TriStateStatus
}

// D-31/D-32/T-02-15: renders the server-computed tri-state overallStatus —
// no missingCategoryNames prop here. The longer "Can't make this right
// now. Missing: [...]" sentence is reserved for RecipeDetailView, where the
// full category-name list has room to render. These three exact strings
// come from 02.1-UI-SPEC.md's Copywriting Contract.
export function MakeableStatusBadge({ status }: MakeableStatusBadgeProps) {
  if (status === 'green') {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success">
        Ready to make
      </Tag>
    )
  }

  if (status === 'yellow') {
    return (
      <Tag icon={<WarningOutlined />} color="warning">
        Substitution needed
      </Tag>
    )
  }

  return (
    <Tag icon={<CloseCircleOutlined />} color="error">
      Missing ingredients
    </Tag>
  )
}
