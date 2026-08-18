import { useMutation } from '@tanstack/react-query'
import type { Order } from '@my-bar/shared'
import { apiFetch } from './client.js'

// D-61: no onSettled cache invalidation — Patron never displays or tracks
// order status (SYNC-02 is satisfied by the submission-side and
// Bartender-side sync this plan builds, never a patron-facing tracker), so
// there is nothing to invalidate here.
export function useSubmitOrder() {
  return useMutation({
    mutationFn: (input: { recipeId: string; patronName?: string }) =>
      apiFetch<Order>('/orders', { method: 'POST', body: JSON.stringify(input) }),
  })
}
