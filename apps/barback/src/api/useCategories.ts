import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Category, CategoryInput } from '@my-bar/shared'
import { apiFetch } from './client.js'

// Surfaces the server's 409 body — specifically `ingredientCount` — rather
// than collapsing an in-use delete refusal into a generic Error, since
// CategoryManager needs the real count to render the Copywriting
// Contract's exact refusal message.
export class DeleteCategoryError extends Error {
  ingredientCount?: number

  constructor(message: string, ingredientCount?: number) {
    super(message)
    this.name = 'DeleteCategoryError'
    this.ingredientCount = ingredientCount
  }
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<Category[]>('/categories'),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CategoryInput) =>
      apiFetch<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    // Invalidate in onSettled, not onSuccess — the list must resync to
    // server truth on failure too, or the inventory stops being
    // trustworthy (01-RESEARCH.md Pitfall 4).
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// D-03: rename. Invalidates BOTH ['categories'] and ['ingredients'] — a
// rename changes the categoryName label rendered on every ingredient row,
// and invalidating only ['categories'] would leave the list showing the
// stale label until something else forced a refetch.
export function useRenameCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      apiFetch<Category>(`/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
    },
  })
}

// D-03: refuse-only delete. Does not use the shared apiFetch() wrapper —
// that helper only throws a generic Error with no access to the response
// body, but the caller here needs the 409's `ingredientCount` to build its
// refusal message, so this mutationFn reads the body itself.
export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })

      if (res.status === 204) {
        return
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        ingredientCount?: number
      }
      throw new DeleteCategoryError(
        body.error ?? `Request to /categories/${id} failed: ${res.status} ${res.statusText}`,
        body.ingredientCount,
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}
