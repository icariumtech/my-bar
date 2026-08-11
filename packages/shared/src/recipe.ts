import { z } from 'zod'

// D-19: unit is chosen from a fixed dropdown, never free text — prevents
// the same typo-drift Phase 1's D-01 avoided for categories.
// D-20: quantity is stored and displayed exactly as entered (no unit
// conversion) — the .max(20) bound is a DoS mitigation (T-02-02), not a
// meaningful precision limit.
export const recipeIngredientInput = z.object({
  categoryId: z.string().uuid(),
  quantity: z.string().trim().min(1).max(20),
  unit: z.enum(['oz', 'dash', 'splash', 'barspoon', 'muddled', 'part']),
})
export type RecipeIngredientInput = z.infer<typeof recipeIngredientInput>

// RECIPE-01 empty-input edge case: at least one ingredient line and one
// method step are both required — `.min(1)` rejects an empty recipe with
// 400 before any database write. D-16: method is an ordered array of step
// strings, not a single free-text block. D-17: glasswareId is optional
// ("or none"). D-18: garnish is free text only, never validated against
// categories/ingredients.
export const recipeInput = z.object({
  name: z.string().trim().min(1).max(200),
  ingredients: z.array(recipeIngredientInput).min(1),
  method: z.array(z.string().trim().min(1).max(500)).min(1),
  glasswareId: z.string().uuid().optional(),
  garnish: z.string().trim().max(200).optional(),
})
export type RecipeInput = z.infer<typeof recipeInput>

// Persisted/joined shape of a single recipe ingredient line: adds the row
// id, the joined categoryName (display field, mirrors ingredient.ts's
// categoryName pattern), and displayOrder (D-16 ordering).
export const recipeIngredient = recipeIngredientInput.extend({
  id: z.string().uuid(),
  categoryName: z.string(),
  displayOrder: z.number(),
})
export type RecipeIngredient = z.infer<typeof recipeIngredient>

// Full recipe response. makeable/missingCategoryIds/missingCategoryNames
// are computed exclusively server-side (MATCH-01/MATCH-02) — there is no
// client-writable makeable field anywhere in this contract.
// missingCategoryNames goes beyond 02-RESEARCH.md's sketch so MATCH-02's
// "exactly which ingredients are missing" is satisfiable without the
// frontend cross-referencing two separate lists.
export const recipe = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ingredients: z.array(recipeIngredient),
  method: z.array(z.string()),
  glasswareId: z.string().uuid().nullable(),
  glasswareName: z.string().nullable(),
  garnish: z.string().nullable(),
  makeable: z.boolean(),
  missingCategoryIds: z.array(z.string().uuid()),
  missingCategoryNames: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Recipe = z.infer<typeof recipe>

// D-16: the edit contract, unused until plan 02-02 but defined now so the
// contract exists in one place. Derived from recipeInput (via `.partial()`)
// rather than restated, so the same length bounds carry over automatically.
export const recipePatch = recipeInput
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  })
export type RecipePatch = z.infer<typeof recipePatch>
