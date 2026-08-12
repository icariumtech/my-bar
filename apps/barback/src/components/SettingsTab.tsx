import { useState } from 'react'
import { Button } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { CategoryManager } from './CategoryManager.js'
import { GlasswareManager } from './GlasswareManager.js'

// D-24/BARBACK-01: Settings tab houses both Categories and Glassware
// management (previously separate header buttons) via a flat menu, each
// item opening that entity's existing (still-Modal at this stage) manager.
// Owns its OWN local menu/categories/glassware view state.
export function SettingsTab() {
  const [view, setView] = useState<'menu' | 'categories' | 'glassware'>('menu')

  return (
    <div className="px-md pb-3xl">
      <div className="pt-md pb-sm">
        <h2 className="text-white text-xl font-semibold">Settings</h2>
      </div>
      <div className="flex flex-col gap-sm">
        <Button
          block
          style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onClick={() => setView('categories')}
        >
          Categories
          <RightOutlined />
        </Button>
        <Button
          block
          style={{ minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          onClick={() => setView('glassware')}
        >
          Glassware
          <RightOutlined />
        </Button>
      </div>
      <CategoryManager open={view === 'categories'} onClose={() => setView('menu')} />
      <GlasswareManager open={view === 'glassware'} onClose={() => setView('menu')} />
    </div>
  )
}
