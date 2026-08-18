# Phase 4: Bartender Console & Order Workflow - Pattern Map

**Mapped:** 2026-08-18  
**Files analyzed:** 23 new/modified files  
**Analogs found:** 20/23 with close matches

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `apps/patron/src/components/RecipeDetail.tsx` | component | request-response | self (existing) | exact |
| `apps/patron/src/components/OrderPrompt.tsx` | component | request-response | RecipeDetail.tsx (modal pattern) | role-match |
| `apps/patron/src/api/useSubmitOrder.ts` | hook/mutation | request-response | `apps/barback/src/api/useIngredients.ts#useCreateIngredient` | exact |
| `apps/patron/src/hooks/useKioskInactivity.ts` | hook/utility | request-response | RESEARCH.md pattern | research-only |
| `apps/patron/src/hooks/useFullscreen.ts` | hook/utility | request-response | RESEARCH.md pattern | research-only |
| `apps/patron/src/hooks/useWakeLock.ts` | hook/utility | request-response | RESEARCH.md pattern | research-only |
| `apps/bartender/src/main.tsx` | entry point | request-response | `apps/patron/src/main.tsx` | exact |
| `apps/bartender/src/App.tsx` | component (root) | request-response | `apps/barback/src/App.tsx` | exact |
| `apps/bartender/src/components/BottomTabBar.tsx` | component | request-response | `apps/barback/src/components/BottomTabBar.tsx` | exact |
| `apps/bartender/src/components/RecipesTab.tsx` | component | request-response | `apps/barback/src/components/RecipesTab.tsx` | exact |
| `apps/bartender/src/components/OrdersTab.tsx` | component | request-response | `apps/barback/src/components/RecipesTab.tsx` | role-match |
| `apps/bartender/src/components/RecipeSearchFilter.tsx` | component | request-response | `apps/barback/src/components/SearchFilterBar.tsx` | role-match |
| `apps/bartender/src/components/RecipeOrOrderDetail.tsx` | component | request-response | `apps/patron/src/components/RecipeDetail.tsx` | role-match |
| `apps/bartender/src/api/socket.ts` | utility | event-driven | `apps/patron/src/api/socket.ts` | exact |
| `apps/bartender/src/api/useRecipes.ts` | hook/query | request-response | `apps/patron/src/api/useRecipes.ts` | exact |
| `apps/bartender/src/api/useOrders.ts` | hook/query | request-response | `apps/patron/src/api/useRecipes.ts` | role-match |
| `apps/bartender/src/api/useMarkOrderDone.ts` | hook/mutation | request-response | `apps/barback/src/api/useIngredients.ts#useUpdateIngredient` | role-match |
| `apps/bartender/src/api/client.ts` | utility | request-response | `apps/patron/src/api/client.ts` | exact |
| `apps/server/src/db/schema.ts` | model/config | CRUD | self (existing schema patterns) | exact |
| `apps/server/src/routes/orders.ts` | route/controller | request-response | `apps/server/src/routes/ingredients.ts` | role-match |
| `apps/server/src/index.ts` | config | request-response | self (route registration) | exact |
| `apps/bartender/package.json` | config | — | `apps/barback/package.json` | exact |
| `apps/bartender/vite.config.ts` | config | — | `apps/patron/vite.config.ts` | exact |

---

## Pattern Assignments

### `apps/patron/src/components/RecipeDetail.tsx` (component, request-response)

**Analog:** self (existing implementation)  
**Changes needed:** Add Order button + OrderPrompt modal integration

**Core component structure** (existing, lines 28–60):
```typescript
interface RecipeDetailProps {
  recipeId: string
  onBack: () => void
}

export function RecipeDetail({ recipeId, onBack }: RecipeDetailProps) {
  const { data: recipe, isLoading, isError } = useRecipeDetail(recipeId)
  
  if (isLoading) {
    return <div>Loading drinks…</div>
  }

  if (isError || !recipe) {
    return <div>Something went wrong</div>
  }

  return (
    <div className="h-dvh flex flex-col bg-patron-bg">
      {/* Existing hero + header */}
      <div className="flex-1 overflow-y-auto px-lg pb-3xl -mt-lg">
        {/* Existing recipe content */}
      </div>
    </div>
  )
}
```

**Patron-specific styling tokens** (lines 74–88):
```typescript
// Use existing Patron neon tokens, NOT Bartender's antd theme
className="text-patron-accent"  // #ff6b35 orange
className="text-patron-destructive"  // #ef4444 red
className="bg-patron-surface/70"  // semi-transparent surface
className="glow-orange"  // existing neon effect
```

---

### `apps/patron/src/components/OrderPrompt.tsx` (component, request-response)

**Analog:** RESEARCH.md code example (OrderPrompt pattern)  
**Pattern:** Simple modal form component with optional text input

**Import structure:**
```typescript
import { useState } from 'react'
```

**Component pattern** (from RESEARCH.md section Order Submission on Patron RecipeDetail):
```typescript
interface OrderPromptProps {
  onSubmit: (patronName: string | undefined) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function OrderPrompt({ onSubmit, onCancel, isSubmitting }: OrderPromptProps) {
  const [name, setName] = useState('')

  const handleSubmit = () => {
    onSubmit(name.trim() || undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-patron-surface rounded-lg p-xl max-w-sm w-full mx-lg">
        <h2 className="text-white text-lg font-semibold mb-md">Who's this for?</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Guest name (optional)"
          className="w-full px-md py-sm bg-patron-bg text-white rounded border border-patron-accent/30 mb-lg"
          disabled={isSubmitting}
        />
        <div className="flex gap-sm">
          <button onClick={onCancel} disabled={isSubmitting}>Cancel</button>
          <button onClick={handleSubmit} disabled={isSubmitting}>Send Order</button>
        </div>
      </div>
    </div>
  )
}
```

---

### `apps/patron/src/api/useSubmitOrder.ts` (hook/mutation, request-response)

**Analog:** `apps/barback/src/api/useIngredients.ts#useCreateIngredient` (lines 22–38)

**Imports pattern:**
```typescript
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { apiFetch } from './client.js'
```

**Mutation hook pattern** (adapted from useCreateIngredient):
```typescript
const orderInput = z.object({
  recipeId: z.string().min(1),
  patronName: z.string().optional(),
})

export function useSubmitOrder() {
  return useMutation({
    mutationFn: (input: z.infer<typeof orderInput>) =>
      apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    // D-51/D-52: onSuccess handles toast, onError shows inline error
    // No onSettled invalidation needed — Patron doesn't display orders
  })
}
```

**Error handling pattern** (from useIngredients.ts line 34–36):
```typescript
// Caller's responsibility: show error toast on mutation error
// Component receives isPending to disable button while submitting
```

---

### `apps/patron/src/hooks/useKioskInactivity.ts` (hook/utility, request-response)

**Analog:** RESEARCH.md section "Kiosk Inactivity Detection Hook" (lines 237–276)

**Hook pattern:**
```typescript
import { useEffect, useRef } from 'react'

export function useKioskInactivity(
  onTimeout: () => void,
  timeoutMs: number = 90000,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        onTimeout()
      }, timeoutMs)
    }

    window.addEventListener('touchstart', resetTimer)
    window.addEventListener('mousedown', resetTimer)
    window.addEventListener('keydown', resetTimer)

    resetTimer()

    return () => {
      window.removeEventListener('touchstart', resetTimer)
      window.removeEventListener('mousedown', resetTimer)
      window.removeEventListener('keydown', resetTimer)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onTimeout, timeoutMs])
}
```

**Usage in RecipeBrowse** (from RESEARCH.md line 281–292):
```typescript
useKioskInactivity(() => {
  setCurrentView('browse')
}, 90000)
```

---

### `apps/patron/src/hooks/useFullscreen.ts` (hook/utility, request-response)

**Analog:** RESEARCH.md section "Fullscreen Mode (iPad Safari)" (lines 303–323)

**Hook pattern:**
```typescript
import { useEffect } from 'react'

export function useFullscreen() {
  useEffect(() => {
    async function requestFullscreen() {
      const elem = document.documentElement
      try {
        if (elem.requestFullscreen && !document.fullscreenElement) {
          await elem.requestFullscreen()
        }
      } catch (err) {
        console.warn('Fullscreen request failed (normal on locked devices):', err)
      }
    }

    requestFullscreen()
  }, [])
}
```

**Usage in App.tsx:**
```typescript
// Call on app mount
useFullscreen()
```

---

### `apps/patron/src/hooks/useWakeLock.ts` (hook/utility, request-response)

**Analog:** RESEARCH.md section "Wake Lock (Screen Stay-On)" (lines 332–352)

**Hook pattern:**
```typescript
import { useEffect } from 'react'

export function useWakeLock() {
  useEffect(() => {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen')
        .then(() => {
          console.log('Wake lock acquired')
        })
        .catch((err) => {
          console.warn('Wake lock request failed:', err)
        })
    }
  }, [])
}
```

**Usage in App.tsx:**
```typescript
useWakeLock()
```

---

### `apps/bartender/src/main.tsx` (entry point, request-response)

**Analog:** `apps/patron/src/main.tsx` (lines 1–22) OR `apps/barback/src/main.tsx` (lines 1–15)

**Patron main.tsx pattern** (with Socket.IO):
```typescript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.js'
import { initSocket } from './api/socket.js'
import './index.css'

const queryClient = new QueryClient()

// SYNC-01/D-47: connects as soon as the app boots
initSocket(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
```

**For Bartender:** Follow patron's pattern (with Socket.IO), as Bartender also needs live order updates.

---

### `apps/bartender/src/App.tsx` (component root, request-response)

**Analog:** `apps/barback/src/App.tsx` (lines 1–60)

**antd ConfigProvider + theme pattern** (lines 38–48):
```typescript
import { useState } from 'react'
import { ConfigProvider, theme } from 'antd'
import { BottomTabBar } from './components/BottomTabBar.js'

export default function App() {
  const [activeTab, setActiveTab] = useState<'recipes' | 'orders'>('recipes')

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorBgLayout: '#18181b',      // dominant surface
          colorBgContainer: '#27272a',   // secondary surface
          colorPrimary: '#22c55e',       // accent green
          colorError: '#ef4444',         // destructive red
          colorWarning: '#facc15',       // warning yellow
        },
      }}
    >
      <div className="h-dvh overflow-hidden flex flex-col bg-bar-bg">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === 'recipes' && <RecipesTab />}
          {activeTab === 'orders' && <OrdersTab />}
        </div>
        <BottomTabBar activeTab={activeTab} onChange={setActiveTab} />
      </div>
    </ConfigProvider>
  )
}
```

---

### `apps/bartender/src/components/BottomTabBar.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/BottomTabBar.tsx` (lines 1–84)

**Pattern:** Two-tab version (Recipes/Orders)

**Interface + tabs definition** (lines 8–12):
```typescript
interface BottomTabBarProps {
  activeTab: 'recipes' | 'orders'
  onChange: (tab: 'recipes' | 'orders') => void
}

const TABS: { value: 'recipes' | 'orders'; label: string; icon: React.ReactNode }[] = [
  { value: 'recipes', label: 'Recipes', icon: <CoffeeOutlined /> },
  { value: 'orders', label: 'Orders', icon: <InboxOutlined /> },
]
```

**Tab button rendering** (lines 40–83):
```typescript
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
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={tab.value === activeTab}
          onClick={() => {
            if (tab.value !== activeTab) {
              onChange(tab.value)
            }
          }}
          className={`flex flex-1 flex-col items-center justify-center gap-xs text-xl transition-colors ${
            tab.value === activeTab ? 'text-bar-accent' : 'text-zinc-400'
          }`}
        >
          {tab.icon}
          <span className="text-xs">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
```

**Addition for Bartender:** Orders tab needs a Badge count. Use antd Badge component:
```typescript
import { Badge } from 'antd'

// In Orders tab button:
<Badge count={openOrderCount} color="#22c55e" offset={[-8, 8]}>
  {tab.icon}
</Badge>
```

---

### `apps/bartender/src/components/RecipesTab.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/RecipesTab.tsx` (lines 1–100)

**State + view pattern** (lines 54–82):
```typescript
import { useState } from 'react'
import { Button, Input } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { Recipe } from '@my-bar/shared'
import { RecipeList } from './RecipeList.js'
import { RecipeOrOrderDetail } from './RecipeOrOrderDetail.js'
import { RecipeSearchFilter } from './RecipeSearchFilter.js'

export function RecipesTab() {
  const [view, setView] = useState<'list' | 'filter' | 'detail'>('list')
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>()

  function openDetail(recipe: Recipe) {
    setSelectedRecipe(recipe)
    setView('detail')
  }

  if (view === 'detail' && selectedRecipe) {
    return <RecipeOrOrderDetail recipe={selectedRecipe} onBack={() => setView('list')} />
  }

  if (view === 'filter') {
    return <RecipeSearchFilter onBack={() => setView('list')} />
  }

  return (
    <div className="px-md pb-3xl">
      <div className="sticky top-0 z-10 bg-bar-bg pb-md safe-area-inset-top">
        <Button
          type="primary"
          icon={<SearchOutlined />}
          aria-label="Search & Filter"
          onClick={() => setView('filter')}
          style={{ width: 48, height: 48, minWidth: 48, padding: 0 }}
        />
      </div>
      <RecipeList recipes={recipes} onSelectRecipe={openDetail} />
    </div>
  )
}
```

---

### `apps/bartender/src/components/OrdersTab.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/RecipesTab.tsx` (list pattern)  
**Pattern reference:** RESEARCH.md section "Bartender Orders Tab with Batching" (lines 548–636)

**Batching + display pattern:**
```typescript
import { useMemo } from 'react'
import { Badge, List, Button, Empty } from 'antd'
import { useOrders } from '../api/useOrders.js'

interface BatchedOrder {
  recipeId: string
  recipe: Recipe
  status: 'new' | 'in_progress' | 'done'
  count: number
  patronNames: string[]
  elapsedSeconds: number
}

export function OrdersTab({ onOrderSelected }: { onOrderSelected: (order: BatchedOrder) => void }) {
  const { data: orders = [], isLoading } = useOrders()

  const batched = useMemo(() => {
    // Group by (recipeId, status) and aggregate
    const grouped = orders.reduce((acc, order) => {
      const key = `${order.recipeId}:${order.status}`
      if (!acc[key]) {
        acc[key] = {
          recipeId: order.recipeId,
          recipe: order.recipe,
          status: order.status,
          count: 0,
          patronNames: [],
          elapsedSeconds: 0,
        }
      }
      acc[key].count += 1
      if (order.patronName) acc[key].patronNames.push(order.patronName)
      acc[key].elapsedSeconds = Math.max(acc[key].elapsedSeconds, order.elapsedSeconds)
      return acc
    }, {} as Record<string, BatchedOrder>)

    return Object.values(grouped).sort((a, b) => b.elapsedSeconds - a.elapsedSeconds)
  }, [orders])

  const openCount = batched.filter((o) => o.status !== 'done').length

  if (!isLoading && batched.length === 0) {
    return (
      <div className="px-md pt-lg">
        <Empty description="No orders yet" />
      </div>
    )
  }

  return (
    <div className="p-lg">
      <div className="flex items-center gap-md mb-lg">
        <h2 className="text-lg font-semibold text-white">Orders</h2>
        <Badge count={openCount} color="#22c55e" />
      </div>
      <List
        dataSource={batched}
        loading={isLoading}
        renderItem={(batch) => (
          <List.Item
            onClick={() => onOrderSelected(batch)}
            className="cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-center gap-sm">
                <span className="font-semibold text-white">{batch.recipe.name}</span>
                {batch.count > 1 && <span className="text-xs text-zinc-400">×{batch.count}</span>}
              </div>
              {batch.patronNames.length > 0 && (
                <p className="text-xs text-zinc-400">
                  For: {batch.patronNames.join(', ')}
                </p>
              )}
              <p className="text-xs text-zinc-400">
                {Math.floor(batch.elapsedSeconds / 60)}m ago
              </p>
            </div>
          </List.Item>
        )}
      />
    </div>
  )
}
```

---

### `apps/bartender/src/components/RecipeSearchFilter.tsx` (component, request-response)

**Analog:** `apps/barback/src/components/SearchFilterBar.tsx` (filter pattern)

**Full-screen overlay pattern** (from RESEARCH.md D-62):
```typescript
import { useState } from 'react'
import { Button, Checkbox, Input } from 'antd'

export function RecipeSearchFilter({ onBack }: { onBack: () => void }) {
  const [nameSearch, setNameSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const handleTagToggle = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  return (
    <div className="fixed inset-0 bg-bar-bg z-50 flex flex-col">
      <div className="sticky top-0 z-10 bg-bar-bg border-b border-zinc-700 px-md py-md safe-area-inset-top">
        <div className="flex items-center gap-sm mb-md">
          <Button onClick={onBack} type="text">← Back</Button>
          <h2 className="text-lg font-semibold text-white">Search & Filter</h2>
        </div>
        <Input
          placeholder="Recipe name…"
          value={nameSearch}
          onChange={(e) => setNameSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto px-md py-md">
        {/* Render tag groups (Spirit/Type/Season/Flavor) with checkboxes */}
        {/* Filter recipes based on nameSearch + selectedTags */}
      </div>

      <div className="sticky bottom-0 border-t border-zinc-700 px-md py-md flex gap-sm">
        <Button onClick={onBack} className="flex-1">Clear</Button>
        <Button type="primary" onClick={onBack} className="flex-1">Apply</Button>
      </div>
    </div>
  )
}
```

---

### `apps/bartender/src/components/RecipeOrOrderDetail.tsx` (component, request-response)

**Analog:** `apps/patron/src/components/RecipeDetail.tsx` (lines 28–96) + antd Badge from `apps/barback/src/components/MakeableStatusBadge.tsx`

**Detail view pattern:**
```typescript
import { Button, Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import type { Order, Recipe, TriStateStatus } from '@my-bar/shared'

interface RecipeOrOrderDetailProps {
  recipe: Recipe
  order?: Order  // If present, show Done button
  onBack: () => void
  onMarkDone?: () => void
}

export function RecipeOrOrderDetail({
  recipe,
  order,
  onBack,
  onMarkDone,
}: RecipeOrOrderDetailProps) {
  // D-63: show FULL tri-state (green/yellow/red), not Patron's 2-state
  const statusBadge = (status: TriStateStatus) => {
    if (status === 'green') {
      return <Tag icon={<CheckCircleOutlined />} color="success">Ready to make</Tag>
    }
    if (status === 'yellow') {
      return <Tag icon={<WarningOutlined />} color="warning">Substitution needed</Tag>
    }
    return <Tag icon={<CloseCircleOutlined />} color="error">Missing ingredients</Tag>
  }

  return (
    <div className="fixed inset-0 bg-bar-bg z-50 flex flex-col overflow-y-auto">
      <div className="sticky top-0 z-10 bg-bar-bg border-b border-zinc-700 px-md py-md safe-area-inset-top">
        <Button onClick={onBack} type="text">← Back</Button>
      </div>

      <div className="flex-1 px-md py-md">
        <h1 className="text-2xl font-semibold text-white mb-md">{recipe.name}</h1>

        {statusBadge(recipe.overallStatus)}

        {/* Recipe tags, ingredients, method, glassware, garnish */}

        {/* D-56: conditional Done button if this is an open order */}
        {order && order.status !== 'done' && (
          <div className="mt-md">
            <p className="text-xs text-zinc-400 mb-sm">
              Ordered {Math.floor(order.elapsedSeconds / 60)}m ago
              {order.patronName && ` for ${order.patronName}`}
            </p>
            <Button
              type="primary"
              onClick={onMarkDone}
              className="w-full"
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

### `apps/bartender/src/api/socket.ts` (utility, event-driven)

**Analog:** `apps/patron/src/api/socket.ts` (lines 1–52)

**Socket handler pattern** (lines 21–38):
```typescript
import { io, type Socket } from 'socket.io-client'
import type { QueryClient } from '@tanstack/react-query'

interface SocketLike {
  on(event: string, listener: (...args: unknown[]) => void): unknown
}

export function registerSocketHandlers(socket: SocketLike, queryClient: QueryClient): void {
  socket.on('orders:created', () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  })

  socket.on('orders:updated', () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  })

  socket.on('inventory:changed', () => {
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  })

  socket.on('connect', () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['recipes'] })
  })
}

export function initSocket(queryClient: QueryClient): Socket {
  const socket = io()
  registerSocketHandlers(socket, queryClient)
  return socket
}
```

---

### `apps/bartender/src/api/useRecipes.ts` (hook/query, request-response)

**Analog:** `apps/patron/src/api/useRecipes.ts` (lines 1–16)

**Query pattern:**
```typescript
import { useQuery } from '@tanstack/react-query'
import type { Recipe } from '@my-bar/shared'
import { apiFetch } from './client.js'

// D-63: Bartender needs full tri-state makeable (not Patron's 2-state collapse)
// so no special staleTime or gcTime override — same as patron
export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<Recipe[]>('/recipes'),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
  })
}
```

---

### `apps/bartender/src/api/useOrders.ts` (hook/query, request-response)

**Analog:** `apps/patron/src/api/useRecipes.ts` (lines 1–16)  
**Pattern reference:** RESEARCH.md section "API Routes (Orders)" (lines 188–215)

**Query pattern for orders list:**
```typescript
import { useQuery } from '@tanstack/react-query'
import type { Order } from '@my-bar/shared'
import { apiFetch } from './client.js'

export interface OrderWithRecipe extends Order {
  recipe: Recipe  // API returns full recipe object, not just recipeId
  elapsedSeconds: number  // Computed server-side: Date.now() - createdAt
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      // Fetch only open orders (status != 'done') per D-60
      return apiFetch<OrderWithRecipe[]>('/orders?status=open')
    },
    staleTime: 0,  // Always refetch on mount (orders change rapidly)
    gcTime: 1000 * 60 * 5,
  })
}
```

---

### `apps/bartender/src/api/useMarkOrderDone.ts` (hook/mutation, request-response)

**Analog:** `apps/barback/src/api/useIngredients.ts#useUpdateIngredient` (lines 51–66)

**Mutation pattern:**
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Order } from '@my-bar/shared'
import { apiFetch } from './client.js'

export function useMarkOrderDone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) =>
      apiFetch<Order>(`/orders/${orderId}/done`, {
        method: 'PATCH',
        body: JSON.stringify({}),
      }),
    // Invalidate on SETTLE (not just success) so stale orders are re-fetched
    // even if the mutation fails (Pitfall 4 from 01-RESEARCH.md)
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
```

---

### `apps/bartender/src/api/client.ts` (utility, request-response)

**Analog:** `apps/patron/src/api/client.ts` OR `apps/barback/src/api/client.ts`

**API fetch wrapper** (standard pattern):
```typescript
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }

  return response.json()
}
```

---

### `apps/server/src/db/schema.ts` (model/config, CRUD)

**Analog:** self (existing schema patterns from lines 1–114)

**Orders table addition** (from RESEARCH.md section "Drizzle Schema Addition: Orders Table"):
```typescript
// Phase 4: order queue with recipe reference + optional patron name + status lifecycle
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'restrict' }),
  patronName: text('patron_name'),  // Optional free-text from "who's this for" prompt
  status: text('status', { enum: ['new', 'in_progress', 'done'] })
    .notNull()
    .default('new'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
```

**Rationale for `onDelete: 'restrict'`:** D-54 says every order must have a valid recipe. Preventing recipe deletion with pending orders ensures data integrity.

---

### `apps/server/src/routes/orders.ts` (route/controller, request-response)

**Analog:** `apps/server/src/routes/ingredients.ts` (lines 1–160) for structure  
**Also reference:** `apps/server/src/routes/recipes.ts` (lines 160–296) for POST/PATCH patterns

**Route structure pattern** (from ingredients.ts):
```typescript
import type { FastifyPluginAsync, FastifyPluginOptions } from 'fastify'
import type { ZodTypeProvider } from '@fastify/type-provider-zod'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db as defaultDb } from '../db/client.js'
import { orders, recipes } from '../db/schema.js'

interface OrdersRoutesOptions extends FastifyPluginOptions {
  db?: typeof defaultDb
}

export const ordersRoutes: FastifyPluginAsync<OrdersRoutesOptions> = async (app, opts) => {
  const db = opts.db ?? defaultDb

  // POST /api/orders — submit a new order
  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
    {
      schema: {
        body: z.object({
          recipeId: z.string().uuid(),
          patronName: z.string().optional(),
        }),
        response: {
          201: z.object({ /* order response schema */ }),
        },
      },
    },
    async (request, reply) => {
      const orderId = crypto.randomUUID()
      const now = new Date()

      try {
        db.insert(orders)
          .values({
            id: orderId,
            recipeId: request.body.recipeId,
            patronName: request.body.patronName ?? null,
            status: 'new',
            createdAt: now,
            updatedAt: now,
          })
          .run()
      } catch (err) {
        if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
          return reply.status(400).send({ error: 'Recipe not found' })
        }
        throw err
      }

      // SYNC-01: emit event with orderId only — clients re-fetch via REST
      app.io?.emit('orders:created', { orderId })

      return reply.status(201).send(/* order data with recipe joined */)
    },
  )

  // GET /api/orders — fetch all pending orders (for Bartender queue)
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              recipe: z.object({}),  // Full recipe object
              patronName: z.string().optional(),
              status: z.enum(['new', 'in_progress', 'done']),
              createdAt: z.date(),
              updatedAt: z.date(),
              elapsedSeconds: z.number(),  // Computed: Date.now() - createdAt
            }),
          ),
        },
      },
    },
    async () => {
      const rows = db
        .select({
          id: orders.id,
          recipeId: orders.recipeId,
          patronName: orders.patronName,
          status: orders.status,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .where(ne(orders.status, 'done'))  // Filter out done orders per D-60
        .orderBy(asc(orders.createdAt))
        .all()

      // Join recipe data for each order + compute elapsedSeconds
      return rows.map((row) => {
        const recipe = loadRecipe(db, row.recipeId)  // Reuse from recipes.ts
        return {
          ...row,
          recipe,
          elapsedSeconds: Math.floor((Date.now() - row.createdAt.getTime()) / 1000),
        }
      })
    },
  )

  // PATCH /api/orders/:id/done — mark order as complete
  app.withTypeProvider<ZodTypeProvider>().patch(
    '/:id/done',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ id: z.string(), status: z.enum(['done']) }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const now = new Date()

      db.update(orders)
        .set({
          status: 'done',
          updatedAt: now,
        })
        .where(eq(orders.id, id))
        .run()

      app.io?.emit('orders:updated', { orderId: id })

      return reply.status(200).send({ id, status: 'done' })
    },
  )
}
```

---

### `apps/server/src/index.ts` (config, request-response)

**Analog:** self (lines 1–76)

**Route registration addition** (line 42 pattern):
```typescript
import { ordersRoutes } from './routes/orders.js'

// Inside buildApp() function, after other route registrations:
app.register(ordersRoutes, { prefix: '/api/orders' })
```

**Placement:** Register AFTER `registerSocketHub(app)` (line 36) so `app.io` is available to orders route handlers.

---

## Shared Patterns

### Authentication / Authorization

**Applies to:** None (no auth required per project constraints)

### Error Handling (Patron Components)

**Source:** `apps/patron/src/components/RecipeDetail.tsx` (lines 39–47)

**Pattern:** Graceful error state in component tree
```typescript
if (isError || !recipe) {
  return (
    <div className="h-dvh flex flex-col items-center justify-center gap-md bg-patron-bg px-xl text-center">
      <h1 className="text-white">Something went wrong</h1>
      <p className="text-patron-text-secondary">
        Failed to load drinks. Please check your connection and try again.
      </p>
    </div>
  )
}
```

**Apply to:** RecipeDetail (Order button submission errors), OrdersTab (fetch failures)

### Error Handling (Server Routes)

**Source:** `apps/server/src/routes/ingredients.ts` (lines 84–90)

**Pattern:** FK constraint translation
```typescript
try {
  // ... database operation
} catch (err) {
  if (err instanceof Error && /FOREIGN KEY constraint failed/i.test(err.message)) {
    return reply.status(400).send({ error: 'Unknown recipe' })
  }
  throw err
}
```

**Apply to:** POST /api/orders (validate recipeId exists), PATCH /api/orders/:id (validate order exists)

### Query/Mutation Invalidation

**Source:** `apps/barback/src/api/useIngredients.ts` (lines 34–36, 60–64, 88–94)

**Pattern:** `onSettled` (not `onSuccess`) for side-effect invalidation
```typescript
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['orders'] })
}
```

**Apply to:** All Bartender mutations (useMarkOrderDone, any future order mutations)

### Socket.IO Event Wiring

**Source:** `apps/patron/src/api/socket.ts` (lines 21–38)

**Pattern:** No-payload events with TanStack Query invalidation
```typescript
socket.on('orders:created', () => {
  queryClient.invalidateQueries({ queryKey: ['orders'] })
})
```

**Apply to:** Bartender socket.ts (orders:created, orders:updated handlers)

### Validation at Route Boundary

**Source:** `apps/server/src/routes/recipes.ts` (lines 165–177)  
**Also:** `apps/server/src/routes/ingredients.ts` (lines 57–67)

**Pattern:** Zod schema on request body + response
```typescript
app.withTypeProvider<ZodTypeProvider>().post(
  '/',
  {
    schema: {
      body: orderInput,  // Reuse shared Zod schema
      response: {
        201: orderResponse,  // Define response shape
      },
    },
  },
  // ... handler
)
```

**Apply to:** All /api/orders endpoints (POST, PATCH)

---

## No Analog Found

Files with no close match in the codebase (rely on RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/patron/src/hooks/useKioskInactivity.ts` | hook/utility | request-response | Custom React event listener hook — no existing idle-detection pattern in codebase |
| `apps/patron/src/hooks/useFullscreen.ts` | hook/utility | request-response | Browser Fullscreen API wrapper — no existing fullscreen code in codebase |
| `apps/patron/src/hooks/useWakeLock.ts` | hook/utility | request-response | Browser Wake Lock API wrapper — no existing wake-lock code in codebase |
| `apps/bartender/src/components/RecipeSearchFilter.tsx` | component | request-response | Full-screen tag picker overlay — Barback's SearchFilterBar is chip-based, not full-screen; different enough to not be a direct copy |

**Recommendation:** For these three, follow RESEARCH.md code examples exactly (lines 237–352).

---

## Metadata

**Analog search scope:** `/apps/patron/src/**`, `/apps/barback/src/**`, `/apps/server/src/**`

**Files scanned:** 40+

**Pattern extraction date:** 2026-08-18

**Confidence breakdown:**
- Existing component/hook patterns (RecipeDetail, useRecipes, BottomTabBar, useIngredients): **HIGH** — verified by reading source
- Socket.IO and TanStack Query wiring: **HIGH** — Phase 3 patterns proven and tested
- Server route structure (POST/PATCH/GET with Zod validation): **HIGH** — established in Phase 2 and Phase 2.1
- Drizzle schema patterns: **HIGH** — existing schema.ts provides reference
- Kiosk hooks (useKioskInactivity, useFullscreen, useWakeLock): **MEDIUM** — RESEARCH.md provides complete implementations; no existing codebase analog to verify against
- Order batching logic (OrdersTab): **MEDIUM** — algorithm is novel; test needed to confirm groupBy approach works as expected

---

## Ready for Planning

All files classified and analogs identified. Planner can reference:
- Exact file paths and line numbers for copy-paste patterns
- antd ConfigProvider + theme setup from Barback (proven dark theme)
- Socket.IO event wiring from Patron (proven inventory sync)
- TanStack Query hook patterns from both apps (proven query/mutation patterns)
- Fastify route structure from existing routes (proven error handling, validation)

Pattern mapping complete. Planner can now build Phase 4 implementation plan.
