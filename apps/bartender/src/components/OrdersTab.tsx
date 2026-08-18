import { Alert, Button, List, Spin } from 'antd'
import { useOrders } from '../api/useOrders.js'

// BART-04 precision must-have: floor, never round/ceil. seconds === 60
// renders '1m ago', not '60s ago' — the exact adjacency boundary.
export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

// Tracer-minimal (Plan 04-04's job to add batching/Done wiring/tap-to-detail
// navigation) — this view proves the live-sync path only: fetch, loading,
// error+retry, empty, and populated states per UI-SPEC's Bartender Orders
// Tab copywriting contract.
export function OrdersTab() {
  const { data: orders, isLoading, isError, refetch } = useOrders()

  if (isLoading) {
    return (
      <div role="status" className="flex justify-center pt-3xl">
        <Spin />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="pt-lg px-md">
        <Alert
          type="error"
          showIcon
          message="Failed to load orders. Check your connection."
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center pt-3xl px-md">
        <h2 className="text-white">No orders yet</h2>
        <p className="text-zinc-400 mt-sm">Queue is empty. Waiting for guests to order...</p>
      </div>
    )
  }

  return (
    <List
      dataSource={orders}
      renderItem={(o) => (
        <List.Item key={o.id} style={{ minHeight: 48 }}>
          <div className="flex justify-between items-center w-full px-md">
            <div className="flex flex-col">
              <span className="text-white">{o.recipe.name}</span>
              {o.patronName && <span className="text-zinc-400 text-sm">{`For: ${o.patronName}`}</span>}
            </div>
            <span className="text-zinc-400 text-sm">{formatElapsed(o.elapsedSeconds)}</span>
          </div>
        </List.Item>
      )}
    />
  )
}
