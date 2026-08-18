import { useQuery } from '@tanstack/react-query'
import type { Order } from '@my-bar/shared'
import { apiFetch } from './client.js'

// staleTime: 0 (unlike Patron/Barback's Infinity) — the Orders queue
// changes rapidly and Socket.IO invalidation should always trigger a
// genuine refetch, never serve a stale cached page.
export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => apiFetch<Order[]>('/orders'),
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
  })
}
