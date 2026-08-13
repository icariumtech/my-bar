import { z } from 'zod'

// D-33/D-34: fixed tag taxonomy — four groups. A Zod string-enum (not a
// TypeScript `enum` keyword) — matches makeable.ts's established
// convention, not RESEARCH.md's stale sketch.
export const tagGroup = z.enum(['spirit', 'type', 'season', 'flavor'])
export type TagGroup = z.infer<typeof tagGroup>

// The single canonical sequence every later consumer (this route's sort,
// the Patron rail's group order, Barback's TagPicker group order) reads
// from, so the four groups' display order can never drift between the
// three surfaces.
export const TAG_GROUP_ORDER: readonly TagGroup[] = ['spirit', 'type', 'season', 'flavor'] as const

export const tag = z.object({
  id: z.string().uuid(),
  name: z.string(),
  group: tagGroup,
})
export type Tag = z.infer<typeof tag>
