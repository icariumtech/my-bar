import { useQuery } from '@tanstack/react-query'
import type { Recipe } from '@my-bar/shared'
import { apiFetch } from './client.js'

// staleTime: Infinity — mirrors apps/patron/src/api/useRecipes.ts. Bartender
// trusts the same Socket.IO invalidation pattern Patron already proves, once
// a future plan wires recipe/inventory socket handlers into this app's
// socket.ts (out of THIS plan's scope — 04-01's socket.ts only listens for
// orders:* events). Until then, the makeable status shown is always correct
// on fetch, just not push-updated the instant an ingredient toggles
// (BART-06 only requires the display to be correct, not full live sync).
export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: () => apiFetch<Recipe[]>('/recipes'),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
  })
}
