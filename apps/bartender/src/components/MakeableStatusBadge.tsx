import { Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import type { TriStateStatus } from '@my-bar/shared'

interface MakeableStatusBadgeProps {
  status: TriStateStatus
}

// D-63: the FULL tri-state badge — unlike Patron's 2-state collapse, all
// three copy strings are reachable here, since the bartender is the one
// making the substitution judgment call (yellow). A second, independent
// copy of apps/barback/src/components/MakeableStatusBadge.tsx (the two
// apps share no runtime code beyond @my-bar/shared, per this monorepo's
// existing per-app-duplication convention for small UI components) — same
// three exact copy strings, icons, and antd Tag colors.
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
