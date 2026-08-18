import { ConfigProvider, theme } from 'antd'
import { OrdersTab } from './components/OrdersTab.js'

// Tracer-minimal (Plan 04-02 replaces this body with the full two-tab
// shell once RecipesTab exists): rendering only the one real, working
// view now is the correct tracer shape, not a stub — a tab bar with a
// single working tab would be premature UI. ConfigProvider token block
// matches apps/barback/src/App.tsx verbatim (D-64).
export default function App() {
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
        <OrdersTab />
      </div>
    </ConfigProvider>
  )
}
