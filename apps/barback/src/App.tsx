import { useState } from 'react'
import { Button, ConfigProvider, theme } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { IngredientList } from './components/IngredientList.js'
import { AddEditIngredientForm } from './components/AddEditIngredientForm.js'

// D-11/D-12: utilitarian dark identity, deliberately NOT the dark-neon
// Patron branding. Tokens match 01-UI-SPEC.md's Ant Design Theme
// Configuration exactly.
export default function App() {
  const [addOpen, setAddOpen] = useState(false)

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
        <header className="p-md flex items-center justify-between">
          <h1 className="text-white text-xl font-semibold">My Bar — Barback</h1>
          {/* D-13: 48px minimum tap target for one-handed thumb use. */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ minHeight: 48 }}
            onClick={() => setAddOpen(true)}
          >
            Add Ingredient
          </Button>
        </header>
        <main className="px-md pb-3xl">
          <IngredientList />
        </main>
        <AddEditIngredientForm open={addOpen} onClose={() => setAddOpen(false)} />
      </div>
    </ConfigProvider>
  )
}
