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
//
// 260812-e8j: the outer shell is `h-dvh overflow-hidden flex flex-col`, and
// the active tab's content renders inside a `flex-1 min-h-0 overflow-y-auto`
// wrapper — this wrapper is now the one real CSS scroll container for the
// whole app, replacing document/window-level scroll. `min-h-0` is required
// so the flex item can actually shrink below its content size and let
// `overflow-y-auto` take effect (the classic flexbox default-
// `min-height: auto` gotcha) — without it the wrapper would grow to fit its
// content instead of scrolling. This is what makes `position: sticky`
// headers inside each tab (IngredientsTab/RecipesTab) reliably pin: sticky
// only pins relative to a genuine scrolling ancestor, and against
// window-level scroll on mobile Safari (with toolbar collapse/expand
// changing the viewport height mid-scroll) that's exactly the class of
// thing that broke intermittently before this change. `h-dvh`/
// `overflow-hidden` degrade gracefully — falling back toward today's
// document-scroll behavior, not a hard failure — on any browser that
// doesn't support the `dvh` unit. BottomTabBar stays a sibling AFTER this
// wrapper, unmoved and unmodified — already `position: fixed` per quick
// task 260812-drh, which removes it from flex-height accounting entirely,
// so the wrapper still receives the full `h-dvh` height regardless.
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
      <div className="h-dvh overflow-hidden flex flex-col bg-bar-bg">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'ingredients' && <IngredientsTab />}
          {activeTab === 'recipes' && <RecipesTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
        <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </ConfigProvider>
  )
}
