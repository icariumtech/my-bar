import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Recipe } from '@my-bar/shared'
import { RecipeDetailView } from './RecipeDetailView.js'

const FIXTURE_RECIPE: Recipe = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Daiquiri',
  ingredients: [
    {
      id: 'aaaaaaaa-1111-1111-1111-111111111111',
      categoryId: 'cccccccc-1111-1111-1111-111111111111',
      ingredientId: null,
      requiresSpecific: false,
      quantity: '2',
      unit: 'oz',
      categoryName: 'Rum',
      ingredientName: null,
      displayOrder: 0,
      status: 'green',
      alternativeIngredientName: null,
    },
    {
      id: 'aaaaaaaa-2222-2222-2222-222222222222',
      categoryId: 'cccccccc-2222-2222-2222-222222222222',
      ingredientId: 'dddddddd-2222-2222-2222-222222222222',
      requiresSpecific: true,
      quantity: '1',
      unit: 'oz',
      categoryName: 'Juice',
      ingredientName: 'Lime Juice',
      displayOrder: 1,
      status: 'yellow',
      alternativeIngredientName: 'Lemon Juice',
    },
    {
      id: 'aaaaaaaa-3333-3333-3333-333333333333',
      categoryId: 'cccccccc-3333-3333-3333-333333333333',
      ingredientId: null,
      requiresSpecific: false,
      quantity: '0.5',
      unit: 'oz',
      categoryName: 'Simple Syrup',
      ingredientName: null,
      displayOrder: 2,
      status: 'red',
      alternativeIngredientName: null,
    },
  ],
  method: ['Shake with ice', 'Strain into a coupe'],
  glasswareId: null,
  glasswareName: null,
  garnish: null,
  overallStatus: 'red',
  missingCategoryIds: ['cccccccc-3333-3333-3333-333333333333'],
  missingCategoryNames: ['Simple Syrup'],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('RecipeDetailView', () => {
  it('renders no role="dialog" element and does render a "← Back" button (D-26: not Modal-wrapped)', () => {
    render(<RecipeDetailView recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back/ })).toBeInTheDocument()
  })

  it('clicking "← Back" calls onBack', () => {
    const onBack = vi.fn()
    render(<RecipeDetailView recipe={FIXTURE_RECIPE} onBack={onBack} />)

    fireEvent.click(screen.getByRole('button', { name: /Back/ }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows the exact red missing-categories sentence, listing only red lines\' categories', () => {
    render(<RecipeDetailView recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(
      screen.getByText("Can't make this right now. Missing: Simple Syrup."),
    ).toBeInTheDocument()
  })

  it('shows the exact yellow hint sentence naming both the selected and alternative ingredient', () => {
    render(<RecipeDetailView recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(
      screen.getByText('The Lime Juice you selected is out of stock, but Lemon Juice is available.'),
    ).toBeInTheDocument()
  })

  it('renders a per-line status indicator dot for every ingredient line', () => {
    render(<RecipeDetailView recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(screen.getByLabelText('green status')).toBeInTheDocument()
    expect(screen.getByLabelText('yellow status')).toBeInTheDocument()
    expect(screen.getByLabelText('red status')).toBeInTheDocument()
  })
})
