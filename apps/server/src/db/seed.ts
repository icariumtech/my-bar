import { eq } from 'drizzle-orm'
import { db } from './client.js'
import { categories, ingredients } from './schema.js'

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

  console.log('Seed complete.')
}

seed()
