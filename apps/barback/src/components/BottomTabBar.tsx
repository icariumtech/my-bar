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
export function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  return (
    <div style={{ position: 'sticky', bottom: 0, width: '100%' }}>
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
