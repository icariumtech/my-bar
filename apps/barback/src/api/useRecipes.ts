import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Recipe, RecipeInput, RecipePatch } from '@my-bar/shared'
import { apiFetch } from './client.js'

// Surfaces the server's error body rather than collapsing a delete failure
// into a generic Error — mirrors DeleteCategoryError/DeleteGlasswareError,
// though recipes have no in-use guard (deleting a recipe never blocks on
// another entity referencing it).
export class DeleteRecipeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DeleteRecipeError'
  }
}

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<Recipe[]>('/recipes'),
  })
}

// Defined now (ahead of 02-06's RecipeForm) so the hook contract exists in
// one place per Interface-First ordering — RecipeForm will consume this
// directly once it lands.
export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RecipeInput) =>
      apiFetch<Recipe>('/recipes', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    // Invalidate in onSettled, not onSuccess — the list must resync to
    // server truth on failure too (01-RESEARCH.md Pitfall 4).
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RecipePatch }) =>
      apiFetch<Recipe>(`/recipes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

// Does not use the shared apiFetch() wrapper — mirrors useDeleteCategory's
// body-reading pattern so a non-204 failure surfaces the server's `error`
// message via DeleteRecipeError instead of apiFetch's generic Error.
export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' })

      if (res.status === 204) {
        return
      }

      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new DeleteRecipeError(
        body.error ?? `Request to /recipes/${id} failed: ${res.status} ${res.statusText}`,
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}
