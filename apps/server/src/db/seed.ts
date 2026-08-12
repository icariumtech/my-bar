import { and, eq } from 'drizzle-orm'
import { db } from './client.js'
import { categories, ingredients, tags } from './schema.js'
import type { TagGroup } from '@my-bar/shared'

// D-33/D-34: the fixed, predefined tag taxonomy — four groups, 24 total
// entries. Idempotent (checked existence before insert, same pattern as
// the category/ingredient seed below) so re-running db:seed never creates
// duplicate rows.
const TAG_TAXONOMY: Array<{ name: string; group: TagGroup }> = [
  { name: 'Whiskey', group: 'spirit' },
  { name: 'Gin', group: 'spirit' },
  { name: 'Rum', group: 'spirit' },
  { name: 'Vodka', group: 'spirit' },
  { name: 'Tequila', group: 'spirit' },
  { name: 'Brandy', group: 'spirit' },
  { name: 'Mezcal', group: 'spirit' },
  { name: 'Liqueur-forward', group: 'spirit' },
  { name: 'Classics', group: 'type' },
  { name: 'Modern', group: 'type' },
  { name: 'Tiki', group: 'type' },
  { name: 'Spritz', group: 'type' },
  { name: 'Shots', group: 'type' },
  { name: 'Mocktail', group: 'type' },
  { name: 'Summer', group: 'season' },
  { name: 'Fall/Winter', group: 'season' },
  { name: 'Spring', group: 'season' },
  { name: 'Year-round', group: 'season' },
  { name: 'Sweet', group: 'flavor' },
  { name: 'Sour/Citrus', group: 'flavor' },
  { name: 'Bitter', group: 'flavor' },
  { name: 'Refreshing', group: 'flavor' },
  { name: 'Spicy', group: 'flavor' },
  { name: 'Boozy/Strong', group: 'flavor' },
]

// Idempotent: the owner's own example from CONTEXT.md — one category and
// one ingredient in it. Safe to run repeatedly (db:push then db:seed).
function seed() {
  const categoryName = 'Dry Gin'
  const ingredientName = 'Bombay Sapphire Gin'

  let category = db.select().from(categories).where(eq(categories.name, categoryName)).get()
  if (!category) {
    category = {
      id: crypto.randomUUID(),
      name: categoryName,
    }
    db.insert(categories).values(category).run()
    console.log(`Seeded category: ${categoryName}`)
  }

  const existingIngredient = db
    .select()
    .from(ingredients)
    .where(eq(ingredients.name, ingredientName))
    .get()

  if (!existingIngredient) {
    db.insert(ingredients)
      .values({
        id: crypto.randomUUID(),
        name: ingredientName,
        categoryId: category.id,
        note: null,
        inStock: true,
      })
      .run()
    console.log(`Seeded ingredient: ${ingredientName}`)
  }

  let seededTagCount = 0
  for (const { name, group } of TAG_TAXONOMY) {
    const existingTag = db
      .select()
      .from(tags)
      .where(and(eq(tags.group, group), eq(tags.name, name)))
      .get()
    if (!existingTag) {
      db.insert(tags).values({ id: crypto.randomUUID(), name, group }).run()
      seededTagCount += 1
    }
  }
  if (seededTagCount > 0) {
    console.log(`Seeded ${seededTagCount} tag(s)`)
  }

  console.log('Seed complete.')
}

seed()
