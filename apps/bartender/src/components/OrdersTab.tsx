import { useMemo, useState } from 'react'
import { Alert, Button, Card, Spin } from 'antd'
import type { Order, OrderStatus, Recipe } from '@my-bar/shared'
import { useOrders } from '../api/useOrders.js'
import { useOpenOrder } from '../api/useOpenOrder.js'
import { useMarkOrderDone } from '../api/useMarkOrderDone.js'
import { MakeableStatusBadge } from './MakeableStatusBadge.js'
import { RecipeOrOrderDetail } from './RecipeOrOrderDetail.js'

// BART-04 precision must-have: floor, never round/ceil. seconds === 60
// renders '1m ago', not '60s ago' — the exact adjacency boundary.
export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

// D-58: identical open orders for the same recipe+status collapse into one
// row (never merged across statuses — a 'new' and an 'in_progress' order for
// the same recipe stay two separate rows/batches).
export interface BatchedOrder {
  recipe: Recipe
  status: OrderStatus
  count: number
  patronNames: string[]
  elapsedSeconds: number
  orderIds: string[]
}

export function batchOrders(orders: Order[]): BatchedOrder[] {
  const grouped: Record<string, BatchedOrder> = {}

  for (const order of orders) {
    const key = `${order.recipe.id}:${order.status}`
    if (!grouped[key]) {
      grouped[key] = {
        recipe: order.recipe,
        status: order.status,
        count: 0,
        patronNames: [],
        elapsedSeconds: 0,
        orderIds: [],
      }
    }
    const batch = grouped[key]
    batch.count += 1
    if (order.patronName) batch.patronNames.push(order.patronName)
    batch.elapsedSeconds = Math.max(batch.elapsedSeconds, order.elapsedSeconds)
    batch.orderIds.push(order.id)
  }

  // Sorted oldest-first (D-62), stable tiebreak on first orderId mirrors
  // GET /api/orders's own asc(id) secondary sort at equal elapsedSeconds.
  return Object.values(grouped).sort(
    (a, b) => b.elapsedSeconds - a.elapsedSeconds || a.orderIds[0].localeCompare(b.orderIds[0]),
  )
}

export function OrdersTab() {
  const { data: rawOrders = [], isLoading, isError, refetch } = useOrders()
  const openOrder = useOpenOrder()
  const markDone = useMarkOrderDone()
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [viewingBatch, setViewingBatch] = useState<BatchedOrder>()

  // D-60: the server intentionally keeps a 'done' order queryable from
  // GET /api/orders for a bounded 5-minute retention window. That window is
  // for the server's own bookkeeping, not for what the Orders tab's active
  // queue should display — a 'done' batch must never render here, mirroring
  // the same new/in_progress-only rule App.tsx's openOrderCount badge
  // already applies. Without this filter a just-completed order kept
  // rendering as an ordinary, indistinguishable active row for the whole
  // retention window, which read as "Done didn't clear it."
  const visibleBatches = useMemo(
    () => batchOrders(rawOrders).filter((batch) => batch.status !== 'done'),
    [rawOrders],
  )

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

  if (visibleBatches.length === 0) {
    return (
      <div className="text-center pt-3xl px-md">
        <h2 className="text-white">No orders yet</h2>
        <p className="text-zinc-400 mt-sm">Queue is empty. Waiting for guests to order...</p>
      </div>
    )
  }

  // D-57: opening a 'new' batch auto-advances every order in it to
  // 'in_progress' at once; opening an already-'in_progress' batch is a
  // no-op on the mutation (idempotent-safe either way, but this avoids
  // redundant network calls).
  function openBatch(batch: BatchedOrder) {
    if (batch.status === 'new') {
      batch.orderIds.forEach((id) => openOrder.mutate(id))
    }
    setViewingBatch(batch)
    setView('detail')
  }

  if (view === 'detail' && viewingBatch) {
    return (
      <RecipeOrOrderDetail
        recipe={viewingBatch.recipe}
        order={{
          patronName: viewingBatch.patronNames.length > 0 ? viewingBatch.patronNames.join(', ') : null,
          status: viewingBatch.status,
          elapsedSeconds: viewingBatch.elapsedSeconds,
        }}
        onBack={() => setView('list')}
        onMarkDone={() => {
          // D-58: one Done tap clears every individual order in the batch;
          // navigation back to the list does not wait for all N mutations
          // to settle — each mutation's own onSettled independently
          // triggers the ['orders'] refetch that reflects the change.
          viewingBatch.orderIds.forEach((id) => markDone.mutate(id))
          setView('list')
        }}
      />
    )
  }

  return (
    <div className="px-md py-md flex flex-col gap-sm">
      {visibleBatches.map((batch) => (
        <Card
          key={`${batch.recipe.id}:${batch.status}`}
          hoverable
          onClick={() => openBatch(batch)}
          style={{ cursor: 'pointer' }}
          styles={{ body: { padding: 16 } }}
        >
          <div className="flex flex-col gap-xs">
            <div className="flex justify-between items-center">
              <span className="text-white">
                {batch.recipe.name}
                {batch.count > 1 && ` ×${batch.count}`}
              </span>
              <MakeableStatusBadge status={batch.recipe.overallStatus} />
            </div>
            <div className="flex items-center gap-sm">
              {batch.patronNames.length > 0 && (
                <span
                  className="text-zinc-400 text-sm"
                  style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={batch.patronNames.join(', ')}
                >
                  {`For: ${batch.patronNames.join(', ')}`}
                </span>
              )}
              <span className="text-zinc-400 text-sm ml-auto">{formatElapsed(batch.elapsedSeconds)}</span>
            </div>
            <span className="text-zinc-400 text-sm">
              {batch.recipe.ingredients.map((ing) => ing.ingredientName ?? ing.categoryName).join(', ')}
            </span>
          </div>
        </Card>
      ))}
    </div>
  )
}
