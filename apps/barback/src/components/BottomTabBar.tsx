import { CoffeeOutlined, InboxOutlined, SettingOutlined } from '@ant-design/icons'

export interface BottomTabBarProps {
  activeTab: 'ingredients' | 'recipes' | 'settings'
  onChange: (tab: 'ingredients' | 'recipes' | 'settings') => void
}

const TABS: { value: 'ingredients' | 'recipes' | 'settings'; label: string; icon: React.ReactNode }[] = [
  { value: 'ingredients', label: 'Ingredients', icon: <InboxOutlined /> },
  { value: 'recipes', label: 'Recipes', icon: <CoffeeOutlined /> },
  { value: 'settings', label: 'Settings', icon: <SettingOutlined /> },
]

// D-23/BARBACK-01: persistent bottom tab bar replacing the header-button
// navigation. Fixed left-to-right order (Ingredients/Recipes/Settings)
// never changes based on usage or content (BARBACK-01 ordering edge case).
//
// 260812-drh: `position: fixed`, not `sticky` — every tab's full-screen
// sub-view (Add/Edit/Detail/Manager) is its own `min-height: 100vh` flex
// column, so this bar's static-flow position already starts at/below the
// viewport fold before any scrolling happens. `sticky` only pins an element
// while scrolling past its natural position; it never pulls an
// already-offscreen element back into view. `fixed` guarantees the bar is
// always anchored to the true viewport bottom regardless of preceding
// content height.
//
// 260812-fpi: switched from antd `Segmented` to a custom row of three
// pressable tab buttons — `Segmented`'s whole visual identity is its
// background-pill highlight, which conflicts with the new icon+label
// color-based selection state (accent-green when active, muted gray
// otherwise). The "clicking the already-active tab is a no-op" behavior,
// previously a side effect of `Segmented`'s native radio-input semantics,
// is now implemented explicitly via the `onClick` guard below.
//
// 260812-gcp: safe-area-inset-bottom is now reserved as flex-centered space
// via `minHeight` on the wrapper rather than as trailing `paddingBottom`, so
// the icon+label content centers within the bar's full visible height
// instead of sitting flush at its top with the safe-area gap entirely below
// it.
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
        display: 'flex',
        alignItems: 'center',
        minHeight: 'calc(48px + env(safe-area-inset-bottom))',
      }}
      className="border-t border-zinc-700 bg-bar-surface"
    >
      <div className="flex w-full">
        {TABS.map((tab) => {
          const isActive = tab.value === activeTab
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                if (tab.value !== activeTab) {
                  onChange(tab.value)
                }
              }}
              style={{ minHeight: 48 }}
              className={`flex flex-1 flex-col items-center justify-center gap-xs text-xl transition-colors ${
                isActive ? 'text-bar-accent' : 'text-zinc-400'
              }`}
            >
              {tab.icon}
              <span className="text-xs">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
