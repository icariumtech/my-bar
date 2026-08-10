import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import type { Ingredient, IngredientInput } from '@my-bar/shared'
import { apiFetch } from './client.js'

export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiFetch<Ingredient[]>('/ingredients'),
  })
}

export function useCreateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: IngredientInput) =>
      apiFetch<Ingredient>('/ingredients', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    // Invalidate in onSettled, not onSuccess — the list must resync to
    // server truth on failure too, or the inventory stops being
    // trustworthy (01-RESEARCH.md Pitfall 4).
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}

// INV-03/D-08: fired only after IngredientRow's undo grace timer elapses —
// never called directly from a swipe event. No hand-rolled rollback here:
// a failure shows the Copywriting Contract's error toast and the onSettled
// invalidation below restores the real server value on refetch.
export function useToggleStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, inStock }: { id: string; inStock: boolean }) =>
      apiFetch<Ingredient>(`/ingredients/${id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify({ inStock }),
      }),
    onError: () => {
      message.error("Couldn't update stock — try again.")
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}
