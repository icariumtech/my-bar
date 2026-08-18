import type { CSSProperties, ReactNode } from 'react'
import { Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'

export interface FullScreenScrollAreaProps {
  onBack: () => void
  title: string
  // Optional style override merged onto the title <h2> — mirrors
  // apps/barback/src/components/FullScreenHeader.tsx's titleStyle prop, used
  // by RecipeOrOrderDetail to preserve its Display-role (28px/600) typography.
  titleStyle?: CSSProperties
  children: ReactNode
}

// Bartender's shared full-screen layout: a min-height:100vh flex column with
// a back-button header (shape matches apps/barback's FullScreenHeader.tsx)
// and exactly ONE scrollable <main> that reserves paddingBottom clearance
// for the fixed BottomTabBar (position:fixed, bottom:0, zIndex:10).
//
// IMPORTANT: ALL screen content — including any bottom action button(s)
// (Apply/Clear/Done/Save/etc) — MUST be passed as `children`, not rendered
// as a sibling of this component. Anything NOT inside this <main> renders at
// the literal bottom of the 100vh column, directly underneath the fixed
// BottomTabBar and is unreachable/covered. This is exactly the bug fixed in
// quick task 260818-q7y: RecipeSearchFilter previously rendered its
// Clear/Apply row as a standalone <div> after <main>, outside this
// clearance, making the buttons unreachable. Do not repeat that mistake.
export function FullScreenScrollArea({ onBack, title, titleStyle, children }: FullScreenScrollAreaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 16,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ width: 48, flexShrink: 0 }}>
          <Button
            type="primary"
            shape="circle"
            icon={<ArrowLeftOutlined />}
            aria-label="Back"
            onClick={onBack}
            style={{ width: 48, height: 48, minWidth: 48, padding: 0 }}
          />
        </div>
        <h2 className="text-white" style={{ flex: 1, textAlign: 'center', ...titleStyle }}>
          {title}
        </h2>
        <div style={{ width: 48, flexShrink: 0 }} />
      </header>

      <main
        style={{
          flex: 1,
          padding: 16,
          paddingBottom: 'calc(16px + 48px + env(safe-area-inset-bottom))',
          overflow: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  )
}
