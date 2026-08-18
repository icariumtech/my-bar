import { z } from 'zod'
import { recipe } from './recipe.js'

// D-54: order record is minimal — recipeId + optional free-text patronName.
// No device/session identifier of any kind (matches the no-auth constraint —
// there's one Patron kiosk). `.max(100)` DoS-mitigation bound mirrors
// recipeInput.garnish's own convention.
export const orderInput = z.object({
  recipeId: z.string().uuid(),
  patronName: z.string().trim().max(100).optional(),
})
export type OrderInput = z.infer<typeof orderInput>

// D-57: new -> in_progress -> done lifecycle vocabulary — single source of
// truth so the server and every frontend consumer (Bartender, later
// Patron if ever needed) share the exact same three string values.
export const orderStatus = z.enum(['new', 'in_progress', 'done'])
export type OrderStatus = z.infer<typeof orderStatus>

// Full order response. Embeds the FULL joined Recipe object (never just an
// id/name) because the Bartender shared detail view needs full
// ingredient/method/glassware/tag data when a user taps into an order.
// elapsedSeconds is computed server-side (BART-04), floor-based.
export const order = z.object({
  id: z.string().uuid(),
  recipe,
  patronName: z.string().nullable(),
  status: orderStatus,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  elapsedSeconds: z.number().int().nonnegative(),
})
export type Order = z.infer<typeof order>
