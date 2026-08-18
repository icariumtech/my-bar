import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core'

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
// D-40: description is free text, nullable, optional — no validation
// against categories/ingredients, mirrors garnish's own precedent.
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  method: text('method').notNull(),
  glasswareId: text('glassware_id').references(() => glassware.id, { onDelete: 'set null' }),
  garnish: text('garnish'),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})

// MATCH-03: a recipe ingredient line references a category, never a
// specific bottle by default — matching is category-based unless locked to
// a specific ingredient (D-30/D-31, below). D-21: categoryId
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
  // D-31/MATCH-05: nullable FK to a specific ingredient — NULL means this
  // line is a plain category match (Phase 2 behavior unchanged). onDelete
  // 'set null' (never 'cascade'/'restrict') so deleting the locked
  // ingredient degrades the line to category-only instead of orphaning the
  // recipe or blocking the ingredient delete.
  ingredientId: text('ingredient_id').references(() => ingredients.id, { onDelete: 'set null' }),
  // D-30: whether this line is locked to the specific ingredient above
  // (ignored when ingredientId is NULL). Defaults true — new
  // specific-ingredient selections are non-substitutable by default.
  requiresSpecific: integer('requires_specific', { mode: 'boolean' }).notNull().default(true),
})

// D-33/D-34: fixed tag taxonomy — four groups (spirit/type/season/flavor).
// unique(group, name) mirrors categories.name's typo-drift protection,
// scoped per-group so tags in different groups could share a name (D-34's
// actual list has no cross-group collisions, but the constraint doesn't
// assume that).
export const tags = sqliteTable(
  'tags',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    group: text('group', { enum: ['spirit', 'type', 'season', 'flavor'] }).notNull(),
  },
  (table) => [unique().on(table.group, table.name)],
)

// Recipe <-> Tag many-to-many (D-33). recipeId cascades (deleting a recipe
// cleans up its tag links, mirrors recipeIngredients); tagId restricts (a
// tag in use can never be silently deleted out from under a recipe — no
// tag-delete endpoint exists this phase per D-35, so this is a defensive
// schema-level guard only).
export const recipeTags = sqliteTable(
  'recipe_tags',
  {
    id: text('id').primaryKey(),
    recipeId: text('recipe_id')
      .notNull()
      .references(() => recipes.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'restrict' }),
  },
  (table) => [unique().on(table.recipeId, table.tagId)],
)

// D-54: order record is minimal — recipe reference + optional free-text
// name + status + timestamps. No device/session identifier of any kind.
// recipeId restricts (mirrors recipeIngredients.categoryId's existing
// restrict convention) so a recipe with pending orders can never be
// deleted out from under them. patronName is nullable (D-50: blank
// allowed). status defaults to 'new' (D-57's lifecycle start state).
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'restrict' }),
  patronName: text('patron_name'),
  status: text('status', { enum: ['new', 'in_progress', 'done'] })
    .notNull()
    .default('new'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
})
