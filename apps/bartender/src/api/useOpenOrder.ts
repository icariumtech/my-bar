import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Order } from '@my-bar/shared'
import { apiFetch } from './client.js'

// D-57: opening a 'new' batch auto-advances every order in it to
// 'in_progress' in one action (OrdersTab.tsx's openBatch). onSettled (not
// onSuccess) matches this codebase's established invalidate-on-settle
// convention (apps/barback/src/api/useIngredients.ts) so the Orders list
// re-syncs to server truth even if one call in a batch fails.
export function useOpenOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) =>
      apiFetch<Order>(`/orders/${orderId}/start`, {
        method: 'PATCH',
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
