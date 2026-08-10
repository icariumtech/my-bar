import { z } from 'zod'

// D-05: one free-text field holds the whole product title (e.g. "Bombay
// Sapphire Gin") — there is no separate brand field. D-04: a row is a
// specific bottle, not a generic ingredient type.
// D-02: exactly one category per ingredient — categoryId is required.
// D-06: an optional free-text size/note field, nothing reads it yet.
//
// The .max() bounds below are load-bearing security controls (mitigation
// for threat T-01-02, DoS via unbounded input), not cosmetic limits.
export const ingredientInput = z.object({
  name: z.string().trim().min(1).max(200),
  categoryId: z.string().uuid(),
  note: z.string().max(200).optional(),
})
export type IngredientInput = z.infer<typeof ingredientInput>

// Persisted/API shape: includes the joined category name and computed
// in-stock status. D-07 explicitly defers taste/descriptive profile data
// to a later phase — no such field belongs here.
export const ingredient = z.object({
  id: z.string().uuid(),
  name: z.string(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  note: z.string().nullable(),
  inStock: z.boolean(),
})
export type Ingredient = z.infer<typeof ingredient>

// The swipe-toggle contract (INV-03, D-08). Deliberately its own schema
// rather than a partial of ingredientInput: stock is the one field a swipe
// may change, so a narrow contract means a malformed or over-broad toggle
// request cannot rename a bottle or move it between categories (T-01-12).
export const stockPatch = z.object({
  inStock: z.boolean(),
})
export type StockPatch = z.infer<typeof stockPatch>
