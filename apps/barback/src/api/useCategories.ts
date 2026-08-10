import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Category, CategoryInput } from '@my-bar/shared'
import { apiFetch } from './client.js'

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
