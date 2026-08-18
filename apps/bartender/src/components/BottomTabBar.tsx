import { Badge } from 'antd'
import { CoffeeOutlined, InboxOutlined } from '@ant-design/icons'

export interface BottomTabBarProps {
  activeTab: 'recipes' | 'orders'
  onChange: (tab: 'recipes' | 'orders') => void
  // D-55: live count of open (not-yet-done) orders, shown as a badge on
  // the Orders tab.
  openOrderCount: number
}

const TABS: { value: 'recipes' | 'orders'; label: string; icon: React.ReactNode }[] = [
  { value: 'recipes', label: 'Recipes', icon: <CoffeeOutlined /> },
  { value: 'orders', label: 'Orders', icon: <InboxOutlined /> },
]

// D-55: two-tab bottom bar (Recipes/Orders), structurally identical to
// apps/barback/src/components/BottomTabBar.tsx (fixed position, icon+label
// buttons, no-op-on-active-tap guard) but with two tabs instead of three
// and a live open-order-count Badge wrapping the Orders tab's icon.
export function BottomTabBar({ activeTab, onChange, openOrderCount }: BottomTabBarProps) {
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
          const icon =
            tab.value === 'orders' ? (
              <Badge count={openOrderCount} color="#22c55e" offset={[-8, 8]}>
                {tab.icon}
              </Badge>
            ) : (
              tab.icon
            )

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
              {icon}
              <span className="text-xs">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
