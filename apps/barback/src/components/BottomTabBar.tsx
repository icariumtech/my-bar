import { Segmented } from 'antd'

export interface BottomTabBarProps {
  activeTab: 'ingredients' | 'recipes' | 'settings'
  onChange: (tab: 'ingredients' | 'recipes' | 'settings') => void
}

// D-23/BARBACK-01: persistent bottom tab bar replacing the header-button
// navigation. Uses antd `Segmented`, not `Tabs` — `Tabs` has no native
// bottom-positioning support (02.1-RESEARCH.md Anti-Patterns). Fixed
// left-to-right order (Ingredients/Recipes/Settings) never changes based on
// usage or content (BARBACK-01 ordering edge case).
//
// 260812-drh: `position: fixed`, not `sticky` — every tab's full-screen
// sub-view (Add/Edit/Detail/Manager) is its own `min-height: 100vh` flex
// column, so this bar's static-flow position already starts at/below the
// viewport fold before any scrolling happens. `sticky` only pins an element
// while scrolling past its natural position; it never pulls an
// already-offscreen element back into view. `fixed` guarantees the bar is
// always anchored to the true viewport bottom regardless of preceding
// content height.
export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 10,
        paddingBottom: 'env(safe-area-inset-bottom)',
        backgroundColor: '#18181b',
      }}
    >
      <Segmented<'ingredients' | 'recipes' | 'settings'>
        block
        value={activeTab}
        onChange={(value) => onChange(value)}
        options={[
          { label: 'Ingredients', value: 'ingredients' },
          { label: 'Recipes', value: 'recipes' },
          { label: 'Settings', value: 'settings' },
        ]}
        style={{ minHeight: 48 }}
      />
    </div>
  )
}
