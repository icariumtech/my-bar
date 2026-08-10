import { z } from 'zod'

// D-01: category names are unique — the curated taxonomy Phase 2's makeable
// matching depends on cannot silently typo-drift.
export const categoryInput = z.object({
  name: z.string().trim().min(1).max(60),
})
export type CategoryInput = z.infer<typeof categoryInput>

export const category = categoryInput.extend({
  id: z.string().uuid(),
})
export type Category = z.infer<typeof category>
