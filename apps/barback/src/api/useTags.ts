import { useQuery } from '@tanstack/react-query'
import type { Tag } from '@my-bar/shared'
import { apiFetch } from './client.js'

// Read-only — D-35 gives Barback no tag-CRUD UI this phase, so unlike
// useCategories()/useGlassware() there is no create/rename/delete
// mutation exported here. Mirrors useCategories()'s exact shape
// otherwise.
export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch<Tag[]>('/tags'),
  })
}
