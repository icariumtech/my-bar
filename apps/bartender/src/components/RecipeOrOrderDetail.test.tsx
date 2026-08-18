import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Recipe } from '@my-bar/shared'
import { RecipeOrOrderDetail } from './RecipeOrOrderDetail.js'

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
  description: null,
  tags: [],
  overallStatus: 'red',
  missingCategoryIds: ['cccccccc-3333-3333-3333-333333333333'],
  missingCategoryNames: ['Simple Syrup'],
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const GREEN_RECIPE: Recipe = {
  ...FIXTURE_RECIPE,
  overallStatus: 'green',
  ingredients: [],
  missingCategoryIds: [],
  missingCategoryNames: [],
  glasswareId: 'eeeeeeee-1111-1111-1111-111111111111',
  glasswareName: 'Coupe',
  garnish: 'Lime wheel',
}

describe('RecipeOrOrderDetail', () => {
  it('renders the recipe name and the tri-state MakeableStatusBadge', () => {
    render(<RecipeOrOrderDetail recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(screen.getByText('Daiquiri')).toBeInTheDocument()
    expect(screen.getByText('Missing ingredients')).toBeInTheDocument()
  })

  it('shows the red missing-categories sentence when overallStatus is red', () => {
    render(<RecipeOrOrderDetail recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(
      screen.getByText("Can't make this right now. Missing: Simple Syrup."),
    ).toBeInTheDocument()
  })

  it('shows the yellow substitution sentence for every yellow line', () => {
    render(<RecipeOrOrderDetail recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(
      screen.getByText('The Lime Juice you selected is out of stock, but Lemon Juice is available.'),
    ).toBeInTheDocument()
  })

  it('renders every ingredient line quantity/unit/categoryName, using ingredientName when locked', () => {
    render(<RecipeOrOrderDetail recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(screen.getByText('2 oz Rum')).toBeInTheDocument()
    expect(screen.getByText('1 oz Lime Juice')).toBeInTheDocument()
    expect(screen.getByText('0.5 oz Simple Syrup')).toBeInTheDocument()
  })

  it('renders every method step in order', () => {
    render(<RecipeOrOrderDetail recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(screen.getByText('Shake with ice')).toBeInTheDocument()
    expect(screen.getByText('Strain into a coupe')).toBeInTheDocument()
  })

  it('renders "None specified" for a null glassware', () => {
    render(<RecipeOrOrderDetail recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(screen.getByText('None specified')).toBeInTheDocument()
  })

  it('renders the glassware name when non-null', () => {
    render(<RecipeOrOrderDetail recipe={GREEN_RECIPE} onBack={vi.fn()} />)

    expect(screen.getByText('Coupe')).toBeInTheDocument()
  })

  it('omits the garnish section entirely when garnish is null (never "None specified")', () => {
    render(<RecipeOrOrderDetail recipe={FIXTURE_RECIPE} onBack={vi.fn()} />)

    expect(screen.queryByText('Garnish')).not.toBeInTheDocument()
  })

  it('renders the garnish text when non-null', () => {
    render(<RecipeOrOrderDetail recipe={GREEN_RECIPE} onBack={vi.fn()} />)

    expect(screen.getByText('Lime wheel')).toBeInTheDocument()
  })

  it('renders no Done button when no order prop is passed', () => {
    render(<RecipeOrOrderDetail recipe={GREEN_RECIPE} onBack={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
  })

  it('renders a Done button that calls onMarkDone when order.status is "new"', () => {
    const onMarkDone = vi.fn()
    render(
      <RecipeOrOrderDetail
        recipe={GREEN_RECIPE}
        order={{ patronName: 'Alice', status: 'new', elapsedSeconds: 90 }}
        onBack={vi.fn()}
        onMarkDone={onMarkDone}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onMarkDone).toHaveBeenCalledTimes(1)
  })

  it('renders a Done button when order.status is "in_progress"', () => {
    render(
      <RecipeOrOrderDetail
        recipe={GREEN_RECIPE}
        order={{ patronName: null, status: 'in_progress', elapsedSeconds: 30 }}
        onBack={vi.fn()}
        onMarkDone={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('renders no Done button when order.status is "done"', () => {
    render(
      <RecipeOrOrderDetail
        recipe={GREEN_RECIPE}
        order={{ patronName: 'Alice', status: 'done', elapsedSeconds: 200 }}
        onBack={vi.fn()}
        onMarkDone={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
  })

  it('renders "Ordered {elapsed} ago" when order is passed with no patronName', () => {
    render(
      <RecipeOrOrderDetail
        recipe={GREEN_RECIPE}
        order={{ patronName: null, status: 'new', elapsedSeconds: 90 }}
        onBack={vi.fn()}
        onMarkDone={vi.fn()}
      />,
    )

    expect(screen.getByText('Ordered 1m ago')).toBeInTheDocument()
  })

  it('renders "Ordered {elapsed} ago for {patronName}" when patronName is non-null', () => {
    render(
      <RecipeOrOrderDetail
        recipe={GREEN_RECIPE}
        order={{ patronName: 'Alice', status: 'new', elapsedSeconds: 90 }}
        onBack={vi.fn()}
        onMarkDone={vi.fn()}
      />,
    )

    expect(screen.getByText('Ordered 1m ago for Alice')).toBeInTheDocument()
  })
})
