import { useQuery } from '@tanstack/react-query'
import type { Tag } from '@my-bar/shared'
import { apiFetch } from './client.js'

// Read-only, mirrors apps/barback/src/api/useTags.ts exactly — no
// tag-CRUD UI exists on Bartender (read-only lookup surface, D-62).
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch<Tag[]>('/tags'),
  })
}
