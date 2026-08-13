import { useQuery } from '@tanstack/react-query'
import type { Recipe } from '@my-bar/shared'
import { apiFetch } from './client.js'

// A deliberately SEPARATE query key from useRecipes()'s ['recipes'] list
// key — TanStack Query's default invalidation matches by key-array prefix,
// so invalidating ['recipes'] (03-05's Socket.IO handler) also matches
// this ['recipes', recipeId] key and refreshes an open detail view (D-47).
// staleTime/gcTime mirror useRecipes() for the same reason: trust the
// socket invalidation signal, never a time-based refetch.
export function useRecipeDetail(recipeId: string) {
  return useQuery({
    queryKey: ['recipes', recipeId],
    queryFn: () => apiFetch<Recipe>(`/recipes/${recipeId}`),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
  })
}
