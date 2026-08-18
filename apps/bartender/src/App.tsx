import { useState } from 'react'
import { ConfigProvider, theme } from 'antd'
import { BottomTabBar } from './components/BottomTabBar.js'
import { OrdersTab } from './components/OrdersTab.js'
import { RecipesTab } from './components/RecipesTab.js'
import { useOrders } from './api/useOrders.js'

// D-55/BART-01/BART-05/BART-06: full two-tab shell (Recipes/Orders),
// replacing 04-01's tracer-minimal single-view body now that RecipesTab is
// real. ConfigProvider token block matches apps/barback/src/App.tsx
// verbatim (D-64).
export default function App() {
  const [activeTab, setActiveTab] = useState<'recipes' | 'orders'>('recipes')
  const { data: orders } = useOrders()
  // D-55/UI-SPEC Appendix: badge counts "new + in_progress" only, never
  // 'done' — orders needing attention, not the full history.
  const openOrderCount = (orders ?? []).filter(
    (o) => o.status === 'new' || o.status === 'in_progress',
  ).length

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
      <div className="h-dvh overflow-hidden flex flex-col bg-bar-bg">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'recipes' && <RecipesTab />}
          {activeTab === 'orders' && <OrdersTab />}
        </div>
        <BottomTabBar activeTab={activeTab} onChange={setActiveTab} openOrderCount={openOrderCount} />
      </div>
    </ConfigProvider>
  )
}
