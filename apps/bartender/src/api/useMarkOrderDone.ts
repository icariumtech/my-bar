import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Order } from '@my-bar/shared'
import { apiFetch } from './client.js'

// D-58: one Done tap clears every individual order in the tapped batch —
// OrdersTab.tsx calls mutate() once per orderId in viewingBatch.orderIds,
// then navigates back to the list in the SAME tick (before any of those
// PATCH calls can possibly resolve). Both the list's visibleBatches filter
// and App.tsx's openOrderCount badge read the same ['orders'] cache, so
// without an optimistic update here, they'd stay showing the pre-Done
// state until a full PATCH+invalidate+refetch round trip completes — fine
// on localhost (~10-20ms, imperceptible) but this app's real target
// (Raspberry Pi server over home WiFi to kiosk iPads/phones) can add
// hundreds of ms to seconds of latency, during which "Done" would read as
// having done nothing (bartender-done-list-not-clearing). onMutate
// synchronously flips the target order to 'done' in the cache so the UI is
// correct on the very next render regardless of network speed; onError
// rolls back to the pre-mutation snapshot if the PATCH actually fails;
// onSettled (unchanged) still invalidates to reconcile with server truth
// even if one of a batch's N calls fails, matching useOpenOrder.ts's own
// established convention.
export function useMarkOrderDone() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (orderId: string) =>
      apiFetch<Order>(`/orders/${orderId}/done`, {
        method: 'PATCH',
      }),
    onMutate: async (orderId: string) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] })
      const previousOrders = queryClient.getQueryData<Order[]>(['orders'])
      queryClient.setQueryData<Order[]>(['orders'], (orders) =>
        orders?.map((o) => (o.id === orderId ? { ...o, status: 'done' } : o)),
      )
      return { previousOrders }
    },
    onError: (_err, _orderId, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders'], context.previousOrders)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
