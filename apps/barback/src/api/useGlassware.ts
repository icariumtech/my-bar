import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Glassware, GlasswareInput } from '@my-bar/shared'
import { apiFetch } from './client.js'

// Surfaces the server's 409 body — specifically `recipeCount` — rather than
// collapsing an in-use delete refusal into a generic Error, since
// GlasswareManager needs the real count to render the Copywriting
// Contract's exact refusal message (D-22).
export class DeleteGlasswareError extends Error {
  recipeCount?: number

  constructor(message: string, recipeCount?: number) {
    super(message)
    this.name = 'DeleteGlasswareError'
    this.recipeCount = recipeCount
  }
}

export function useGlassware() {
  return useQuery({
    queryKey: ['glassware'],
    queryFn: () => apiFetch<Glassware[]>('/glassware'),
  })
}

export function useCreateGlassware() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: GlasswareInput) =>
      apiFetch<Glassware>('/glassware', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    // Invalidate in onSettled, not onSuccess — the list must resync to
    // server truth on failure too, or the inventory stops being
    // trustworthy (01-RESEARCH.md Pitfall 4).
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['glassware'] })
    },
  })
}

// D-17: rename. Invalidates BOTH ['glassware'] and ['recipes'] — a rename
// changes the glasswareName label joined onto every recipe response, and
// invalidating only ['glassware'] would leave the recipes list showing the
// stale label until something else forced a refetch. Mirrors
// useRenameCategory's identical ['categories']/['ingredients'] dual
// invalidation for the same reason.
export function useUpdateGlassware() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: GlasswareInput }) =>
      apiFetch<Glassware>(`/glassware/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['glassware'] })
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

// D-22: refuse-only delete. Does not use the shared apiFetch() wrapper —
// that helper only throws a generic Error with no access to the response
// body, but the caller here needs the 409's `recipeCount` to build its
// refusal message, so this mutationFn reads the body itself.
export function useDeleteGlassware() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/glassware/${id}`, { method: 'DELETE' })

      if (res.status === 204) {
        return
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        recipeCount?: number
      }
      throw new DeleteGlasswareError(
        body.error ?? `Request to /glassware/${id} failed: ${res.status} ${res.statusText}`,
        body.recipeCount,
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['glassware'] })
    },
  })
}
