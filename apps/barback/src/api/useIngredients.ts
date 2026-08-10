import { useQuery } from '@tanstack/react-query'
import type { Ingredient } from '@my-bar/shared'
import { apiFetch } from './client.js'

export function useIngredients() {
  return useQuery({
    queryKey: ['ingredients'],
    queryFn: () => apiFetch<Ingredient[]>('/ingredients'),
  })
}
