import { useState } from 'react'
import { ConfigProvider, theme } from 'antd'
import { BottomTabBar } from './components/BottomTabBar.js'
import { IngredientsTab } from './components/IngredientsTab.js'
import { RecipesTab } from './components/RecipesTab.js'
import { SettingsTab } from './components/SettingsTab.js'

// D-23/D-26: App.tsx is now a thin shell holding ONLY which bottom tab is
// active — every other view-state (add/edit/detail, per entity) lives
// inside its own Tab container so later plans in this phase only ever
// touch that entity's own tab file, never this file again.
export default function App() {
  const [activeTab, setActiveTab] = useState<'ingredients' | 'recipes' | 'settings'>(
    'ingredients',
  )

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgLayout: '#18181b',
          colorBgContainer: '#27272a',
          colorPrimary: '#22c55e',
          colorError: '#ef4444',
          colorWarning: '#facc15',
        },
      }}
    >
      <div className="min-h-screen bg-bar-bg">
        {activeTab === 'ingredients' && <IngredientsTab />}
        {activeTab === 'recipes' && <RecipesTab />}
        {activeTab === 'settings' && <SettingsTab />}
        <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </ConfigProvider>
  )
}
