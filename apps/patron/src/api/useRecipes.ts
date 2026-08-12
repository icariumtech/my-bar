import { useQuery } from '@tanstack/react-query'
import type { Recipe } from '@my-bar/shared'
import { apiFetch } from './client.js'

// staleTime: Infinity is deliberate — Patron trusts Socket.IO's future
// invalidation signal (plan 03-05), never time-based refetching, so a
// card's makeable status never silently flips on a background poll
// interval unrelated to a real inventory change.
export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<Recipe[]>('/recipes'),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
  })
}
