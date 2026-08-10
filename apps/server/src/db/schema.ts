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
