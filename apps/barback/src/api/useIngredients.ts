import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import type { Ingredient, IngredientInput, IngredientPatch } from '@my-bar/shared'
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

// INV-02: the owner-edit mutation. Invalidates BOTH ['ingredients'] and
// ['categories'] in onSettled — a rename elsewhere in the app changes a
// category's own row too, and this mutation can itself move an ingredient
// between categories, so both caches must resync to server truth either
// way (never onSuccess-only, 01-RESEARCH.md Pitfall 4).
export function useUpdateIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: IngredientPatch }) =>
      apiFetch<Ingredient>(`/ingredients/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
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
