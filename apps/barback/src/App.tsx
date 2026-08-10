import { ConfigProvider, theme } from 'antd'
import { IngredientList } from './components/IngredientList.js'

// D-11/D-12: utilitarian dark identity, deliberately NOT the dark-neon
// Patron branding. Tokens match 01-UI-SPEC.md's Ant Design Theme
// Configuration exactly.
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
        },
      }}
    >
      <div className="min-h-screen bg-bar-bg">
        <header className="p-md">
          <h1 className="text-white text-xl font-semibold">My Bar — Barback</h1>
        </header>
        <main className="px-md pb-3xl">
          <IngredientList />
        </main>
      </div>
    </ConfigProvider>
  )
}
