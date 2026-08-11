import { z } from 'zod'

// D-17: glassware names are unique — the same typo-drift risk D-01 already
// ruled out for categories applies to this curated list too.
export const glasswareInput = z.object({
  name: z.string().trim().min(1).max(60),
})
export type GlasswareInput = z.infer<typeof glasswareInput>

export const glassware = glasswareInput.extend({
  id: z.string().uuid(),
})
export type Glassware = z.infer<typeof glassware>
