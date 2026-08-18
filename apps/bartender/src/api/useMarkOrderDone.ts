import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Order } from '@my-bar/shared'
import { apiFetch } from './client.js'

// D-58: one Done tap clears every individual order in the tapped batch —
// OrdersTab.tsx calls mutate() once per orderId in viewingBatch.orderIds.
// onSettled (not onSuccess) mirrors useOpenOrder.ts's own convention so the
// list re-syncs to server truth even if one of the batch's N calls fails.
export function useMarkOrderDone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) =>
      apiFetch<Order>(`/orders/${orderId}/done`, {
        method: 'PATCH',
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
