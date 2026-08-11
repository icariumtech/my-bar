import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// D-01: category names are unique so the curated taxonomy that Phase 2's
// makeable matching depends on cannot silently typo-drift.
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
})

// D-01/D-03: a category still referenced by an ingredient must not be
// deletable — onDelete 'restrict' makes the database, not application code,
// enforce that invariant. D-02: categoryId is notNull — every ingredient
// always has exactly one category. D-09: inStock defaults to true.
export const ingredients = sqliteTable('ingredients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  note: text('note'),
  inStock: integer('in_stock', { mode: 'boolean' }).notNull().default(true),
})

// D-17: glassware is a curated, owner-managed list mirroring `categories`
// exactly — unique name, no delete unless unreferenced (guard lives at the
// route level in a later plan; the FK below is the DB-level safety net).
export const glassware = sqliteTable('glassware', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
})

// D-16: method is stored as a JSON-stringified array of step strings, not a
// single free-text block, so order is explicit and machine-parseable.
// D-17: glasswareId is nullable ("or none") — onDelete 'set null' is the
// DB-level safety net; the real UX block on deleting in-use glassware is a
// route-level guard (D-22, a later plan). D-18: garnish is free text and
// nullable, never validated against categories/ingredients.
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  method: text('method').notNull(),
  glasswareId: text('glassware_id').references(() => glassware.id, { onDelete: 'set null' }),
  garnish: text('garnish'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// MATCH-03: a recipe ingredient line references a category, never a
// specific bottle — matching is category-based. D-21: categoryId
// restrict-deletes as the DB-level safety net for the route-level delete
// guard added in a later plan. quantity/unit (D-19/D-20) are stored exactly
// as submitted and are never read by computeMakeable (MATCH-04) — the
// makeable check is presence-based only. displayOrder preserves the
// submitted ingredient-line order (D-16).
export const recipeIngredients = sqliteTable('recipe_ingredients', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id, { onDelete: 'restrict' }),
  quantity: text('quantity').notNull(),
  unit: text('unit').notNull(),
  displayOrder: integer('display_order').notNull(),
})
