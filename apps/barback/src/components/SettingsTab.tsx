import { useState } from 'react'
import { Button } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { CategoryManager } from './CategoryManager.js'
import { GlasswareManager } from './GlasswareManager.js'

// D-24/D-26/BARBACK-01: Settings tab houses both Categories and Glassware
// management (previously separate header buttons) via a flat menu, each
// item opening that entity's full-screen manager view. Owns its OWN local
// menu/categories/glassware view state. When a sub-page is active, it
// replaces the Settings menu entirely (matching IngredientsTab's
// established full-screen pattern from plan 02.1-02) — the menu is never
// rendered underneath.
export function SettingsTab() {
  const [view, setView] = useState<'menu' | 'categories' | 'glassware'>('menu')

  if (view === 'categories') {
    return <CategoryManager onBack={() => setView('menu')} />
  }

  if (view === 'glassware') {
    return <GlasswareManager onBack={() => setView('menu')} />
  }

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
    </div>
  )
}
