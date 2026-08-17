import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import type { Ingredient, IngredientInput, IngredientPatch } from '@my-bar/shared'
import { apiFetch } from './client.js'

// Surfaces the server's error body rather than collapsing a delete failure
// into a generic Error — mirrors useRecipes.ts's DeleteRecipeError.
export class DeleteIngredientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeleteIngredientError'
  }
}

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

// INV-02: the owner-edit mutation. Invalidates ['ingredients'],
// ['categories'], AND ['recipes'] in onSettled — a rename elsewhere in the
// app changes a category's own row too, this mutation can itself move an
// ingredient between categories, and every recipe's makeable/
// missingCategoryNames fields are derived from live ingredient stock
// server-side, so a name/category change on an ingredient can change
// whether recipes referencing it are makeable. Invalidating only
// ['ingredients']/['categories'] would leave the recipes list/detail
// showing stale makeable status until something else forced a refetch
// (G-02-9). All three must resync to server truth either way (never
// onSuccess-only, 01-RESEARCH.md Pitfall 4).
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
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

// INV-03/D-08: fired only after IngredientRow's undo grace timer elapses —
// never called directly from a swipe event. No hand-rolled rollback here:
// a failure shows the Copywriting Contract's error toast and the onSettled
// invalidation below restores the real server value on refetch.
// Invalidates BOTH ['ingredients'] and ['recipes'] — a stock toggle changes
// whether recipes referencing this ingredient's category are makeable, and
// every recipe's makeable/missingCategoryNames fields are derived from live
// ingredient stock server-side. Invalidating only ['ingredients'] would
// leave the recipes list/detail showing stale makeable status until a
// manual reload (G-02-9). Mirrors useUpdateGlassware/useRenameCategory's
// established cross-entity-invalidation pattern.
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
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

// Removes a bottle from inventory (mirrors useRecipes.ts's useDeleteRecipe
// shape exactly). Does not use the shared apiFetch() wrapper — calls
// fetch() directly so a non-204 failure body's `error` field can be read
// and thrown as a named DeleteIngredientError instead of apiFetch's generic
// Error. Invalidates BOTH ['ingredients'] and ['recipes'] on settle — a
// deleted ingredient can change a recipe's makeable/requiresSpecific
// display server-side (mirrors useUpdateIngredient/useToggleStock's
// cross-entity-invalidation precedent above).
export function useDeleteIngredient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ingredients/${id}`, { method: 'DELETE' })

      if (res.status === 204) {
        return
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new DeleteIngredientError(
        body.error ?? `Request to /ingredients/${id} failed: ${res.status} ${res.statusText}`,
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
